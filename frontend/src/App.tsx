import { useState } from 'react'
import './App.css'
import './styles/landing.css'
import { IntroScreen } from './components/IntroScreen'
import { SearchScreen } from './components/SearchScreen'
import { AuthScreen } from './components/AuthScreen'
import { session, type Member } from './api/members'

type Screen = 'intro' | 'search'
type AuthMode = 'login' | 'signup'

function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [member, setMember] = useState<Member | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [continueToSearch, setContinueToSearch] = useState(false)

  const startSearch = () => {
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
        onLogout={() => { session.clear(); setMember(null) }}
      />
    ) : (
      <SearchScreen onBack={() => setScreen('intro')} />
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
