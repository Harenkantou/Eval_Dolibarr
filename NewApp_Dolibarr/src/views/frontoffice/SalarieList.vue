<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries } from '@/api/dolibarr'
import { buildEmployeeStats, filterEmployeeRows } from '@/services/salaryListService'
import { money, genderLabel } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref(null)

// ── Recherche multi-critères ──────────────────────────────────
const filters = ref({
  search: '',   // nom / login / référence
  gender: '',   // '', 'man', 'woman'
  status: ''    // '', 'solde', 'encours'
})

// ── Vues dérivées (logique dans salaryListService) ────────────
const rows         = computed(() => buildEmployeeStats(employees.value, salaries.value))
const filteredRows = computed(() => filterEmployeeRows(rows.value, filters.value))

async function loadData() {
  loading.value = true
  error.value   = null
  try {
    const [emp, sal] = await Promise.all([getEmployees(), getSalaries()])
    employees.value = emp
    salaries.value  = sal
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

function goToPay(userId) {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

function clearFilters() {
  filters.value = { search: '', gender: '', status: '' }
}

onMounted(loadData)
</script>

<template>
  <div class="salarie-list">
    <header class="page-header">
      <h1>Liste des Salariés</h1>
      <div class="header-actions">
        <button @click="router.push({ name: 'frontoffice-home' })" class="btn-clear">← Accueil</button>
        <button @click="loadData" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Chargement…' : 'Actualiser' }}
        </button>
      </div>
    </header>

    <!-- Recherche multi-critères -->
    <div class="filters">
      <div class="filter-group">
        <label for="search">Recherche</label>
        <input
          id="search"
          type="text"
          v-model="filters.search"
          placeholder="Nom, identifiant, référence…"
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <label for="gender">Genre</label>
        <select id="gender" v-model="filters.gender" class="filter-select">
          <option value="">Tous</option>
          <option value="man">Homme</option>
          <option value="woman">Femme</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="status">Statut paiement</label>
        <select id="status" v-model="filters.status" class="filter-select">
          <option value="">Tous</option>
          <option value="solde">Soldé</option>
          <option value="encours">En cours</option>
        </select>
      </div>

      <button @click="clearFilters" class="btn-clear">Réinitialiser</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">Chargement des salariés…</div>

    <div v-else-if="filteredRows.length" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Nom</th>
            <th>Identifiant</th>
            <th>Genre</th>
            <th>Salaires</th>
            <th>Total dû</th>
            <th>Total payé</th>
            <th>Reste</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredRows" :key="r.id">
            <td>{{ r.ref ?? '-' }}</td>
            <td class="name-cell">{{ r.name }}</td>
            <td>{{ r.login || '-' }}</td>
            <td>{{ genderLabel(r.gender) }}</td>
            <td>{{ r.stats.count }}</td>
            <td>{{ money(r.stats.due) }}</td>
            <td>{{ money(r.stats.paid) }}</td>
            <td>
              <span :class="['status-badge', r.stats.count === 0 ? 'inactive' : (r.stats.solde ? 'active' : 'pending')]">
                {{ r.stats.count === 0 ? 'Aucun' : (r.stats.solde ? 'Soldé' : money(r.stats.rest)) }}
              </span>
            </td>
            <td>
              <button @click="goToPay(r.id)" class="btn-pay">Créer / Payer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="no-results">
      <p v-if="employees.length">Aucun salarié ne correspond aux critères.</p>
      <p v-else>Aucun salarié trouvé.</p>
    </div>

    <div v-if="employees.length" class="stats">
      <span>{{ filteredRows.length }} salarié(s) affiché(s) sur {{ employees.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.salarie-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
  color: #1e293b;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
}

.filter-input,
.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 180px;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-clear {
  padding: 0.5rem 1rem;
  background: #e2e8f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #475569;
  transition: background 0.2s;
}

.btn-clear:hover {
  background: #cbd5e1;
}

.btn-refresh {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #2563eb;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.data-table tbody tr:hover {
  background: #f8fafc;
}

.name-cell {
  font-weight: 500;
  color: #1e293b;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #16a34a;
}

.status-badge.pending {
  background: #fef9c3;
  color: #ca8a04;
}

.status-badge.inactive {
  background: #f1f5f9;
  color: #64748b;
}

.btn-pay {
  padding: 0.375rem 0.75rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-pay:hover {
  background: #059669;
}

.error-message {
  padding: 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.no-results {
  padding: 2rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
}

.stats {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #64748b;
  text-align: right;
}
</style>
