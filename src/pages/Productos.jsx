import { useEffect, useState } from 'react'
import { Package, Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react'
import { productApi, getUserRole } from '../services/api'
import Layout from '../components/Layout'

const EMPTY = { nombre: '', descripcion: '', precio: '', categoria: '', sku: '' }

function generateSku(nombre = 'PROD') {
  const base = nombre
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) || 'PROD'
  const suffix = Math.floor(Math.random() * 90000 + 10000)
  return `${base}-${suffix}`
}

function Badge({ children }) {
  return (
    <span className="bg-emerald-500/10 text-emerald-400 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-500/20">
      {children}
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

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const isAdmin = getUserRole() === 'ADMIN'

  const fetchProductos = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await productApi.get('/productos')
      setProductos(res.data || [])
    } catch {
      setError('No se pudo conectar con el ProductService.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProductos() }, [])

  const openCreate = () => {
    setForm(EMPTY)
    setFormError('')
    setModal('create')
  }

  const openEdit = (p) => {
    setSelected(p)
    setForm({
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      precio: p.precio ?? '',
      categoria: p.categoria || '',
      sku: p.sku || '',
    })
    setFormError('')
    setModal('edit')
  }

  const openDelete = (p) => {
    setSelected(p)
    setModal('delete')
  }

  const closeModal = () => { setModal(null); setSelected(null) }

  const handleSave = async () => {
    setSaving(true)
    setFormError('')

    const payload = {
      ...form,
      precio: parseFloat(form.precio),
    }

    if (!payload.nombre || !payload.categoria || Number.isNaN(payload.precio)) {
      setFormError('Nombre, categoría y precio son obligatorios.')
      setSaving(false)
      return
    }

    if (!payload.sku) {
      payload.sku = generateSku(payload.nombre)
      setForm({ ...form, sku: payload.sku })
    }

    try {
      if (modal === 'create') {
        await productApi.post('/productos', payload)
      } else {
        await productApi.put(`/productos/${selected.id}`, payload)
      }
      closeModal()
      fetchProductos()
    } catch {
      setFormError('Error al guardar. Verifica los datos.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await productApi.delete(`/productos/${selected.id}`)
      closeModal()
      fetchProductos()
    } catch {
      setFormError('Error al eliminar.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = productos.filter(p =>
    (p.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Package size={28} className="text-emerald-400" />
              <h1 className="text-3xl font-bold">Productos</h1>
            </div>
            <p className="text-slate-400">Catálogo del ProductService</p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Plus size={18} />
              Nuevo Producto
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o categoría..."
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* States */}
        {loading && (
          <div className="text-center py-20 text-slate-400">Cargando productos...</div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm mb-4">{error}</div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium">Precio</th>
                  <th className="px-6 py-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-500">
                      Sin productos registrados
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-medium">{p.nombre}</td>
                      <td className="px-6 py-4"><Badge>{p.categoria || '—'}</Badge></td>
                      <td className="px-6 py-4 text-emerald-400 font-mono">
                        ${parseFloat(p.precio || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => openDelete(p)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">Sin permisos</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Nuevo Producto' : 'Editar Producto'} onClose={closeModal}>
          <div className="space-y-4">
            {['nombre', 'descripcion', 'categoria'].map((field) => (
              <input
                key={field}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            ))}
            <input
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              placeholder="Precio"
              type="number"
              min="0"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
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

      {/* Delete Modal */}
      {modal === 'delete' && (
        <Modal title="Eliminar Producto" onClose={closeModal}>
          <p className="text-slate-300 mb-6">
            ¿Deseas eliminar <span className="font-bold text-white">{selected?.nombre}</span>? Esta acción no se puede deshacer.
          </p>
          {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}
          <div className="flex gap-3">
            <button onClick={closeModal} className="flex-1 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={saving} className="flex-1 p-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 font-semibold transition">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
