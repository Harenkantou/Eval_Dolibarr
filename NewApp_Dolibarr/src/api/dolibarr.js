// src/api/dolibarr.js
// ─────────────────────────────────────────────────────────────
// Couche d'accès API pour le FrontOffice (liste + paiement salaires).
//
// Réutilise le client Axios partagé (src/services/http.js) :
//   → baseURL '/api/index.php'  (proxy Vite → http://localhost/dolibarr23/api)
//   → clé DOLAPIKEY injectée depuis .env (VITE_DOLIBARR_API_KEY)
//
// ⚠️ Modèle de données RÉEL de ce projet :
//   • Un « salarié »        = un utilisateur Dolibarr importé (/users)
//                             reconnaissable à l'extrafield `ref_employe`.
//   • Un « salaire »        = une fiche /salaries (fk_user, amount, label…).
//   • Les PAIEMENTS ne sont PAS des paiements Dolibarr réels
//     (pas d'endpoint /salaries/{id}/payments, champ `paye` ignoré).
//     → Ils sont encodés dans le `label`, au format d'importService :
//         "Salaire du .. au .. — Payé: 780€/780€ (08/03/2026: 480€ | 08/03/2026: 300€)"
//     → On paie « en plusieurs fois » en ré-écrivant ce label via PUT.
// ─────────────────────────────────────────────────────────────
import api from '@/services/http'

// ═════════════════════════════════════════════════════════════
// HELPERS — dates & montants
// ═════════════════════════════════════════════════════════════

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** "2026-03-08" (input date) → timestamp Unix en secondes */
const isoToTs = (iso) => Math.floor(new Date(`${iso}T00:00:00`).getTime() / 1000)

