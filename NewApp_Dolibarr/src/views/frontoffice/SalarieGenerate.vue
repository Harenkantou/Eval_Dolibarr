<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, bulkCreateSalary } from '@/api/dolibarr'

const router = useRouter()

const employees = ref([])
const loading   = ref(false)
const error     = ref('')
const success   = ref('')
const lastRun   = ref(null)   // résultat du dernier bulk

const today = new Date().toISOString().split('T')[0]

// ── Filtres ───────────────────────────────────────────────────
const filters = ref({
  job     : '',
  gender  : '',
  hoursMin: '',
  hoursMax: ''
})

// ── Formulaire génération ─────────────────────────────────────
const form = ref({
  amount   : '',
  dateStart: today,
  dateEnd  : today
})

// ── Liste des postes distincts (pour le select) ───────────────
const jobs = computed(() => {
  const set = new Set()
  for (const e of employees.value) {
    if (e.job) set.add(e.job)
  }
  return [...set].sort()
})

// ── Application des filtres ───────────────────────────────────
const filtered = computed(() => {
  const min = filters.value.hoursMin === '' ? -Infinity : parseFloat(filters.value.hoursMin)
  const max = filters.value.hoursMax === '' ?  Infinity : parseFloat(filters.value.hoursMax)

  return employees.value.filter(e => {
    if (filters.value.job    && e.job    !== filters.value.job)    return false
    if (filters.value.gender && e.gender !== filters.value.gender) return false
    const h = Number(e.hours) || 0
    if (h < min || h > max) return false
    return true
  })
})

const genderLabel = (g) => (g === 'man' ? '👨 Homme' : g === 'woman' ? '👩 Femme' : '—')
const money = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)

