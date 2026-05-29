import { Routes, Route, Navigate } from 'react-router-dom'
import { getAuthRedirectPath, getToken, getUserRole } from './services/api'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UserDashboard from './pages/UserDashboard'
import Productos from './pages/Productos'
import Inventario from './pages/Inventario'
import Ordenes from './pages/Ordenes'

function PublicRoute({ children }) {
  const token = getToken()
  return token ? <Navigate to={getAuthRedirectPath()} replace /> : children
}

function PrivateRoute({ children }) {
  const token = getToken()
  return token ? children : <Navigate to="/" replace />
}

function AdminRoute({ children }) {
  const role = getUserRole()
  return role === 'ADMIN' ? children : <Navigate to="/user" replace />
}

function App() {
  const token = getToken()
  const fallbackRoute = token ? getAuthRedirectPath() : '/'

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><AdminRoute><Dashboard /></AdminRoute></PrivateRoute>} />
      <Route path="/user" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
      <Route path="/productos" element={<PrivateRoute><Productos /></PrivateRoute>} />
      <Route path="/inventario" element={<PrivateRoute><AdminRoute><Inventario /></AdminRoute></PrivateRoute>} />
      <Route path="/ordenes" element={<PrivateRoute><Ordenes /></PrivateRoute>} />
      <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
    </Routes>
  )
}

export default App
