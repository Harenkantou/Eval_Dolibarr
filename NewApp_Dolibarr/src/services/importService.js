// src/services/importService.js
// ─────────────────────────────────────────────────────────────
// Import avec LOI DU TOUT OU RIEN :
//   → On garde en mémoire les IDs Dolibarr créés
//   → Si UNE erreur survient : rollback (suppression de tout)
//   → Aucune donnée partielle n'est laissée dans Dolibarr
// ─────────────────────────────────────────────────────────────
import http from './http'
import { parseCSV, transformEmployees, transformSalaries } from '@/utils/csvParser'

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════

const errMsg = (err) =>
  err.response?.data?.error?.message ||
  err.response?.data?.error ||
  err.message

const readText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload  = e => resolve(e.target.result)
  r.onerror = reject
  r.readAsText(file)
})

// Formate un timestamp Unix → "JJ/MM/AAAA" (pour les notes)
/*const tsToDateStr = (ts) => {
  if (!ts) return '?'
  const d = new Date(ts * 1000)
  return `${String(d.getDate()).padStart(2, '0')}/`
       + `${String(d.getMonth() + 1).padStart(2, '0')}/`
       + `${d.getFullYear()}`
}

// Construit la note privée listant les paiements
const buildPaymentNote = (payments, totalPaye) => {
  if (!payments.length) return 'Paiements : aucun — Total payé : 0€'
  const detail = payments
    .map(p => `${tsToDateStr(p.date_paye)} : ${p.amount}€`)
    .join(' | ')
  return `Paiements : ${detail} — Total payé : ${totalPaye}€`
}*/

// ═════════════════════════════════════════════════════════════
// COMPTE BANCAIRE PAR DÉFAUT (pour les paiements de salaire)
// ═════════════════════════════════════════════════════════════

/*let cachedAccountId = null

const getDefaultAccountId = async () => {
  if (cachedAccountId) return cachedAccountId

  const res      = await http.get('/bankaccounts', { params: { limit: 10 } })
  const accounts = res.data || []

  if (!accounts.length) {
    throw new Error('Aucun compte bancaire configuré dans Dolibarr. Créez-en un dans Banques & Caisses.')
  }

  cachedAccountId = accounts[0].id
  return cachedAccountId
}*/

// ═════════════════════════════════════════════════════════════
// ROLLBACK — supprime les entités créées si une erreur survient
// ═════════════════════════════════════════════════════════════

const rollback = async (created) => {
  console.warn('[Rollback] Suppression des données partielles...')

  // Ordre inverse de création : salaires d'abord, puis users
  for (const id of created.salaries) {
    try { await http.delete(`/salaries/${id}`) }
    catch (e) { console.error(`[Rollback] salaire ${id}:`, errMsg(e)) }
  }
  for (const id of created.users) {
    try { await http.delete(`/users/${id}`) }
    catch (e) { console.error(`[Rollback] user ${id}:`, errMsg(e)) }
  }
  for (const path of created.documents) {
    try {
      await http.delete(`/documents`, {
        params: { modulepart: 'medias', original_file: path }
      })
    } catch (e) { console.error(`[Rollback] doc ${path}:`, errMsg(e)) }
  }
}

// ═════════════════════════════════════════════════════════════
// CRÉATION D'UN SALAIRE (fonction partagée)
// ═════════════════════════════════════════════════════════════