async function loadEmployees() {
  loading.value = true
  error.value   = ''
  try {
    employees.value = await getEmployees()
  } catch (e) {
    error.value = 'Erreur chargement salariés : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.value = { job: '', gender: '', hoursMin: '', hoursMax: '' }
}

async function handleGenerate() {
  error.value = ''; success.value = ''; lastRun.value = null

  const amount = parseFloat(form.value.amount)
  if (!amount || amount <= 0) { error.value = 'Montant invalide.'; return }
  if (form.value.dateEnd < form.value.dateStart) {
    error.value = 'La date de fin doit être postérieure à la date de début.'; return
  }
  if (filtered.value.length === 0) {
    error.value = 'Aucun salarié ne correspond aux filtres.'; return
  }

  const confirmed = confirm(
    `Générer un salaire de ${money(amount)} pour ${filtered.value.length} salarié(s) ?`
  )
  if (!confirmed) return

  loading.value = true
  try {
    const userIds = filtered.value.map(e => e.id)
    const results = await bulkCreateSalary(userIds, {
      amount,
      dateStart: form.value.dateStart,
      dateEnd  : form.value.dateEnd
    })

    const ok = results.filter(r => r.success).length
    const ko = results.filter(r => !r.success).length
    lastRun.value = { ok, ko, results }

    if (ko === 0) {
      success.value = `${ok} salaire(s) généré(s) avec succès.`
      form.value.amount = ''
    } else {
      error.value = `${ok} succès, ${ko} échec(s). Voir le détail ci-dessous.`
    }
  } catch (e) {
    error.value = 'Erreur globale : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

const nameOf = (userId) => {
  const e = employees.value.find(x => x.id === userId)
  return e?.name || `#${userId}`
}

function goBack() {
  router.push({ name: 'frontoffice-home' })
}

onMounted(loadEmployees)
</script>

<template>
  <div class="salarie-generate">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <h1>Générer des salaires en masse</h1>
    </header>

    <!-- ── Filtres ───────────────────────────────────────── -->
    <section class="card">
      <h2>Filtres de sélection</h2>
      <div class="filter-grid">
        <div class="form-group">
          <label>Poste</label>
          <select v-model="filters.job">
            <option value="">Tous</option>
            <option v-for="j in jobs" :key="j" :value="j">{{ j }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Genre</label>
          <select v-model="filters.gender">
            <option value="">Tous</option>
            <option value="man">Homme</option>
            <option value="woman">Femme</option>
          </select>
        </div>

        <div class="form-group">
          <label>Heures min / semaine</label>
          <input type="number" min="0" v-model="filters.hoursMin" placeholder="Ex: 20" />
        </div>

        <div class="form-group">
          <label>Heures max / semaine</label>
          <input type="number" min="0" v-model="filters.hoursMax" placeholder="Ex: 40" />
        </div>

        <button @click="clearFilters" class="btn-clear">Réinitialiser</button>
      </div>
    </section>

    <!-- ── Aperçu ────────────────────────────────────────── -->
    <section class="card">
      <div class="preview-header">
        <h2>Salariés sélectionnés</h2>
        <span class="counter">{{ filtered.length }} / {{ employees.length }}</span>
      </div>

      <div v-if="loading && employees.length === 0" class="loading">Chargement…</div>

      <table v-else-if="filtered.length" class="data-table">
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Nom</th>
            <th>Poste</th>
            <th>Genre</th>
            <th>Heures/sem.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in filtered" :key="e.id">
            <td>{{ e.ref ?? '-' }}</td>
            <td class="name-cell">{{ e.name }}</td>
            <td>{{ e.job || '-' }}</td>
            <td>{{ genderLabel(e.gender) }}</td>
            <td>{{ e.hours ?? '-' }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">Aucun salarié ne correspond aux filtres.</div>
    </section>

    <!-- ── Formulaire génération ─────────────────────────── -->
    <section class="card">
      <h2>Paramètres du salaire à générer</h2>

      <form @submit.prevent="handleGenerate" class="gen-form">
        <div class="form-row">
          <div class="form-group">
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="0.01"
                   v-model="form.amount" placeholder="0.00" required />
          </div>
          <div class="form-group">
            <label>Date début</label>
            <input type="date" v-model="form.dateStart" required />
          </div>
          <div class="form-group">
            <label>Date fin</label>
            <input type="date" v-model="form.dateEnd" required />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit"
                  :disabled="loading || filtered.length === 0"
                  class="btn-generate">
            {{ loading ? 'Génération…' : `Générer ${filtered.length} salaire(s)` }}
          </button>
        </div>
      </form>

      <div v-if="error"   class="alert error">{{ error }}</div>
      <div v-if="success" class="alert success">{{ success }}</div>

      <!-- ── Résultat détaillé ────────────────────────────── -->
      <div v-if="lastRun" class="run-result">
        <h3>Résultat</h3>
        <p><strong>{{ lastRun.ok }}</strong> succès · <strong>{{ lastRun.ko }}</strong> échec(s)</p>
        <details v-if="lastRun.ko > 0">
          <summary>Voir les échecs</summary>
          <ul>
            <li v-for="(r, i) in lastRun.results.filter(x => !x.success)" :key="i">
              {{ nameOf(r.userId) }} → {{ r.error }}
            </li>
          </ul>
        </details>
      </div>
    </section>
  </div>
</template>

<style scoped>
.salarie-generate {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1e293b;
}

.btn-back {
  padding: 0.5rem 1rem;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #475569;
}
.btn-back:hover { background: #e2e8f0; }

.card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.card h2 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  color: #1e293b;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  gap: 1rem;
  align-items: end;
}

.form-group { display: flex; flex-direction: column; gap: 0.375rem; }

.form-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
}

.form-group input,
.form-group select {
  padding: 0.625rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-clear {
  padding: 0.625rem 1rem;
  background: #e2e8f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #475569;
  font-size: 0.875rem;
}
.btn-clear:hover { background: #cbd5e1; }

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.preview-header h2 { margin: 0; }

.counter {
  padding: 0.25rem 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #64748b;
}

.name-cell { font-weight: 500; color: #1e293b; }

.loading, .empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.gen-form { display: flex; flex-direction: column; gap: 1rem; }

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-generate {
  padding: 0.75rem 1.75rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
}
.btn-generate:hover:not(:disabled) { background: #059669; }
.btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }

.alert {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}
.alert.success { background: #dcfce7; color: #16a34a; }
.alert.error   { background: #fee2e2; color: #dc2626; }

.run-result {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
}
.run-result h3 { margin: 0 0 0.5rem; font-size: 0.95rem; }
.run-result ul { margin: 0.5rem 0 0 1rem; }

@media (max-width: 900px) {
  .filter-grid, .form-row { grid-template-columns: 1fr; }
}
</style>