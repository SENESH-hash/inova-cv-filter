import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .single()

  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const token = jwt.sign(
    { userId: user.id, username },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  )

  return NextResponse.json({ token })
}