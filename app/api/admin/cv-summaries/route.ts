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

// GET /api/admin/cv-summaries?job_id=... — list saved summaries for a job
export async function GET(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get('job_id')
  if (!jobId) return NextResponse.json({ error: 'job_id is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('cv_summaries')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/cv-summaries — save a summary under a job
export async function POST(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { job_id, job_title, summary_data } = body
  if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
  if (!summary_data) return NextResponse.json({ error: 'summary_data is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('cv_summaries')
    .insert({ job_id, job_title: job_title || null, summary_data })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/cv-summaries — delete a saved summary
export async function DELETE(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('cv_summaries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}