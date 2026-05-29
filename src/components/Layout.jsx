import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  LogOut, Leaf, ChevronRight
} from 'lucide-react'
import { getUserName, getUserRole, clearSession } from '../services/api'

const adminNavItems = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/productos',      icon: Package,          label: 'Productos' },
  { to: '/inventario',     icon: Warehouse,        label: 'Inventario' },
  { to: '/ordenes',        icon: ShoppingCart,     label: 'Órdenes' },
]

const userNavItems = [
  { to: '/user',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/productos',      icon: Package,          label: 'Productos' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const userName = getUserName()
  const userRole = getUserRole()
  const navItems = userRole === 'ADMIN' ? adminNavItems : userNavItems
  const panelLabel = userRole === 'ADMIN' ? 'Panel Admin' : 'Panel Usuario'

  const handleLogout = () => {
    clearSession()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-900 rounded-xl p-2">
              <Leaf size={22} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-lg leading-none">AgroStock</p>
              <p className="text-slate-400 text-xs mt-0.5">{panelLabel}</p>
            </div>
          </div>
          <div className="mt-5 bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Usuario</p>
            <p className="text-white font-semibold mt-1">{userName || 'Invitado'}</p>
            <p className="text-slate-500 text-xs mt-1">{userRole || 'USER'}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-emerald-500 text-slate-900'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
