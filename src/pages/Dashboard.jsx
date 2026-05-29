import { Package, Warehouse, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { serviceRoots, getUserName, getUserRole, productApi, inventoryApi, purchaseApi } from '../services/api'
import Layout from '../components/Layout'

function StatCard({ icon, title, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl text-left hover:border-emerald-500/40 hover:bg-slate-800/50 transition-all group"
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-400">{title}</p>
          <h2 className="text-3xl font-bold text-white mt-2">{value}</h2>
        </div>
        <div className="text-emerald-400 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </button>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const [status, setStatus] = useState({})
  const [productCount, setProductCount] = useState('—')
  const [inventoryCount, setInventoryCount] = useState('—')
  const [orderCount, setOrderCount] = useState('—')

  useEffect(() => {
    productApi.get('/productos').then(r => setProductCount(r.data.length)).catch(() => {})
    inventoryApi.get('/inventory/stock').then(r => setInventoryCount(r.data.length)).catch(() => {})
    purchaseApi.get('/ordenes').then(r => setOrderCount(r.data.length)).catch(() => {})

    const entries = Object.entries(serviceRoots)
    const checks = entries.map(async ([key, root]) => {
      try {
        const url = root.replace(/\/$/, '')
        const res = await axios.get(url + '/actuator/health', { timeout: 2500 }).catch(() => null)
        if (res && res.status >= 200 && res.status < 300) return [key, { ok: true }]
        await axios.get(url + '/', { timeout: 2500 })
        return [key, { ok: true }]
      } catch {
        return [key, { ok: false }]
      }
    })
    Promise.all(checks).then((results) => setStatus(Object.fromEntries(results)))
  }, [])

  const serviceLinks = {
    auth: null,
    product: '/productos',
    inventory: '/inventario',
    purchase: '/ordenes',
  }

  const userName = getUserName()
  const userRole = getUserRole()

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-5xl font-bold">Dashboard {userRole === 'ADMIN' ? 'Admin' : 'Usuario'}</h1>
          <p className="text-slate-400 mt-2">Hola {userName || 'usuario'}, bienvenido al centro de control agrícola 🌾</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <StatCard
            title="Productos"
            value={productCount}
            icon={<Package size={42} />}
            onClick={() => navigate('/productos')}
          />
          <StatCard
            title="Inventario"
            value={inventoryCount}
            icon={<Warehouse size={42} />}
            onClick={() => navigate('/inventario')}
          />
          <StatCard
            title="Órdenes"
            value={orderCount}
            icon={<ShoppingCart size={42} />}
            onClick={() => navigate('/ordenes')}
          />
        </div>

        <div className="mt-10 bg-slate-900 rounded-3xl border border-slate-800 p-8">
          <h2 className="text-2xl font-bold mb-4">Estado de Microservicios</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.keys(serviceRoots).map((key) => {
              const label = {
                auth: 'AuthService',
                product: 'ProductService',
                inventory: 'InventoryService',
                purchase: 'PurchaseOrderService',
              }[key]

              const ok = status[key]?.ok
              const link = serviceLinks[key]

              return (
                <div
                  key={key}
                  className="flex items-center justify-between bg-slate-800 rounded-2xl p-4 border border-slate-700"
                >
                  <div>
                    <h3 className="font-semibold">{label}</h3>
                    <p className="text-slate-400 text-sm mt-1">{serviceRoots[key]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {link && (
                      <button
                        onClick={() => navigate(link)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                      >
                        Ir →
                      </button>
                    )}
                    <span className={`px-3 py-1 rounded-full font-medium text-sm ${ok === undefined ? 'bg-slate-600 text-slate-300' : ok ? 'bg-emerald-500 text-slate-900' : 'bg-red-600 text-white'}`}>
                      {ok === undefined ? 'Verificando...' : ok ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
