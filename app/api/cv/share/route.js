import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req) {
  const { cv, lang = 'en', filename = 'cv' } = await req.json()
  if (!cv) return NextResponse.json({ error: 'cv required' }, { status: 400 })

  const { rows } = await pool.query(
    'INSERT INTO shared_cvs (cv_data, lang, filename) VALUES ($1, $2, $3) RETURNING id',
    [JSON.stringify(cv), lang, filename]
  )
  const id = rows[0].id
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://matchcard.no'
  return NextResponse.json({ id, url: `${base}/cv/${id}` })
}

export async function GET(req) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { rows } = await pool.query(
    'SELECT cv_data, lang, filename FROM shared_cvs WHERE id = $1',
    [id]
  )
  if (rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { cv_data, lang, filename } = rows[0]
  return NextResponse.json({ cv: cv_data, lang, filename })
}
