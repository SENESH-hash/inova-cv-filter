import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function extractTextFromBuffer(fileBuffer: Buffer, fileType: string): Promise<string> {
  try {
    if (fileType === 'pdf') {
      // Extract readable text from PDF buffer directly
      const text = fileBuffer.toString('latin1')
      const matches = text.match(/\(([^)]{2,100})\)/g) || []
      const extracted = matches
        .map(m => m.slice(1, -1))
        .filter(s => /[a-zA-Z]{2,}/.test(s))
        .join(' ')
      return extracted.slice(0, 4000)
    } else {
      return fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').slice(0, 4000)
    }
  } catch (e) {
    return ''
  }
}

async function extractCVData(fileBuffer: Buffer, fileType: string) {
  try {
    const cvText = await extractTextFromBuffer(fileBuffer, fileType)
    if (!cvText.trim()) return {}

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Extract info from this CV text. Return ONLY valid JSON, no markdown, no backticks.\n\nCV TEXT:\n${cvText}\n\nReturn: {"years_experience":null,"location":null,"skills":[],"methodologies":[],"degree_level":null,"field_of_study":null,"past_job_titles":[],"english_level":null,"certifications":[],"summary":""}`
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
    const internalStaffNote = formData.get('internal_staff_note') as string
    const isInternship = (formData.get('is_internship') as string) === 'Yes'
    const openToOutsourcing = formData.get('open_to_outsourcing') as string
    const expectedSalary = formData.get('expected_salary') as string
    const noticePeriod = formData.get('notice_period') as string
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
    const fileKey = `${Date.now()}-${email.replace('@', '_at_')}.${fileType}`
    const contentType = fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    const { error: uploadError } = await supabaseAdmin.storage
      .from('cv-uploads').upload(fileKey, fileBuffer, { contentType })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('cv-uploads').getPublicUrl(fileKey)

    const extractedData = await extractCVData(fileBuffer, fileType)

    const { error } = await supabaseAdmin.from('applicants').insert({
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
      internal_staff_note: internalStaffNote || null,
      is_internship: isInternship,
      experience_years: experienceYears ? parseInt(experienceYears) : null,
      experience_months: experienceMonths ? parseInt(experienceMonths) : null,
      technology_highlights: techHighlights,
      domain_experience: domainExperience || null,
      key_skills: keySkills,
      professional_qualifications: professionalQualifications || null,
      open_to_outsourcing: openToOutsourcing || null,
      expected_salary: expectedSalary || null,
      notice_period: noticePeriod || null,
      extracted_data: extractedData,
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'Submission failed' }, { status: 500 })
  }
}