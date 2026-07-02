// src/services/http.js
// ─────────────────────────────────────────────────────────────
// Client Axios partagé entre importService et resetService.
// La clé API est injectée automatiquement dans chaque requête.
// ─────────────────────────────────────────────────────────────
import axios from 'axios'

const http = axios.create({
  // /api → redirigé vers Dolibarr via le proxy Vite
  baseURL: '/api/index.php',
  headers: {
    'DOLAPIKEY'   : import.meta.env.VITE_DOLIBARR_API_KEY,
    'Content-Type': 'application/json',
    'Accept'      : 'application/json'
  }
})

// Intercepteur de réponse pour logger les erreurs proprement
http.interceptors.response.use(
  response => response,
  error => {
    console.error(
      '[HTTP Error]',
      error.response?.status,
      error.response?.data || error.message
    )
    return Promise.reject(error)
  }
)

export default http