import { pool } from '@/lib/db'
import { notFound } from 'next/navigation'
import ShareCV from './ShareCV'

export async function generateMetadata({ params }) {
  const { rows } = await pool.query(
    'SELECT cv_data FROM shared_cvs WHERE id = $1',
    [params.id]
  )
  if (!rows.length) return { title: 'CV not found' }
  const { personal } = rows[0].cv_data
  const name = [personal?.firstName, personal?.lastName].filter(Boolean).join(' ')
  return { title: name ? `${name} — CV` : 'Shared CV' }
}

export default async function CVSharePage({ params }) {
  const { rows } = await pool.query(
    'SELECT cv_data, lang, filename FROM shared_cvs WHERE id = $1',
    [params.id]
  )
  if (!rows.length) notFound()

  const { cv_data: cv, lang, filename } = rows[0]
  return <ShareCV cv={cv} lang={lang} filename={filename} />
}
