// Todas las peticiones pasan por el API Gateway (nunca directo a un microservicio).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
  return data
}

export const api = {
  health: () => Promise.all([
    request('/api/catalog/health'),
    request('/api/library/health'),
  ]),
  collections: () => request('/api/catalog/collections'),
  resources: (collection = '') =>
    request(`/api/catalog/resources?limit=10${collection ? `&collection=${collection}` : ''}`),
  users: (rol = '') => request(`/api/library/users?limit=10${rol ? `&rol=${rol}` : ''}`),
  loans: () => request('/api/library/loans?limit=10'),
  createLoan: (body) => request('/api/library/loans', { method: 'POST', body: JSON.stringify(body) }),
  returnLoan: (id) => request(`/api/library/loans/${id}/return`, { method: 'POST' }),
}
