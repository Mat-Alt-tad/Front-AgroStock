import { useEffect, useState } from 'react'
import { Warehouse, Plus, Pencil, Trash2, X, Check, Search, AlertTriangle } from 'lucide-react'
import { inventoryApi, productApi, getUserRole } from '../services/api'
import Layout from '../components/Layout'

const EMPTY = { productoId: '', cantidad: '', nivelMinimo: '' }

function StockBadge({ cantidad, minimo }) {
  const low = cantidad <= (minimo || 0)
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
      low
        ? 'bg-red-500/10 text-red-400 border-red-500/20'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }`}>
      {low && <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />}
      {cantidad} unidades
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Inventario() {
  const [items, setItems] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const isAdmin = getUserRole() === 'ADMIN'

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [invRes, prodRes] = await Promise.all([
        inventoryApi.get('/inventory/stock'),                         // ← ruta real
        productApi.get('/productos').catch(() => ({ data: [] })),
      ])
      setItems(invRes.data || [])
      setProductos(prodRes.data || [])
    } catch {
      setError('No se pudo conectar con el InventoryService.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const productoNombre = (id) => {
    const p = productos.find(p => String(p.id) === String(id))
    return p ? p.nombre : `Producto #${id}`
  }

  const openCreate = () => { setForm(EMPTY); setFormError(''); setModal('create') }
  const openEdit = (item) => {
    setSelected(item)
    setForm({
      productoId: item.productoId || '',
      cantidad: item.cantidad ?? '',
      nivelMinimo: item.nivelMinimo ?? '',
    })
    setFormError('')
    setModal('edit')
  }
  const openDelete = (item) => { setSelected(item); setModal('delete') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        productoId: form.productoId,
        cantidad: parseInt(form.cantidad, 10),
        nivelMinimo: parseInt(form.nivelMinimo, 10) || 0,
      }
      if (modal === 'create') {
        await inventoryApi.post('/inventory/stock', payload)          // ← ruta real
      } else {
        await inventoryApi.put(`/inventory/stock/${selected.id}`, payload)  // ← ruta real
      }
      closeModal()
      fetchAll()
    } catch {
      setFormError('Error al guardar. Verifica los datos.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await inventoryApi.delete(`/inventory/stock/${selected.id}`)    // ← ruta real
      closeModal()
      fetchAll()
    } catch {
      setFormError('Error al eliminar.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = items.filter(i =>
    productoNombre(i.productoId).toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = items.filter(i => i.cantidad <= (i.nivelMinimo || 0)).length

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Warehouse size={28} className="text-emerald-400" />
              <h1 className="text-3xl font-bold">Inventario</h1>
            </div>
            <p className="text-slate-400">Stock — <span className="font-mono text-xs text-slate-500">GET /api/inventory/stock</span></p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Plus size={18} />
              Nuevo Stock
            </button>
          )}
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 text-amber-400 text-sm">
            <AlertTriangle size={18} />
            <span><strong>{lowStockCount}</strong> producto(s) por debajo del nivel mínimo</span>
          </div>
        )}

        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto..."
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {loading && <div className="text-center py-20 text-slate-400">Cargando inventario...</div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm mb-4">{error}</div>}

        {!loading && !error && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="px-6 py-4 font-medium">Producto</th>
                  <th className="px-6 py-4 font-medium">Cantidad</th>
                  <th className="px-6 py-4 font-medium">Nivel Mínimo</th>
                  <th className="px-6 py-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-500">Sin registros de stock</td></tr>
                ) : filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium">{productoNombre(item.productoId)}</td>
                    <td className="px-6 py-4">
                      <StockBadge cantidad={item.cantidad ?? 0} minimo={item.nivelMinimo} />
                    </td>
                    <td className="px-6 py-4 text-slate-400">{item.nivelMinimo ?? '—'}</td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(item)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"><Pencil size={15} /></button>
                          <button onClick={() => openDelete(item)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 size={15} /></button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">Sin permisos</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Nuevo Stock' : 'Editar Stock'} onClose={closeModal}>
          <div className="space-y-4">
            <select
              value={form.productoId}
              onChange={(e) => setForm({ ...form, productoId: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Selecciona un producto</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                placeholder="Cantidad"
                type="number"
                min="0"
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <input
                value={form.nivelMinimo}
                onChange={(e) => setForm({ ...form, nivelMinimo: e.target.value })}
                placeholder="Nivel mínimo"
                type="number"
                min="0"
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-900 font-semibold p-3 rounded-xl transition"
            >
              <Check size={16} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Eliminar Stock" onClose={closeModal}>
          <p className="text-slate-300 mb-6">
            ¿Eliminar el stock de <span className="font-bold text-white">{productoNombre(selected?.productoId)}</span>?
          </p>
          {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}
          <div className="flex gap-3">
            <button onClick={closeModal} className="flex-1 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium">Cancelar</button>
            <button onClick={handleDelete} disabled={saving} className="flex-1 p-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 font-semibold transition">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}