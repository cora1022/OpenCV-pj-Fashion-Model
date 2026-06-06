import type { SearchResult } from './search'

export type SavedFashion = SearchResult & {
  id: number
  saved_by_admin_id: number
  saved_by: {
    id: number
    username: string
    display_name: string
  }
  created_at: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  ''

export async function fetchSavedFashions() {
  const response = await fetch(`${API_BASE_URL}/api/saved-fashions`)

  if (!response.ok) {
    throw new Error('저장된 패션 목록을 불러오지 못했습니다.')
  }

  return (await response.json()) as SavedFashion[]
}

export async function saveFashion(item: SearchResult, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/saved-fashions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    throw new Error('패션 상품을 저장하지 못했습니다.')
  }

  return (await response.json()) as SavedFashion
}

export async function deleteSavedFashion(id: number, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/saved-fashions/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('저장된 패션 상품을 삭제하지 못했습니다.')
  }
}
