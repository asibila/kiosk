// Home screen: the kiosk's entry point — a single log in button.
import { useNavigate } from 'react-router'

export default function Home() {
  const navigate = useNavigate()

  function handleLogin() {
    navigate('/login')
  }

  return (
    <section className="home-screen" aria-label="Home">
      <h1>Kiosk</h1>
      <button type="button" className="btn primary" onClick={handleLogin}>
        Log in
      </button>
    </section>
  )
}
