import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authApi, getAuthRedirectPath, getToken, setSession } from '../services/api'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (token) {
      navigate(getAuthRedirectPath(), { replace: true })
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.post('/auth/login', { email, password })
      const token = res?.data?.token || res?.data?.accessToken || res?.data?.jwt
      const userName = res?.data?.nombre || res?.data?.email || ''
      const userRole = res?.data?.rol || 'USER'

      if (token) {
        setSession({
          token,
          userName,
          userRole,
          userEmail: res?.data?.email || email,
        })
        navigate(userRole === 'ADMIN' ? '/dashboard' : '/user')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('Credenciales inválidas o error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-800">
        <h1 className="text-4xl font-bold mb-2">Agro SaaS</h1>
        <p className="text-slate-400 mb-6">Panel agrícola futurista 🌱</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            maxLength={100}
            placeholder="Correo"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
            required
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
            required
          />

          <button
            disabled={loading}
            className="w-full bg-emerald-500 disabled:opacity-60 hover:bg-emerald-600 transition p-3 rounded-xl font-semibold"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        <p className="mt-6 text-slate-400">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-emerald-400">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login