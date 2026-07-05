// src/services/dashboardService.js
// ─────────────────────────────────────────────────────────────
// Statistiques du Dashboard BackOffice (énoncé J1 — point 1.d) :
//   → le montant de salaire par GENRE
//   → le montant de salaire par MOIS (date de règlement comme référence)
//
// Communication 100% via API Dolibarr :
//   → GET /users     (pour récupérer le genre de chaque employé)
//   → GET /salaries  (pour récupérer les salaires + montants réglés)
//
// ⚠️ Particularité du projet :
//   Les paiements ne sont PAS stockés comme paiements Dolibarr réels
//   (le champ `datep` est vide, l'endpoint /salaries/{id}/payments = 404).
//   Le détail des règlements est encodé dans le `label` du salaire par
//   importService.createSalary(), au format :
//       "... (JJ/MM/AAAA: 480€ | JJ/MM/AAAA: 300€)"
//   On parse donc le label pour retrouver la date de règlement.
// ─────────────────────────────────────────────────────────────
import http from './http'

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════

const errMsg = (err) =>
  err.response?.data?.error?.message ||
  err.response?.data?.error ||
  err.message

/**
 * Extrait les règlements encodés dans le label d'un salaire.
 *
 * Cherche tous les motifs "JJ/MM/AAAA: montant" (le symbole € est ignoré
 * pour éviter les soucis d'encodage). Les dates de la période
 * ("du 01/03/2026 au 08/03/2026") ne matchent pas car elles ne sont
 * jamais suivies de ": montant".
 *
 * @param  {string} label
 * @returns {Array<{ month: string, date: Date, amount: number }>}
 *          month au format "AAAA-MM" (triable).
 */
export const extractPayments = (label = '') => {
  const regex = /(\d{2})\/(\d{2})\/(\d{4})\s*:\s*([\d.,]+)/g
  const payments = []

  for (const [, day, month, year, rawAmount] of label.matchAll(regex)) {
    const amount = parseFloat(rawAmount.replace(',', '.')) || 0
    payments.push({
      month : `${year}-${month}`,
      date  : new Date(`${year}-${month}-${day}`),
      amount
    })
  }

  return payments
}

// ═════════════════════════════════════════════════════════════
// CHARGEMENT DES DONNÉES BRUTES (API Dolibarr)
// ═════════════════════════════════════════════════════════════

/**
 * Map { id Dolibarr → { gender, name, ref } } pour retrouver le genre
 * d'un salaire via son fk_user.
 */
const getUsersById = async () => {
  const res = await http.get('/users', { params: { limit: 500 } })
  const map = {}
  for (const u of res.data || []) {
    map[u.id] = {
      gender: u.gender,                                   // 'man' | 'woman' | null
      name  : u.lastname,
      ref   : u.array_options?.options_ref_employe || null
    }
  }
  return map
}

/** Récupère tous les salaires (404 = aucune donnée → tableau vide). */
export const getSalaries = async () => {
  try {
    const res = await http.get('/salaries', { params: { limit: 500 } })
    return res.data || []
  } catch (e) {
    if (e.response?.status === 404) return []
    throw e
  }
}

// ═════════════════════════════════════════════════════════════
// AGRÉGATIONS (fonctions PURES → testables sans réseau)
// ═════════════════════════════════════════════════════════════

/**
 * Montant total de salaire par genre.
 * Utilise le montant DÛ (salary.amount), groupé selon le genre de l'employé.
 *
 * @param  {Object[]} salaries   - salaires bruts de l'API
 * @param  {Object}   usersById  - map issue de getUsersById()
 * @returns {{ man: number, woman: number, unknown: number }}
 */
export const salaryByGender = (salaries, usersById) => {
  const totals = { man: 0, woman: 0, unknown: 0 }

  for (const s of salaries) {
    const amount = parseFloat(s.amount) || 0
    const gender = usersById[s.fk_user]?.gender

    if (gender === 'man')        totals.man   += amount
    else if (gender === 'woman') totals.woman += amount
    else                         totals.unknown += amount
  }

  return totals
}

/**
 * Montant de salaire RÉGLÉ par mois (date de règlement comme référence).
 * Additionne chaque paiement dans le mois où il a été réglé.
 *
 * @param  {Object[]} salaries - salaires bruts de l'API
 * @returns {Array<{ month: string, label: string, total: number }>}
 *          Trié par ordre chronologique croissant.
 */
export const salaryByMonth = (salaries) => {
  const byMonth = {}

  for (const s of salaries) {
    for (const p of extractPayments(s.label)) {
      byMonth[p.month] = (byMonth[p.month] || 0) + p.amount
    }
  }

  const MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
                'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => {
      const [year, m] = month.split('-')
      return {
        month,                                     // "2026-03"
        label: `${MOIS[parseInt(m) - 1]} ${year}`, // "Mars 2026"
        total: Math.round(total * 100) / 100
      }
    })
}

// ═════════════════════════════════════════════════════════════
// POINT D'ENTRÉE UNIQUE POUR LE DASHBOARD
// ═════════════════════════════════════════════════════════════

/**
 * Charge et agrège toutes les statistiques nécessaires au Dashboard.
 *
 * @returns {Promise<{
 *   byGender: { man, woman, unknown },
 *   byMonth : Array<{ month, label, total }>,
 *   totalSalaries: number,
 *   totalAmount  : number
 * }>}
 */
export const getDashboardStats = async () => {
  const [salaries, usersById] = await Promise.all([
    getSalaries(),
    getUsersById()
  ])

  const byGender = salaryByGender(salaries, usersById)
  const byMonth  = salaryByMonth(salaries)

  return {
    byGender,
    byMonth,
    totalSalaries: salaries.length,
    totalAmount  : Math.round((byGender.man + byGender.woman + byGender.unknown) * 100) / 100
  }
}

// Utilitaire exposé pour la vue (formatage monétaire homogène)
export const formatMoney = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(Number(n) || 0)
