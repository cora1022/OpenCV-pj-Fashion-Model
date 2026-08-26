import { authorizedFetch } from './members'
import type { CatalogMetadata, SearchResult } from './search'

const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

export type SearchHistory = {
  id: number
  searchType: 'IMAGE_UPLOAD' | 'CATALOG_ITEM'
  cropMode: 'AUTO' | 'MANUAL' | 'CATALOG' | null
  searchedAt: string
}

export type SavedResult = {
  id: number
  catalogItemId: string
  title: string
  imageUrl: string
  sourceUrl?: string | null
  similarityScore: number
  metadata: CatalogMetadata
  modelVersion: string
  createdAt: string
}

export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export class ActivityApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ActivityApiError'
    this.code = code
    this.status = status
  }
}

async function activityError(response: Response) {
  try {
    const body = await response.json() as {
      error?: { code?: string; message?: string }
    }
    return new ActivityApiError(
      body.error?.code || 'ACTIVITY_REQUEST_FAILED',
      body.error?.message || '사용자 활동을 처리하지 못했습니다.',
      response.status,
    )
  } catch {
    return new ActivityApiError(
      'ACTIVITY_REQUEST_FAILED',
      '사용자 활동을 처리하지 못했습니다.',
      response.status,
    )
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const response = await authorizedFetch(`${base}/api/members${path}`, { ...init, headers })
  if (!response.ok) throw await activityError(response)
  if (response.status === 204) return undefined as T
  return await response.json() as T
}

export function listSearchHistories(page = 0, size = 10) {
  return call<PageResponse<SearchHistory>>(`/search-histories?page=${page}&size=${size}`)
}

export function createSearchHistory(
  searchType: SearchHistory['searchType'],
  cropMode: SearchHistory['cropMode'],
) {
  return call<SearchHistory>('/search-histories', {
    method: 'POST',
    body: JSON.stringify({ searchType, cropMode }),
  })
}

export function deleteSearchHistory(id: number) {
  return call<void>(`/search-histories/${id}`, { method: 'DELETE' })
}

export function listSavedResults(page = 0, size = 8) {
  return call<PageResponse<SavedResult>>(`/saved-results?page=${page}&size=${size}`)
}

export function createSavedResult(result: SearchResult) {
  return call<SavedResult>('/saved-results', {
    method: 'POST',
    body: JSON.stringify({
      catalogItemId: result.catalogItemId,
      title: result.title,
      imageUrl: result.imageUrl,
      sourceUrl: result.sourceUrl ?? null,
      similarityScore: result.similarityScore,
      metadata: result.metadata,
      modelVersion: result.modelVersion,
    }),
  })
}

export function deleteSavedResult(id: number) {
  return call<void>(`/saved-results/${id}`, { method: 'DELETE' })
}
