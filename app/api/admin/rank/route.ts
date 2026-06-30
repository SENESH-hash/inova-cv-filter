import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

function verifyToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  try {
    return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET!)
  } catch { return null }
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { criteria, applicants } = await req.json()

  if (!applicants || applicants.length === 0) {
    return NextResponse.json({ rankedIds: [] })
  }

  // Build a compact summary of each applicant for the AI
  const summaries = applicants.map((a: any, idx: number) => {
    const ed = a.extracted_data || {}
    const ks = a.key_skills || {}

    // Handle both structured and legacy language data
    let langStr = ''
    if (Array.isArray(ks.languages)) {
      langStr = ks.languages.map((l: any) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join(', ')
    } else {
      langStr = ks.languages || ''
    }

    const techs = (a.technology_highlights || [])
      .filter((t: any) => t.tech)
      .map((t: any) => `${t.tech}${t.years ? ` ${t.years}Y` : ''}`)
      .join(', ')

    return `[${idx + 1}] ID:${a.id}
Name: ${a.full_name}
Experience: ${a.experience_years || 0}Y ${a.experience_months || 0}M
Roles: ${(a.selected_roles || []).join(', ') || a.desired_role || ''}
Location: ${ed.location || 'N/A'}
Degree: ${ed.degree_level || 'N/A'}${ed.field_of_study ? ` in ${ed.field_of_study}` : ''}
Skills: ${(ed.skills || []).slice(0, 10).join(', ')}
Technologies: ${techs}
Methodologies: ${(ed.methodologies || []).join(', ')}
Domain: ${a.domain_experience || 'N/A'}
Languages: ${langStr}
Frameworks: ${ks.frameworks || 'N/A'}
Databases: ${ks.databases || 'N/A'}
Past titles: ${(ed.past_job_titles || []).join(', ')}`
  }).join('\n\n')

  const prompt = `You are an expert HR recruiter. Rank the following ${applicants.length} candidates from BEST to WORST fit based on these criteria: ${criteria}

Return ONLY a JSON array of candidate IDs in ranked order (best first). No explanation, no markdown, just the JSON array.
Example format: ["id1", "id2", "id3"]

Candidates:
${summaries}

Return the ranked JSON array of IDs now:`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.1,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error('Groq API error:', err)
      return NextResponse.json({ error: 'AI ranking failed', details: err }, { status: 500 })
    }

    const groqData = await groqRes.json()
    const text = groqData.choices?.[0]?.message?.content?.trim() || ''

    // Extract JSON array from response (handle any surrounding text)
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      console.error('No JSON array found in AI response:', text)
      return NextResponse.json({ rankedIds: applicants.map((a: any) => a.id) })
    }

    const rankedIds = JSON.parse(match[0])
    return NextResponse.json({ rankedIds })

  } catch (err: any) {
    console.error('Ranking error:', err)
    // Fallback: return original order
    return NextResponse.json({ rankedIds: applicants.map((a: any) => a.id) })
  }
}