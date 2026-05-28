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

export async function GET(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter')
  const value = searchParams.get('value')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  let query = supabaseAdmin
    .from('applicants')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (dateFrom) query = query.gte('submitted_at', dateFrom)
  if (dateTo) query = query.lte('submitted_at', dateTo + 'T23:59:59Z')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let filtered = data
  if (filter && value && value.trim()) {
    const v = value.toLowerCase()
    filtered = data.filter((a: any) => {
      const ed = a.extracted_data || {}
      switch (filter) {
        case 'years_experience':
          return ed.years_experience != null && ed.years_experience >= parseInt(v)
        case 'location':
          return ed.location?.toLowerCase().includes(v)
        case 'skills':
          return ed.skills?.some((s: string) => s.toLowerCase().includes(v))
        case 'methodologies':
          return ed.methodologies?.some((m: string) => m.toLowerCase().includes(v))
        case 'degree_level':
          return ed.degree_level?.toLowerCase().includes(v)
        case 'field_of_study':
          return ed.field_of_study?.toLowerCase().includes(v)
        case 'past_job_titles':
          return ed.past_job_titles?.some((t: string) => t.toLowerCase().includes(v))
        case 'english_level':
          return ed.english_level?.toLowerCase().includes(v)
        case 'desired_role':
          return a.desired_role?.toLowerCase().includes(v)
        case 'status':
          return a.status?.toLowerCase() === v
        default:
          return true
      }
    })
  }

  return NextResponse.json(filtered)
}