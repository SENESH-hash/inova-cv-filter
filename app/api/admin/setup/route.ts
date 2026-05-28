import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { setupKey, username, password } = await req.json()

  if (setupKey !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 })
  }

  const hash = await bcrypt.hash(password, 12)
  
  const { error } = await supabaseAdmin
    .from('admin_users')
    .insert({ username, password_hash: hash })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  return NextResponse.json({ success: true })
}