/** "2026-03-08" (input date) → "08/03/2026" */
const isoToFr = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** timestamp Unix (s) → "08/03/2026" */
const tsToFr = (ts) => {
  const d = new Date(Number(ts) * 1000)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ═════════════════════════════════════════════════════════════
// HELPERS — encodage / décodage du label (source de vérité)
// ═════════════════════════════════════════════════════════════

/**
 * Extrait les règlements encodés dans un label.
 * Cherche les motifs "JJ/MM/AAAA: montant" (les dates de période
 * "du 01/03/2026 au 08/03/2026" ne matchent pas, pas de ": montant").
 *
 * @returns {Array<{ date: string, amount: number }>} date au format "JJ/MM/AAAA"
 */
export const parsePaymentsFromLabel = (label = '') => {
  const out = []
  for (const [, d, m, y, amt] of label.matchAll(/(\d{2})\/(\d{2})\/(\d{4})\s*:\s*([\d.,]+)/g)) {
    out.push({ date: `${d}/${m}/${y}`, amount: parseFloat(amt.replace(',', '.')) || 0 })
  }
  return out
}

/** Partie « base » du label (avant " — Payé:"). */
const baseOfLabel = (label = '') => (label.split(' — Payé:')[0] || '').trim()

/** Reconstruit le label complet (format identique à importService). */
const buildLabel = (baseLabel, amount, payments) => {
  const totalPaye = round2(payments.reduce((s, p) => s + p.amount, 0))
  const detail = payments.length
    ? payments.map(p => `${p.date}: ${p.amount}€`).join(' | ')
    : 'aucun paiement'
  return `${baseLabel} — Payé: ${totalPaye}€/${amount}€ (${detail})`
}

// ═════════════════════════════════════════════════════════════
// NORMALISATION
// ═════════════════════════════════════════════════════════════

/** Utilisateur Dolibarr → salarié « métier ». */
const normalizeEmployee = (u) => ({
  id    : u.id,
  ref   : u.array_options?.options_ref_employe ?? null,
  name  : u.lastname || u.login || `#${u.id}`,
  login : u.login,
  gender: u.gender,     // 'man' | 'woman' | null
  hours : u.array_options?.options_heure_travail_semaine ?? null,
  job   : u.job || u.array_options?.options_poste || null
})

/** Fiche /salaries → salaire « métier » (paiements décodés). */
const normalizeSalary = (s) => {
  const amount    = parseFloat(s.amount) || 0
  const payments  = parsePaymentsFromLabel(s.label)
  const totalPaye = round2(payments.reduce((a, p) => a + p.amount, 0))
  return {
    id       : s.id,
    fk_user  : parseInt(s.fk_user),
    amount,
    datesp   : s.datesp,
    dateep   : s.dateep,
    baseLabel: baseOfLabel(s.label),
    rawLabel : s.label,
    payments,                                             // [{ date, amount }]
    totalPaye,
    reste    : round2(amount - totalPaye),
    solde    : totalPaye >= amount                        // statut déduit du label
  }
}

// ═════════════════════════════════════════════════════════════
// SALARIÉS (employés importés)
// ═════════════════════════════════════════════════════════════

/** Liste des salariés (utilisateurs ayant un `ref_employe`). */
export async function getEmployees() {
  const { data } = await api.get('/users', { params: { limit: 500 } })
  return (data || [])
    .filter(u => u.array_options?.options_ref_employe)
    .map(normalizeEmployee)
}

/** Un salarié par son id Dolibarr. */
export async function getEmployee(id) {
  const { data } = await api.get(`/users/${id}`)
  return normalizeEmployee(data)
}

// ═════════════════════════════════════════════════════════════
// SALAIRES
// ═════════════════════════════════════════════════════════════

/** Tous les salaires (normalisés). 404 = aucune donnée → []. */
export async function getSalaries() {
  try {
    const { data } = await api.get('/salaries', { params: { limit: 500 } })
    return (data || []).map(normalizeSalary)
  } catch (e) {
    if (e.response?.status === 404) return []
    throw e
  }
}

/** Salaires d'un salarié donné. */
export async function getEmployeeSalaries(userId) {
  const all = await getSalaries()
  return all.filter(s => s.fk_user === parseInt(userId))
}

/**
 * Crée un nouveau salaire pour un salarié (sans paiement au départ).
 * @param {{ fk_user:number, amount:number, dateStart:string, dateEnd:string }} p
 *        dateStart / dateEnd au format "YYYY-MM-DD".
 * @returns {Promise<number>} id du salaire créé
 */
export async function createSalary({ fk_user, amount, dateStart, dateEnd }) {
  const amt       = round2(amount)
  const baseLabel = `Salaire du ${isoToFr(dateStart)} au ${isoToFr(dateEnd)}`
  const label     = buildLabel(baseLabel, amt, [])

  const { data } = await api.post('/salaries', {
    fk_user,
    amount: amt,
    datesp: isoToTs(dateStart),
    dateep: isoToTs(dateEnd),
    label,
    paye  : 0
  })
  return data
}

/**
 * Ajoute un paiement à un salaire (paiement en plusieurs fois).
 * Relit le salaire, ajoute le règlement au label, puis PUT.
 *
 * @param {number|string} salaryId
 * @param {{ date:string, amount:number }} payment  date au format "YYYY-MM-DD"
 * @returns {Promise<Object>} salaire normalisé à jour
 */
export async function addPayment(salaryId, payment) {
  const { data: s } = await api.get(`/salaries/${salaryId}`)

  const amount   = parseFloat(s.amount) || 0
  const payments = parsePaymentsFromLabel(s.label)
  payments.push({ date: isoToFr(payment.date), amount: round2(payment.amount) })

  const baseLabel = baseOfLabel(s.label) || `Salaire du ${tsToFr(s.datesp)} au ${tsToFr(s.dateep)}`
  const label     = buildLabel(baseLabel, amount, payments)
  const totalPaye = round2(payments.reduce((a, p) => a + p.amount, 0))

  await api.put(`/salaries/${salaryId}`, {
    label,
    paye: totalPaye >= amount ? 1 : 0   // envoyé par cohérence (ignoré par l'API)
  })

  return normalizeSalary({ ...s, label })
}

// ═════════════════════════════════════════════════════════════
// GÉNÉRATION EN MASSE (J2 FrontOffice)
// ═════════════════════════════════════════════════════════════

/**
 * Crée un salaire pour chaque userId de la liste.
 * Séquentiel volontaire : évite de saturer l'API Dolibarr locale.
 *
 * @param {number[]} userIds
 * @param {{ amount:number, dateStart:string, dateEnd:string }} params
 * @returns {Promise<Array<{ userId, success, salaryId?, error? }>>}
 */
export async function bulkCreateSalary(userIds, { amount, dateStart, dateEnd }) {
  const results = []
  for (const id of userIds) {
    try {
      const salaryId = await createSalary({
        fk_user: id, amount, dateStart, dateEnd
      })
      results.push({ userId: id, success: true, salaryId })
    } catch (err) {
      results.push({
        userId: id,
        success: false,
        error: err.response?.data?.error?.message || err.message
      })
    }
  }
  return results
}

export default api
