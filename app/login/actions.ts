'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { q } from '@/lib/db'
import { SESSION_COOKIE, SESSION_DAYS, signSession } from '@/lib/session'

export type LoginState = { error?: string } | undefined

async function startSession(uid: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, await signSession(uid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  })
}

const clean = (v: FormDataEntryValue | null) => String(v ?? '').trim()

export async function entrar(_: LoginState, form: FormData): Promise<LoginState> {
  const email = clean(form.get('email')).toLowerCase()
  const password = clean(form.get('password'))
  if (!email || !password) return { error: 'Preencha e-mail e senha.' }
  const [u] = await q<{ id: string; password_hash: string }>`select id, password_hash from users where email = ${email}`
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return { error: 'E-mail ou senha incorretos.' }
  await startSession(u.id)
  redirect('/')
}

export async function cadastrar(_: LoginState, form: FormData): Promise<LoginState> {
  const name = clean(form.get('name')).slice(0, 80)
  const email = clean(form.get('email')).toLowerCase()
  const password = clean(form.get('password'))
  if (!email.includes('@')) return { error: 'E-mail inválido.' }
  if (password.length < 8) return { error: 'A senha precisa de pelo menos 8 caracteres.' }

  const [{ n }] = await q<{ n: number }>`select count(*)::int as n from users`
  if (n > 0 && process.env.ALLOW_SIGNUP !== 'true') return { error: 'Cadastros fechados. Peça acesso ao dono do app.' }

  const [exists] = await q`select 1 from users where email = ${email}`
  if (exists) return { error: 'Já existe uma conta com esse e-mail.' }

  const hash = await bcrypt.hash(password, 11)
  const [u] = await q<{ id: string }>`insert into users (email, name, password_hash) values (${email}, ${name || null}, ${hash}) returning id`
  await startSession(u.id)
  redirect('/carro/novo')
}

export async function sair() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/login')
}
