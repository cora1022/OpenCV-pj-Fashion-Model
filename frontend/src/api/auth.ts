export type AdminUser = {
  id: number
  username: string
  display_name: string
  created_at: string
}

export type LoginResponse = {
  access_token: string
  token_type: string
  admin: AdminUser
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  ''

export async function loginAdmin(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  return (await response.json()) as LoginResponse
}

export async function fetchMe(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('로그인 세션이 만료되었습니다.')
  }

  return (await response.json()) as AdminUser
}
