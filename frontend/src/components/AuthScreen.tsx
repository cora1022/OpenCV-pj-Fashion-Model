import { useState, type FormEvent } from 'react'
import { login, signup, type Member } from '../api/members'

type AuthScreenProps = {
  initialMode: 'login' | 'signup'
  onClose: () => void
  onDone: (member: Member) => void
}

export function AuthScreen({ initialMode, onClose, onDone }: AuthScreenProps) {
  const [isSignup, setIsSignup] = useState(initialMode === 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeMode = (signupMode: boolean) => {
    setIsSignup(signupMode)
    setMessage('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)
    try {
      if (isSignup) {
        await signup(email, password, displayName)
        setIsSignup(false)
        setPassword('')
        setMessage('가입이 완료되었습니다. 로그인해주세요.')
        return
      }
      onDone(await login(email, password))
    } catch {
      setMessage(isSignup ? '입력한 회원 정보를 확인해주세요.' : '이메일 또는 비밀번호를 확인해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <section className="auth-screen">
        <header className="auth-header">
          <span className="auth-logo">STYLE FINDER</span>
          <button type="button" onClick={onClose} aria-label="로그인 창 닫기">닫기</button>
        </header>

        <div className="auth-content">
          <p className="auth-index">MEMBER</p>
          <h1 id="auth-title">{isSignup ? '회원가입' : '로그인'}</h1>
          <p className="auth-description">
            {isSignup
              ? '계정을 만들면 이미지 검색 서비스를 이용할 수 있습니다.'
              : '이미지 검색을 시작하려면 먼저 로그인해주세요.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="회원 메뉴">
            <button type="button" className={!isSignup ? 'is-active' : ''} onClick={() => changeMode(false)}>로그인</button>
            <button type="button" className={isSignup ? 'is-active' : ''} onClick={() => changeMode(true)}>회원가입</button>
          </div>

          <form onSubmit={submit}>
            {isSignup && (
              <label>
                이름
                <input required maxLength={80} placeholder="표시할 이름" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            )}
            <label>
              이메일
              <input type="email" required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              비밀번호
              <input type="password" required minLength={8} placeholder="8자 이상 입력" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {message && <p className="auth-message" role="status">{message}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : isSignup ? '계정 만들기' : '로그인'}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="auth-note">회원 정보는 회원 서비스에서 별도로 관리합니다.</p>
        </div>
      </section>
    </div>
  )
}
