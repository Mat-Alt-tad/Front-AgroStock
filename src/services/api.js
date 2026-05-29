import axios from 'axios'

const SERVICE_ROOTS = {
  auth: import.meta.env.VITE_AUTH_URL || 'http://localhost:8083',
  product: import.meta.env.VITE_PRODUCT_URL || 'http://localhost:8084',
  inventory: import.meta.env.VITE_INVENTORY_URL || 'http://localhost:8082',
  purchase: import.meta.env.VITE_PURCHASE_URL || 'http://localhost:8085',
}

const SERVICE_API = {
  auth: (SERVICE_ROOTS.auth + '/api'),
  product: (SERVICE_ROOTS.product + '/api'),
  inventory: (SERVICE_ROOTS.inventory + '/api'),
  purchase: (SERVICE_ROOTS.purchase + '/api'),
}

const AUTH_STORAGE_KEYS = {
  token: 'token',
  userName: 'userName',
  userRole: 'userRole',
  userEmail: 'userEmail',
}

export function getToken() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.token)
}

export function getUserName() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.userName) || ''
}

export function getUserRole() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.userRole) || ''
}

export function getAuthRedirectPath() {
  return getUserRole() === 'ADMIN' ? '/dashboard' : '/user'
}

export function setSession({ token, userName, userRole, userEmail }) {
  localStorage.setItem(AUTH_STORAGE_KEYS.token, token)
  localStorage.setItem(AUTH_STORAGE_KEYS.userName, userName || '')
  localStorage.setItem(AUTH_STORAGE_KEYS.userRole, userRole || '')
  localStorage.setItem(AUTH_STORAGE_KEYS.userEmail, userEmail || '')
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token)
  localStorage.removeItem(AUTH_STORAGE_KEYS.userName)
  localStorage.removeItem(AUTH_STORAGE_KEYS.userRole)
  localStorage.removeItem(AUTH_STORAGE_KEYS.userEmail)
}

function createApi(baseURL) {
  const instance = axios.create({ baseURL })

  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) {
        clearSession()
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
        console.warn('Token inválido o expirado — la sesión ha sido cerrada')
      }
      return Promise.reject(err)
    }
  )

  return instance
}

export const authApi = createApi(SERVICE_API.auth)
export const productApi = createApi(SERVICE_API.product)
export const inventoryApi = createApi(SERVICE_API.inventory)
export const purchaseApi = createApi(SERVICE_API.purchase)

export const serviceRoots = SERVICE_ROOTS

export default createApi
