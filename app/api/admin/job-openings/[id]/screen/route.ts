import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

function verifyToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  try {
    return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET!)
  } catch { return null }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: jobId } = await params
  const body = await req.json().catch(() => ({}))
  const topN: number = body.topN && body.topN > 0 ? parseInt(body.topN) : 0

  // 1. Fetch the job opening
  const { data: job, error: jobError } = await supabaseAdmin
    .from('job_openings')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // 2. Fetch all applicants
  const { data: applicants, error: appError } = await supabaseAdmin
    .from('applicants')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 })
  if (!applicants || applicants.length === 0) return NextResponse.json({ rankedApplicants: [] })

  // Check we have enough CVs
  if (topN > 0 && applicants.length < topN) {
    return NextResponse.json(
      { error: `Not enough CVs. You requested top ${topN} but only ${applicants.length} CV${applicants.length !== 1 ? 's' : ''} exist in the system.` },
      { status: 400 }
    )
  }

  // 3. Build a concise summary of each applicant for the AI
  const applicantSummaries = applicants.map((a: any) => {
    const ed = a.extracted_data || {}
    const ks = a.key_skills || {}
    const techStack = (a.technology_highlights || [])
      .filter((t: any) => t.tech)
      .map((t: any) => `${t.tech}(${t.years || 0}y)`)
      .join(', ')
    const langStr = Array.isArray(ks.languages)
      ? ks.languages.map((l: any) => `${l.language}(${l.proficiency || ''})`).join(', ')
      : (ks.languages || '')
    const skills = [...(ed.skills || []), ...(ks.frameworks ? [ks.frameworks] : []), ...(ks.databases ? [ks.databases] : [])].join(', ')

    return {
      id: a.id,
      name: a.full_name,
      summary: [
        `Experience: ${a.experience_years || 0}y ${a.experience_months || 0}m`,
        `Role: ${a.desired_role || 'N/A'}`,
        `Degree: ${ed.degree_level || 'N/A'}${ed.field_of_study ? ' in ' + ed.field_of_study : ''}`,
        `Location: ${ed.location || 'N/A'}`,
        `Tech: ${techStack || 'N/A'}`,
        `Skills: ${skills || 'N/A'}`,
        `Languages: ${langStr || 'N/A'}`,
        `Methodologies: ${(ed.methodologies || []).join(', ') || 'N/A'}`,
        `Domain: ${a.domain_experience || 'N/A'}`,
      ].join(' | ')
    }
  })

  // 4. Build the AI prompt
  const jobContext = [
    `Job Title: ${job.title}`,
    job.department ? `Department: ${job.department}` : '',
    job.employment_type ? `Type: ${job.employment_type}` : '',
    job.min_experience_years ? `Min Experience: ${job.min_experience_years} years` : '',
    job.tech_stack?.length ? `Required Tech Stack: ${job.tech_stack.join(', ')}` : '',
    job.required_methodologies?.length ? `Methodologies: ${job.required_methodologies.join(', ')}` : '',
    job.degree_required ? `Degree Required: ${job.degree_required}` : '',
    job.job_description ? `Description: ${job.job_description}` : '',
    job.responsibilities ? `Responsibilities: ${job.responsibilities}` : '',
    job.nice_to_have ? `Nice to have: ${job.nice_to_have}` : '',
  ].filter(Boolean).join('\n')

  const prompt = `You are an expert HR recruiter. Score each candidate for the following job opening.

JOB OPENING:
${jobContext}

CANDIDATES (${applicantSummaries.length} total):
${applicantSummaries.map((a, i) => `${i + 1}. ID:${a.id} | ${a.name}\n   ${a.summary}`).join('\n\n')}

TASK:
Score each candidate from 0-100 based on how well they match the job requirements.
Consider: technical skills match, experience level, relevant domain, methodologies, education.
Be strict - a score of 80+ means genuinely strong match.

Respond ONLY with a valid JSON array. No explanation. No markdown. No extra text. Just the JSON.
Format: [{"id":"<uuid>","score":<number>},...]
Sort by score descending.`

  // 5. Call Groq
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!groqRes.ok) {
    const err = await groqRes.text()
    console.error('Groq error:', err)
    return NextResponse.json({ error: 'AI screening failed' }, { status: 500 })
  }

  const groqData = await groqRes.json()
  const raw = groqData.choices?.[0]?.message?.content || '[]'

  // 6. Parse and merge scores back into applicant objects
  let scores: { id: string; score: number }[] = []
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    scores = JSON.parse(cleaned)
  } catch {
    console.error('Failed to parse AI scores:', raw)
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Build a map for quick lookup
  const scoreMap = new Map(scores.map(s => [s.id, s.score]))

  // Attach scores to applicant objects, sort, and slice to topN
  const allRanked = applicants
    .map((a: any) => ({ ...a, match_score: scoreMap.get(a.id) ?? 0 }))
    .sort((a: any, b: any) => b.match_score - a.match_score)

  const rankedApplicants = topN > 0 ? allRanked.slice(0, topN) : allRanked

  return NextResponse.json({ rankedApplicants })
}