const createSalary = async (sal, userId) => {
  const totalPaye = sal.payments.reduce((sum, p) => sum + p.amount, 0)
  const estPaye   = totalPaye >= sal.amount ? 1 : 0

  const detailPaiements = sal.payments.length > 0
    ? sal.payments.map(p => {
        const d = new Date(p.date_paye * 1000)
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}: ${p.amount}€`
      }).join(' | ')
    : 'aucun paiement'

  const labelComplet = `${sal.label} — Payé: ${totalPaye}€/${sal.amount}€ (${detailPaiements})`

  const res = await http.post('/salaries', {
    fk_user: userId,
    amount : sal.amount,
    datesp : sal.date_start,
    dateep : sal.date_end,
    label  : labelComplet,
    paye   : estPaye
  })

  return res.data.id || res.data
}

// ═════════════════════════════════════════════════════════════
// MAP ref_employe → id Dolibarr
// ═════════════════════════════════════════════════════════════

const getUsersMap = async () => {
  const res = await http.get('/users', { params: { limit: 500 } })
  const map = {}
  for (const u of res.data || []) {
    const ref = u.array_options?.options_ref_employe
    if (ref) map[parseInt(ref)] = u.id
  }
  return map
}

// ═════════════════════════════════════════════════════════════
// IMPORT EMPLOYÉS
// ═════════════════════════════════════════════════════════════

export const importEmployees = async (csvContent, onProgress = null) => {
  const employees  = transformEmployees(parseCSV(csvContent))
  const createdIds = []

  try {
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]

      const res = await http.post('/users', {
        login        : emp.login,
        lastname     : emp.lastname,
        gender       : emp.gender,
        password     : emp.password,
        array_options: emp.array_options
      })

      createdIds.push(res.data.id || res.data)
      if (onProgress) onProgress({ current: i + 1, total: employees.length })
    }

    return { success: true, created: createdIds.length, ids: createdIds }

  } catch (err) {
    await rollback({ salaries: [], users: createdIds, documents: [] })
    return {
      success   : false,
      created   : 0,
      rolledBack: createdIds.length,
      error     : errMsg(err)
    }
  }
}

// ═════════════════════════════════════════════════════════════
// IMPORT SALAIRES
// ═════════════════════════════════════════════════════════════

export const importSalaries = async (csvContent, onProgress = null) => {
  const salaries         = transformSalaries(parseCSV(csvContent))
  const createdSalaryIds = []

  try {
    const usersMap = await getUsersMap()

    for (let i = 0; i < salaries.length; i++) {
      const sal    = salaries[i]
      const userId = usersMap[sal.fk_user]

      if (!userId) throw new Error(`Employé ref=${sal.fk_user} introuvable`)

      const salaryId = await createSalary(sal, userId)
      createdSalaryIds.push(salaryId)

      if (onProgress) onProgress({ current: i + 1, total: salaries.length })
    }

    return { success: true, created: createdSalaryIds.length, ids: createdSalaryIds }

  } catch (err) {
    await rollback({ salaries: createdSalaryIds, users: [], documents: [] })
    return {
      success   : false,
      created   : 0,
      rolledBack: createdSalaryIds.length,
      error     : errMsg(err)
    }
  }
}

// ═════════════════════════════════════════════════════════════
// IMPORT IMAGES (ZIP)
// ═════════════════════════════════════════════════════════════

export const importImages = async (zipFile, onProgress = null) => {
  const JSZip = (await import('jszip')).default
  const zip   = await JSZip.loadAsync(zipFile)

  const files = Object.entries(zip.files).filter(
    ([name, f]) => !f.dir && /\.(jpe?g|png|gif|webp)$/i.test(name)
  )

  const uploaded = []

  try {
    // Récupérer la map ref_employe → id Dolibarr
    const usersMap = await getUsersMap()

    for (let i = 0; i < files.length; i++) {
      const [filename, file] = files[i]

      // Extraire le ref_employe du nom de fichier ("3.png" → 3)
      const refEmploye = parseInt(filename.split('.')[0])
      const userId     = usersMap[refEmploye]

      if (!userId) {
        throw new Error(`Image "${filename}" : employé ref=${refEmploye} introuvable`)
      }

      const blob = await file.async('blob')

      const formData = new FormData()
      formData.append('filename'         , filename)
      formData.append('file'             , blob, filename)
      formData.append('overwriteifexists', '1')
      formData.append('modulepart'       , 'medias')
      formData.append('subdir'   , `image/users/${userId}`)   // ← lie le fichier au user

      await http.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      uploaded.push(`image/users/${userId}/${filename}`)     // ← stocke le chemin complet pour le rollback
      if (onProgress) onProgress({ current: i + 1, total: files.length })
    }

    return { success: true, created: uploaded.length, files: uploaded }

  } catch (err) {
    await rollback({ salaries: [], users: [], documents: uploaded })
    return {
      success   : false,
      created   : 0,
      rolledBack: uploaded.length,
      error     : errMsg(err)
    }
  }
}

// ═════════════════════════════════════════════════════════════
// IMPORT COMPLET (tout ou rien global)
// ═════════════════════════════════════════════════════════════

export const importAll = async (empFile, salFile, zipFile, onProgress = null) => {
  const allCreated = { salaries: [], users: [], documents: [] }

  try {
    // ── 1. Employés ──────────────────────────────────────────
    const empContent = await readText(empFile)
    const employees  = transformEmployees(parseCSV(empContent))

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      const res = await http.post('/users', {
        login        : emp.login,
        lastname     : emp.lastname,
        gender       : emp.gender,
        password     : emp.password,
        array_options: emp.array_options
      })
      allCreated.users.push(res.data.id || res.data)
      if (onProgress) onProgress({ step: 'employees', current: i + 1, total: employees.length })
    }

    // ── 2. Salaires ──────────────────────────────────────────
    const salContent = await readText(salFile)
    const salaries   = transformSalaries(parseCSV(salContent))
    const usersMap   = await getUsersMap()

    for (let i = 0; i < salaries.length; i++) {
      const sal    = salaries[i]
      const userId = usersMap[sal.fk_user]

      if (!userId) throw new Error(`Employé ref=${sal.fk_user} introuvable`)

      const salaryId = await createSalary(sal, userId)
      allCreated.salaries.push(salaryId)

      if (onProgress) onProgress({ step: 'salaries', current: i + 1, total: salaries.length })
    }

    // ── 3. Images (optionnel) ────────────────────────────────
    if (zipFile) {
      const JSZip = (await import('jszip')).default
      const zip   = await JSZip.loadAsync(zipFile)
      const files = Object.entries(zip.files).filter(
        ([n, f]) => !f.dir && /\.(jpe?g|png|gif|webp)$/i.test(n)
      )

      for (let i = 0; i < files.length; i++) {
        const [filename, file] = files[i]

        const refEmploye = parseInt(filename.split('.')[0])
        const userId     = usersMap[refEmploye]

        if (!userId) {
          throw new Error(`Image "${filename}" : employé ref=${refEmploye} introuvable`)
        }

        const blob = await file.async('blob')
        const fd   = new FormData()
        fd.append('filename'  , filename)
        fd.append('file'      , blob, filename)
        fd.append('overwriteifexists' , '1')
        fd.append('modulepart'       , 'medias')
        fd.append('subdir'           , `image/users/${userId}`)

        await http.post('/documents/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        allCreated.documents.push(`image/users/${userId}/${filename}`)
        if (onProgress) onProgress({ step: 'images', current: i + 1, total: files.length })
      }
    }

    return {
      success  : true,
      users    : allCreated.users.length,
      salaries : allCreated.salaries.length,
      documents: allCreated.documents.length
    }

  } catch (err) {
    await rollback(allCreated)
    return {
      success   : false,
      error     : errMsg(err),
      rolledBack: {
        users    : allCreated.users.length,
        salaries : allCreated.salaries.length,
        documents: allCreated.documents.length
      }
    }
  }
}