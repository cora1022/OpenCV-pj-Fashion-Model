import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { session } from './api/members'
import App from './App'

const appServer = setupServer()

beforeAll(() => appServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => appServer.resetHandlers())
afterAll(() => appServer.close())

describe('App authentication lifecycle', () => {
  beforeEach(() => {
    session.clear()
  })
  it('keeps a guest on the landing page when no refresh cookie exists', async () => {
    appServer.use(
      http.post('/api/members/token/refresh', () => HttpResponse.json({
        error: { code: 'REFRESH_TOKEN_INVALID', message: '로그인이 필요합니다.' },
      }, { status: 401 })),
    )

    render(<App />)

    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByText('이미지로 찾는')).toBeInTheDocument()
  })
})
