import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authApi, getAuthRedirectPath, getToken } from '../services/api'

function Register() {
  const navigate = useNavigate()
  const [cedula, setCedula] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('USER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (token) {
      navigate(getAuthRedirectPath(), { replace: true })
    }
  }, [navigate])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.post('/auth/register', { cedula, nombre, email, password, rol })
      navigate('/')
    } catch (err) {
      setError('Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-800">
        <h1 className="text-4xl font-bold mb-2">Crear Cuenta</h1>
        <p className="text-slate-400 mb-6">Cultivando usuarios digitales 🚜</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            type="text"
            minLength={8}
            maxLength={20}
            placeholder="Cédula"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
            required
          />

          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            type="text"
            placeholder="Nombre Completo"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
            required
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
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

          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
          >
            <option value="USER">Usuario</option>
            <option value="ADMIN">Administrador</option>
          </select>

          <button
            disabled={loading}
            className="w-full bg-emerald-500 disabled:opacity-60 hover:bg-emerald-600 transition p-3 rounded-xl font-semibold"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        <p className="mt-6 text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/" className="text-emerald-400">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register