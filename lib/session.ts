// Sessão em cookie assinado (JWT HS256). Funciona no middleware (edge) e no servidor.
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'revisa_sessao'
export const VEHICLE_COOKIE = 'revisa_carro'
export const SESSION_DAYS = 120

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-somente-local-troque-isso')

export async function signSession(uid: string) {
  return new SignJWT({ uid }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(key())
}

export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key())
    return typeof payload.uid === 'string' ? payload.uid : null
  } catch {
    return null
  }
}
