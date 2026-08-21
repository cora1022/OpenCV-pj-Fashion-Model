const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''
let accessToken: string | null = null
export type Member = { id: number; email: string; displayName: string; role: string }
export const session = { get token() { return accessToken }, clear() { accessToken = null } }
async function call(path: string, init: RequestInit = {}) { const r = await fetch(`${base}/api/members${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers } }); if (!r.ok) throw new Error('회원 요청을 처리하지 못했습니다.'); return r.status === 204 ? null : r.json() }
export async function login(email: string, password: string) { const tokens = await call('/login', { method: 'POST', body: JSON.stringify({ email, password }) }); accessToken = tokens.accessToken; return me() }
export async function signup(email: string, password: string, displayName: string) { return call('/signup', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }) }
export async function me(): Promise<Member> { return call('/me') }
