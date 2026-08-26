import { useEffect, useState } from 'react'
import './styles/search.css'
import './styles/landing.css'
import './styles/auth.css'
import './styles/mypage.css'
import { IntroScreen } from './components/IntroScreen'
import { SearchScreen } from './components/SearchScreen'
import { AuthScreen } from './components/AuthScreen'
import { MyPage } from './components/MyPage'
import { logout, restoreSession, session, type Member } from './api/members'

type Screen = 'intro' | 'search' | 'mypage'
type AuthMode = 'login' | 'signup'

function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [member, setMember] = useState<Member | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [continueToSearch, setContinueToSearch] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const [initialCatalogItemId, setInitialCatalogItemId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    restoreSession()
      .then((restoredMember) => {
        if (active) setMember(restoredMember)
      })
      .finally(() => {
        if (active) setIsRestoringSession(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => session.subscribe((reason) => {
    setMember(null)
    setScreen('intro')
    if (reason === 'expired') setAuthMode('login')
  }), [])

  const startSearch = () => {
    if (isRestoringSession) return
    if (member) {
      setScreen('search')
      return
    }
    setContinueToSearch(true)
    setAuthMode('login')
  }

  const screenNode =
    screen === 'intro' ? (
      <IntroScreen
        member={member}
        onStart={startSearch}
        onLogin={() => { setContinueToSearch(false); setAuthMode('login') }}
        onSignup={() => { setContinueToSearch(false); setAuthMode('signup') }}
        onMyPage={() => setScreen('mypage')}
        onLogout={async () => {
          try {
            await logout()
          } finally {
            setMember(null)
            setScreen('intro')
          }
        }}
      />
    ) : screen === 'search' ? (
      <SearchScreen
        onBack={() => setScreen('intro')}
        onMyPage={() => setScreen('mypage')}
        initialCatalogItemId={initialCatalogItemId}
        onInitialCatalogConsumed={() => setInitialCatalogItemId(null)}
      />
    ) : member ? (
      <MyPage
        member={member}
        onBack={() => setScreen('intro')}
        onSearchSaved={(catalogItemId) => {
          setInitialCatalogItemId(catalogItemId)
          setScreen('search')
        }}
      />
    ) : (
      <IntroScreen
        member={null}
        onStart={startSearch}
        onLogin={() => setAuthMode('login')}
        onSignup={() => setAuthMode('signup')}
        onMyPage={() => setAuthMode('login')}
        onLogout={() => undefined}
      />
    )

  return (
    <>
      {screenNode}
      {authMode && (
        <AuthScreen
          initialMode={authMode}
          onClose={() => { setAuthMode(null); setContinueToSearch(false) }}
          onDone={(user) => {
            setMember(user)
            setAuthMode(null)
            if (continueToSearch) setScreen('search')
            setContinueToSearch(false)
          }}
        />
      )}
    </>
  )
}

export default App
