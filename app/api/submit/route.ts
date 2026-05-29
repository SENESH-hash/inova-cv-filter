import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Groq from 'groq-sdk'
import * as pdfParse from 'pdf-parse'

// Increase Vercel function timeout (upgrade to Pro for full 60s benefit)
export const maxDuration = 60

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function extractCVData(fileBuffer: Buffer, fileType: string) {
  try {
    let cvText = ''
    if (fileType === 'pdf') {
      const pdfData = await (pdfParse as any)(fileBuffer)
      cvText = pdfData.text.slice(0, 4000)
    } else {
      cvText = fileBuffer.toString('utf-8').slice(0, 4000)
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Extract info from this CV. Return ONLY valid JSON, no markdown, no backticks.\n\nCV:\n${cvText}\n\n{"years_experience":null,"location":null,"skills":[],"methodologies":[],"degree_level":null,"field_of_study":null,"past_job_titles":[],"english_level":null,"certifications":[],"summary":""}`
      }]
    })
    const text = response.choices[0]?.message?.content || ''
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
    const desiredRole = formData.get('desired_role') as string || ''
    const selectedRolesRaw = formData.get('selected_roles') as string
    const selectedRoles = selectedRolesRaw ? JSON.parse(selectedRolesRaw) : []
    const techHighlightsRaw = formData.get('tech_highlights') as string
    const techHighlights = techHighlightsRaw ? JSON.parse(techHighlightsRaw) : []
    const keySkillsRaw = formData.get('key_skills') as string
    const keySkills = keySkillsRaw ? JSON.parse(keySkillsRaw) : {}
    const experienceYears = formData.get('experience_years') as string
    const experienceMonths = formData.get('experience_months') as string
    const domainExperience = formData.get('domain_experience') as string
    const professionalQualifications = formData.get('professional_qualifications') as string
    const referralSource = formData.get('referral_source') as string
    const referralName = formData.get('referral_name') as string
    const cvFile = formData.get('cv_file') as File

    if (!fullName || !email || !cvFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('applicants').select('id').eq('email', email).single()
    if (existing) {
      return NextResponse.json({ error: 'An application with this email already exists.' }, { status: 409 })
    }

    const fileBuffer = Buffer.from(await cvFile.arrayBuffer())
    const fileName = cvFile.name.toLowerCase()
    const fileType = fileName.endsWith('.pdf') ? 'pdf' : 'docx'
    const fileExt = fileType === 'pdf' ? 'pdf' : 'docx'
    const fileKey = `${Date.now()}-${email.replace('@', '_at_')}.${fileExt}`

    const contentType = fileType === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    // Step 1: Upload CV file to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('cv-uploads').upload(fileKey, fileBuffer, { contentType })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('cv-uploads').getPublicUrl(fileKey)

    // Step 2: Insert applicant immediately with empty extracted_data
    // This avoids Vercel's 10s timeout caused by waiting for Groq AI
    const { data: newApplicant, error: insertError } = await supabaseAdmin
      .from('applicants')
      .insert({
        full_name: fullName,
        email,
        phone,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        desired_role: selectedRoles.join(', '),
        selected_roles: selectedRoles,
        cv_file_url: publicUrl,
        cv_file_type: fileType,
        referral_source: referralSource || null,
        referral_name: referralName || null,
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        experience_months: experienceMonths ? parseInt(experienceMonths) : null,
        technology_highlights: techHighlights,
        domain_experience: domainExperience || null,
        key_skills: keySkills,
        professional_qualifications: professionalQualifications || null,
        extracted_data: {}, // AI data will be filled in the background
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    // Step 3: Fire-and-forget AI extraction — runs in background, won't block response
    // The extracted_data column will be updated once Groq finishes processing
    extractCVData(fileBuffer, fileType)
      .then(async (extractedData) => {
        const { error: updateError } = await supabaseAdmin
          .from('applicants')
          .update({ extracted_data: extractedData })
          .eq('id', newApplicant.id)

        if (updateError) {
          console.error('Failed to update extracted_data:', updateError)
        } else {
          console.log(`AI extraction complete for applicant ${newApplicant.id}`)
        }
      })
      .catch((err) => {
        console.error('Background AI extraction error:', err)
      })

    // Step 4: Return success immediately — don't wait for AI
    return NextResponse.json({ success: true })

  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'Submission failed' }, { status: 500 })
  }
}