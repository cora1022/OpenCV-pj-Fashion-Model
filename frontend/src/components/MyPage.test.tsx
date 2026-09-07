import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { MyPage } from './MyPage'

describe('MyPage', () => {
  it('shows owned search histories before saved-result actions are added', async () => {
    const emptySaved = { items: [], page: 0, size: 8, totalElements: 0, totalPages: 0 }
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
      http.get('/api/members/saved-results', () => HttpResponse.json(emptySaved)),
    )

    render(<MyPage
      member={{ id: 1, email: 'member@example.com', displayName: '회원', role: 'USER' }}
      onBack={vi.fn()}
      onSearchSaved={vi.fn()}
    />)

    expect(await screen.findByText('업로드 이미지 검색')).toBeInTheDocument()
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
