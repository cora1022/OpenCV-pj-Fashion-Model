import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { session } from './api/members'
import App from './App'
import { server } from './test/server'

describe('App authentication lifecycle', () => {
  beforeEach(() => {
    session.clear()
  })

  it('restores the member from a refresh cookie and calls logout on the server', async () => {
    let logoutCalls = 0
    server.use(
      http.post('/api/members/token/refresh', () => HttpResponse.json({
        accessToken: 'restored-access',
        tokenType: 'Bearer',
        expiresIn: 900,
      })),
      http.get('/api/members/me', ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer restored-access')
        return HttpResponse.json({
          id: 1,
          email: 'member@example.com',
          displayName: '회원',
          role: 'USER',
        })
      }),
      http.post('/api/members/logout', () => {
        logoutCalls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )

    render(<App />)

    expect(await screen.findByText('회원님')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    await waitFor(() => expect(logoutCalls).toBe(1))
    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(session.token).toBeNull()
  })

  it('keeps a guest on the landing page when no refresh cookie exists', async () => {
    server.use(
      http.post('/api/members/token/refresh', () => HttpResponse.json({
        error: { code: 'REFRESH_TOKEN_INVALID', message: '로그인이 필요합니다.' },
      }, { status: 401 })),
    )

    render(<App />)

    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByText('이미지로 찾는')).toBeInTheDocument()
  })
})
