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

  const { applicant: a } = await req.json()
  if (!a) return NextResponse.json({ error: 'No applicant provided' }, { status: 400 })

  const roles = (a.selected_roles?.length ? a.selected_roles.join(', ') : a.desired_role) || 'N/A'
  const techStack =
    (a.tech_stack || []).filter((t: any) => t.tech).map((t: any) => `${t.tech}${t.years ? ` (${t.years}Y)` : ''}`).join(', ')
    || (a.technology_highlights || []).filter((t: any) => t.tech).map((t: any) => `${t.tech}${t.years ? ` (${t.years}Y)` : ''}`).join(', ')
    || 'N/A'

  const details = `Name: ${a.full_name || 'N/A'}
Gender: ${a.gender || 'Not specified'}
Role(s): ${roles}
Tech Stack: ${techStack}
Expected Salary: ${a.expected_salary || 'N/A'}
Notice Period: ${a.notice_period || 'N/A'}
Total Years of Experience: ${a.experience_years || 0} years ${a.experience_months || 0} months
Open to Outsourcing: ${a.open_to_outsourcing || 'N/A'}
Heard About Us Via: ${a.referral_source || 'N/A'}`

  const prompt = `You are an HR recruiter. Write a concise, professional summary paragraph (3-4 sentences, no bullet points, no headings) about this job applicant based ONLY on the details below. Do not invent information. Write in the third person.

Use pronouns that match the applicant's Gender: "Male" → he/him, "Female" → she/her, "Prefer not to say" or "Not specified" → they/them (or rephrase to avoid pronouns). Never assume a gender that isn't given.

${details}

Return only the paragraph, nothing else:`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.4,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error('Groq API error:', err)
      return NextResponse.json({ error: 'AI summary failed' }, { status: 500 })
    }

    const groqData = await groqRes.json()
    const summary = groqData.choices?.[0]?.message?.content?.trim() || ''
    return NextResponse.json({ summary })
  } catch (err: any) {
    console.error('Summary error:', err)
    return NextResponse.json({ error: 'AI summary failed' }, { status: 500 })
  }
}