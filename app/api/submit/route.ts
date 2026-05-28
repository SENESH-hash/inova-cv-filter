import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractCVData(pdfBuffer: Buffer) {
  try {
    const base64PDF = pdfBuffer.toString('base64')
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64PDF }
          },
          {
            type: 'text',
            text: `Extract information from this CV and return ONLY a JSON object. No extra text.
{
  "years_experience": number or null,
  "location": "city, country" or null,
  "skills": ["skill1", "skill2"],
  "methodologies": ["Agile", "Scrum"],
  "degree_level": "Bachelor/Master/PhD/Diploma/None" or null,
  "field_of_study": "Computer Science" or null,
  "past_job_titles": ["Title 1"],
  "english_level": "Native/Fluent/Intermediate/Basic" or null,
  "certifications": ["cert1"],
  "summary": "2 sentence summary"
}`
          }
        ]
      }]
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return {}
  } catch (e) {
    console.error('CV extraction failed:', e)
    return {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const linkedinUrl = formData.get('linkedin_url') as string
    const portfolioUrl = formData.get('portfolio_url') as string
    const desiredRole = formData.get('desired_role') as string
    const referralName = formData.get('referral_name') as string
    const referralEmail = formData.get('referral_email') as string
    const cvFile = formData.get('cv_file') as File

    if (!fullName || !email || !desiredRole || !cvFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Duplicate check
    const { data: existing } = await supabaseAdmin
      .from('applicants')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'An application with this email already exists.' }, { status: 409 })
    }

    // Upload CV to Supabase Storage
    const fileBuffer = Buffer.from(await cvFile.arrayBuffer())
    const fileKey = `${Date.now()}-${email.replace('@', '_at_')}.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('cv-uploads')
      .upload(fileKey, fileBuffer, { contentType: 'application/pdf' })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('cv-uploads')
      .getPublicUrl(fileKey)

    // Extract CV data with Claude
    const extractedData = await extractCVData(fileBuffer)

    // Save to Supabase
    const { error } = await supabaseAdmin.from('applicants').insert({
      full_name: fullName,
      email,
      phone,
      linkedin_url: linkedinUrl,
      portfolio_url: portfolioUrl,
      desired_role: desiredRole,
      cv_file_url: publicUrl,
      referral_name: referralName || null,
      referral_email: referralEmail || null,
      extracted_data: extractedData,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'Submission failed' }, { status: 500 })
  }
}