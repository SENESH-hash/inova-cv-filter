import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

function verifyToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  try { return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET!) }
  catch { return null }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { error } = await supabaseAdmin.from('applicants').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}