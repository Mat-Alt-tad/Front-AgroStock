import { useEffect, useState } from 'react'
import { ShoppingCart, Plus, Eye, X, Check, Search, ChevronDown, AlertCircle } from 'lucide-react'
import { getUserName, purchaseApi, productApi, inventoryApi } from '../services/api'
import Layout from '../components/Layout'

const ESTADOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ENTREGADA']

const estadoStyle = {
  PENDIENTE:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  APROBADA:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  RECHAZADA:  'bg-red-500/10 text-red-400 border-red-500/20',
  ENTREGADA:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const EMPTY_FORM = { productoId: '', cantidad: '', precioUnitario: '', estado: 'PENDIENTE', notas: '' }

function StateBadge({ estado }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${estadoStyle[estado] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
      {estado || '—'}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  // ← Map keyed by String(id) para lookup rápido y confiable
  const [productosMap, setProductosMap] = useState(new Map())
  const [productos, setProductos] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [lineItemsMap, setLineItemsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [loadingProductDetail, setLoadingProductDetail] = useState(false)
  const [loadingLineas, setLoadingLineas] = useState(false)

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Devuelve el nombre del producto dado su id, o el fallback si no se encuentra */
  const productoNombre = (id) => {
    if (!id) return '—'
    const nombre = productosMap.get(String(id))
    return nombre ?? `Producto #${id}`
  }

  const getStockDisponible = (productoId) => stockMap[productoId] ?? 0

  // ─── Fetch lineas para UNA orden (fallback robusto) ─────────────────────────
  const fetchLineasParaOrden = async (ordenId) => {
    const id = String(ordenId)
    // Intenta primero por query param, luego por sub-ruta
    const endpoints = [
      () => purchaseApi.get(`/lineas-orden?ordenId=${id}`),
      () => purchaseApi.get(`/ordenes/${id}/lineas`),
      () => purchaseApi.get(`/lineas-orden/${id}`),
    ]
    for (const fn of endpoints) {
      try {
        const res = await fn()
        const data = Array.isArray(res.data) ? res.data : []
        if (data.length > 0) return data
      } catch {
        // siguiente intento
      }
    }
    return []
  }

  // ─── Carga principal ─────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [ordRes, prodRes, stockRes, lineRes] = await Promise.all([
        purchaseApi.get('/ordenes'),
        productApi.get('/productos').catch(() => ({ data: [] })),
        inventoryApi.get('/inventory/stock').catch(() => ({ data: [] })),
        // Intenta obtener todas las líneas de una vez; si falla, continuamos sin ellas
        purchaseApi.get('/lineas-orden').catch(() => ({ data: [] })),
      ])

      const prods = prodRes.data || []
      setProductos(prods)

      // ← Construir Map para lookup O(1) y comparación segura
      const pMap = new Map()
      prods.forEach(p => pMap.set(String(p.id), p.nombre))
      setProductosMap(pMap)

      setOrdenes(ordRes.data || [])

      // Stock map
      const stock = {}
      if (Array.isArray(stockRes.data)) {
        stockRes.data.forEach(item => {
          stock[String(item.productoId)] = item.cantidad
        })
      }
      setStockMap(stock)

      // Lineas map — agrupa por ordenId
      const lineMap = {}
      if (Array.isArray(lineRes.data) && lineRes.data.length > 0) {
        lineRes.data.forEach(line => {
          const key = String(line.ordenId)
          if (!lineMap[key]) lineMap[key] = []
          lineMap[key].push(line)
        })
      }
      setLineItemsMap(lineMap)
    } catch {
      setError('No se pudo conectar con los servicios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ─── Selección de producto en formulario ─────────────────────────────────────
  const handleProductoSelect = async (productoId) => {
    setForm(prev => ({ ...prev, productoId, precioUnitario: '' }))
    if (!productoId) return

    setLoadingProductDetail(true)
    try {
      const res = await productApi.get(`/productos/${productoId}`)
      setForm(prev => ({ ...prev, precioUnitario: res.data?.precio || '' }))
    } catch {
      setFormError('Error al obtener detalles del producto.')
    } finally {
      setLoadingProductDetail(false)
    }
  }

  // ─── Modales ──────────────────────────────────────────────────────────────────
  const openCreate = () => { setForm(EMPTY_FORM); setFormError(''); setModal('create') }

  const openView = async (o) => {
    setSelected(o)
    setModal('view')

    // Si aún no tenemos lineas para esta orden, las buscamos ahora
    if (!lineItemsMap[String(o.id)]) {
      setLoadingLineas(true)
      const lineas = await fetchLineasParaOrden(o.id)
      setLineItemsMap(prev => ({ ...prev, [String(o.id)]: lineas }))
      setLoadingLineas(false)
    }
  }

  const openChangeState = (o) => {
    setSelected(o)
    setForm({ estado: o.estado })
    setFormError('')
    setModal('state')
  }

  const closeModal = () => { setModal(null); setSelected(null) }

  // ─── Crear orden ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSaving(true)
    setFormError('')
    try {
      const cantidad = parseInt(form.cantidad, 10)
      const productoId = form.productoId
      const precioUnitario = parseFloat(form.precioUnitario)
      const stockDisp = getStockDisponible(form.productoId)

      if (!form.productoId) {
        setFormError('Selecciona un producto válido.')
        return
      }
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setFormError('Ingresa una cantidad válida.')
        return
      }
      if (cantidad > stockDisp) {
        setFormError(`Stock insuficiente. Disponible: ${stockDisp} unidades`)
        return
      }
      if (Number.isNaN(precioUnitario) || precioUnitario <= 0) {
        setFormError('Precio unitario inválido.')
        return
      }

      const orderRes = await purchaseApi.post('/ordenes', {
        usuarioId: getUserName(),
        estado: form.estado,
        total: cantidad * precioUnitario,
      })
      const createdOrder = orderRes.data

      try {
        await purchaseApi.post('/lineas-orden', {
          ordenId: createdOrder.id,
          productoId,
          cantidad,
          precioUnitario,
        })
      } catch (lineError) {
        await purchaseApi.delete(`/ordenes/${createdOrder.id}`).catch(() => {})
        throw lineError
      }

      closeModal()
      fetchAll()
    } catch {
      setFormError('Error al crear la orden. Verifica los campos.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Cambiar estado ───────────────────────────────────────────────────────────
  const handleChangeState = async () => {
    setSaving(true)
    setFormError('')
    try {
      await purchaseApi.put(`/ordenes/${selected.id}`, {
        usuarioId: selected.usuarioId,
        estado: form.estado,
        total: selected.total,
      })
      closeModal()
      fetchAll()
    } catch {
      setFormError('Error al actualizar el estado.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Filtrado ─────────────────────────────────────────────────────────────────
  const filtered = ordenes.filter(o => {
    const lineas = lineItemsMap[String(o.id)] || []
    const matchSearch =
      lineas.some(l => productoNombre(l.productoId).toLowerCase().includes(search.toLowerCase()))
    const matchEstado = filterEstado ? o.estado === filterEstado : true
    return matchSearch && matchEstado
  })

  const stats = ESTADOS.reduce((acc, e) => {
    acc[e] = ordenes.filter(o => o.estado === e).length
    return acc
  }, {})

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ShoppingCart size={28} className="text-emerald-400" />
              <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
            </div>
            <p className="text-slate-400">Gestión del PurchaseOrderService</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <Plus size={18} />
            Nueva Orden
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {ESTADOS.map(e => (
            <div key={e} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-slate-400 text-xs mb-1">{e}</p>
              <p className="text-2xl font-bold">{stats[e] || 0}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por producto..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div className="relative">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {loading && <div className="text-center py-20 text-slate-400">Cargando órdenes...</div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm mb-4">{error}</div>}

        {!loading && !error && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="px-6 py-4 font-medium">#</th>
                  <th className="px-6 py-4 font-medium">Producto</th>
                  <th className="px-6 py-4 font-medium">Cantidad</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-500">Sin órdenes registradas</td></tr>
                ) : filtered.map((o) => {
                  const lineas = lineItemsMap[String(o.id)] || []
                  const firstLinea = lineas[0]
                  const totalCantidad = lineas.reduce((sum, l) => sum + (l.cantidad || 0), 0)

                  // ← Muestra el NOMBRE del producto, no el ID
                  const productoLabel = firstLinea
                    ? productoNombre(firstLinea.productoId) +
                      (lineas.length > 1 ? ` + ${lineas.length - 1} más` : '')
                    : '—'

                  return (
                    <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{o.id}</td>
                      <td className="px-6 py-4 text-slate-300">{productoLabel}</td>
                      <td className="px-6 py-4 text-slate-300">{totalCantidad || '—'}</td>
                      <td className="px-6 py-4 text-emerald-400 font-mono">
                        {o.total != null
                          ? `$${parseFloat(o.total).toLocaleString('es-CO')}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4"><StateBadge estado={o.estado} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openView(o)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"><Eye size={15} /></button>
                          <button onClick={() => openChangeState(o)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition text-xs font-medium px-3">
                            Estado
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Nueva Orden ─────────────────────────────────────────────────── */}
      {modal === 'create' && (
        <Modal title="Nueva Orden de Compra" onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <select
                value={form.productoId}
                onChange={(e) => handleProductoSelect(e.target.value)}
                disabled={loadingProductDetail}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              >
                <option value="">Selecciona un producto</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — Stock: {getStockDisponible(String(p.id))} unidades
                  </option>
                ))}
              </select>
              {form.productoId && (
                <div className={`mt-2 p-2 rounded-lg text-xs ${getStockDisponible(form.productoId) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                  Stock disponible: <strong>{getStockDisponible(form.productoId)}</strong> unidades
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                placeholder="Cantidad"
                type="number"
                min="1"
                max={form.productoId ? getStockDisponible(form.productoId) : undefined}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <div className="relative">
                <input
                  value={form.precioUnitario}
                  onChange={(e) => setForm({ ...form, precioUnitario: e.target.value })}
                  placeholder="Precio unitario"
                  type="number"
                  min="0"
                  disabled={loadingProductDetail}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
                />
                {loadingProductDetail && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Cargando...</span>
                )}
              </div>
            </div>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Notas adicionales (opcional)"
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
            {form.cantidad && form.precioUnitario && (
              <div className="bg-slate-800 rounded-xl p-3 text-sm">
                <span className="text-slate-400">Total estimado: </span>
                <span className="text-emerald-400 font-bold">
                  ${(parseFloat(form.precioUnitario || 0) * parseInt(form.cantidad || 0, 10)).toLocaleString('es-CO')}
                </span>
              </div>
            )}
            {form.productoId && parseInt(form.cantidad, 10) > getStockDisponible(form.productoId) && (
              <div className="flex gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>La cantidad excede el stock disponible ({getStockDisponible(form.productoId)} unidades)</span>
              </div>
            )}
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <button
              onClick={handleCreate}
              disabled={saving || loadingProductDetail || (form.productoId && parseInt(form.cantidad, 10) > getStockDisponible(form.productoId))}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-900 font-semibold p-3 rounded-xl transition"
            >
              <Check size={16} />
              {saving ? 'Creando...' : 'Crear Orden'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Ver detalle ─────────────────────────────────────────────────── */}
      {modal === 'view' && selected && (
        <Modal title={`Orden #${selected.id}`} onClose={closeModal}>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Total</span>
                <span className="text-white font-medium">
                  {selected.total != null ? `$${parseFloat(selected.total).toLocaleString('es-CO')}` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Estado</span>
                <StateBadge estado={selected.estado} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Líneas de orden</h3>

              {loadingLineas ? (
                <p className="text-slate-500 text-sm">Cargando líneas...</p>
              ) : (lineItemsMap[String(selected.id)]?.length > 0) ? (
                <div className="space-y-3">
                  {lineItemsMap[String(selected.id)].map((line) => (
                    <div key={line.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="flex justify-between items-center gap-3 text-sm mb-1">
                        {/* ← Nombre del producto, no el ID */}
                        <span className="text-white font-medium">{productoNombre(line.productoId)}</span>
                        <span className="text-slate-300">{line.cantidad} unidades</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Precio unitario</span>
                        <span>{line.precioUnitario != null ? `$${parseFloat(line.precioUnitario).toLocaleString('es-CO')}` : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Sin líneas de orden registradas.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Cambiar Estado ─────────────────────────────────────────────── */}
      {modal === 'state' && selected && (
        <Modal title="Cambiar Estado" onClose={closeModal}>
          <p className="text-slate-400 text-sm mb-4">Orden #{selected.id}</p>
          <select
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value })}
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm mb-4 focus:outline-none focus:border-emerald-500 transition"
          >
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}
          <button
            onClick={handleChangeState}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-900 font-semibold p-3 rounded-xl transition"
          >
            <Check size={16} />
            {saving ? 'Guardando...' : 'Actualizar Estado'}
          </button>
        </Modal>
      )}
    </Layout>
  )
}