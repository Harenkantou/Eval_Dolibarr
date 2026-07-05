import axios from 'axios'

const DOLIBARR_URL = 'https://dolibarr23.com/api/index.php'
const API_KEY = 'bz5Z31xQf2xoJcOPTh04j3P43xKaFYV1'

const api = axios.create({
  baseURL: DOLIBARR_URL,
  headers: {
    'DOLAPIKEY': API_KEY,
    'Accept': 'application/json'
  }
})

// ========== SALARIES ==========

export async function getSalaries(filters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.append('sortfield', 't.lastname')
  if (filters.limit) params.append('limit', filters.limit)
  if (filters.page) params.append('page', filters.page)

  const { data } = await api.get('/salaries', { params })
  return data
}

export async function getSalarie(id) {
  const { data } = await api.get(`/salaries/${id}`)
  return data
}

export async function createSalarie(salarie) {
  const { data } = await api.post('/salaries', salarie)
  return data
}

export async function updateSalarie(id, salarie) {
  const { data } = await api.put(`/salaries/${id}`, salarie)
  return data
}

// ========== SALAIRES (PAYMENTS) ==========

export async function getSalariesPayments(salarieId) {
  const { data } = await api.get(`/salaries/${salarieId}/payments`)
  return data
}

export async function createSalairePayment(salarieId, payment) {
  const { data } = await api.post(`/salaries/${salarieId}/payments`, payment)
  return data
}

// ========== USERS (pour récupérer infos liées aux salaries) ==========

export async function getUsers() {
  const { data } = await api.get('/users', {
    params: { mode: 1 } // mode 1 = liste courte
  })
  return data
}

export async function getUser(id) {
  const { data } = await api.get(`/users/${id}`)
  return data
}

// ========== TIERS (tiers/sociétés) ==========

export async function getThirdParties(type = '') {
  const params = {}
  if (type) params.type = type
  const { data } = await api.get('/thirdparties', { params })
  return data
}

export default api
