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

// GET /api/admin/job-openings — list all job openings
export async function GET(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('job_openings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/job-openings — create a new job opening
export async function POST(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, department, employment_type, location,
    min_experience_years, tech_stack, required_methodologies,
    degree_required, job_description, responsibilities,
    nice_to_have, notes, status
  } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Job title is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('job_openings')
    .insert({
      title: title.trim(),
      department: department?.trim() || null,
      employment_type: employment_type || 'Full-time',
      location: location?.trim() || null,
      min_experience_years: parseInt(min_experience_years) || 0,
      tech_stack: Array.isArray(tech_stack) ? tech_stack.filter(Boolean) : [],
      required_methodologies: Array.isArray(required_methodologies) ? required_methodologies.filter(Boolean) : [],
      degree_required: degree_required || null,
      job_description: job_description?.trim() || null,
      responsibilities: responsibilities?.trim() || null,
      nice_to_have: nice_to_have?.trim() || null,
      notes: notes?.trim() || null,
      status: status || 'Open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/job-openings — update status (open/closed)
export async function PATCH(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('job_openings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/job-openings — delete a job opening
export async function DELETE(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('job_openings')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}