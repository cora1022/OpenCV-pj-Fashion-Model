import { fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { MyPage } from './MyPage'

describe('MyPage', () => {
  it('shows owned histories and saved results and starts a catalog re-search', async () => {
    server.use(
      http.get('/api/members/search-histories', () => HttpResponse.json({
        items: [{
          id: 1,
          searchType: 'IMAGE_UPLOAD',
          cropMode: 'AUTO',
          searchedAt: '2026-07-18T10:00:00Z',
        }],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      })),
      http.get('/api/members/saved-results', () => HttpResponse.json({
        items: [{
          id: 2,
          catalogItemId: 'shirt-blue-001',
          title: '파란 셔츠',
          imageUrl: '/api/catalog/items/shirt-blue-001/image',
          sourceUrl: null,
          similarityScore: 0.91,
          metadata: { category: 'shirt', colors: ['blue'], styleTags: ['minimal'] },
          modelVersion: 'fashion-clip@test',
          createdAt: '2026-07-18T10:01:00Z',
        }],
        page: 0,
        size: 8,
        totalElements: 1,
        totalPages: 1,
      })),
    )
    const onSearchSaved = vi.fn()

    render(<MyPage
      member={{ id: 1, email: 'member@example.com', displayName: '회원', role: 'USER' }}
      onBack={vi.fn()}
      onSearchSaved={onSearchSaved}
    />)

    expect(await screen.findByText('업로드 이미지 검색')).toBeInTheDocument()
    expect(await screen.findByText('파란 셔츠')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 검색' }))
    expect(onSearchSaved).toHaveBeenCalledWith('shirt-blue-001')
  })

  it('renders empty states from paginated APIs', async () => {
    const empty = { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }
    server.use(
      http.get('/api/members/search-histories', () => HttpResponse.json(empty)),
      http.get('/api/members/saved-results', () => HttpResponse.json({ ...empty, size: 8 })),
    )

    render(<MyPage
      member={{ id: 1, email: 'member@example.com', displayName: '회원', role: 'USER' }}
      onBack={vi.fn()}
      onSearchSaved={vi.fn()}
    />)

    expect(await screen.findByText('아직 검색 기록이 없습니다.')).toBeInTheDocument()
    expect(await screen.findByText('아직 저장한 이미지가 없습니다.')).toBeInTheDocument()
  })
})
