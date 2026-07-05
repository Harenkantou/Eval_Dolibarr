<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSalaries } from '@/api/dolibarr'

const router = useRouter()
const salaries = ref([])
const loading = ref(false)
const error = ref(null)

// Filtres multi-critères
const filters = ref({
  search: '',
  job: '',
  status: ''
})

// Filtrage côté client
const filteredSalaries = computed(() => {
  if (!salaries.value.length) return []

  return salaries.value.filter(s => {
    const fullName = `${s.firstname || ''} ${s.lastname || ''}`.toLowerCase()
    const searchLower = filters.value.search.toLowerCase()

    const matchSearch = !filters.value.search ||
      fullName.includes(searchLower) ||
      (s.email || '').toLowerCase().includes(searchLower) ||
      (s.job || '').toLowerCase().includes(searchLower)

    const matchJob = !filters.value.job ||
      (s.job || '').toLowerCase().includes(filters.value.job.toLowerCase())

    const matchStatus = !filters.value.status ||
      (s.status || '').toLowerCase() === filters.value.status.toLowerCase()

    return matchSearch && matchJob && matchStatus
  })
})

async function loadSalaries() {
  loading.value = true
  error.value = null
  try {
    const data = await getSalaries()
    salaries.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement'
    console.error(e)
  } finally {
    loading.value = false
  }
}

function goToPay(id) {
  router.push(`/salaries/${id}/pay`)
}

function clearFilters() {
  filters.value = { search: '', job: '', status: '' }
}

onMounted(loadSalaries)
</script>

<template>
  <div class="salarie-list">
    <header class="page-header">
      <h1>Liste des Salariés</h1>
      <button @click="loadSalaries" :disabled="loading" class="btn-refresh">
        {{ loading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </header>

    <!-- Recherche multi-critères -->
    <div class="filters">
      <div class="filter-group">
        <label for="search">Recherche</label>
        <input
          id="search"
          type="text"
          v-model="filters.search"
          placeholder="Nom, prénom, email..."
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <label for="job">Poste</label>
        <input
          id="job"
          type="text"
          v-model="filters.job"
          placeholder="Filtrer par poste..."
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <label for="status">Statut</label>
        <select id="status" v-model="filters.status" class="filter-select">
          <option value="">Tous</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
      </div>

      <button @click="clearFilters" class="btn-clear">Réinitialiser</button>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Loader -->
    <div v-if="loading" class="loading">
      Chargement des salariés...
    </div>

    <!-- Tableau des salariés -->
    <div v-else-if="filteredSalaries.length" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Poste</th>
            <th>Téléphone</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="salarie in filteredSalaries" :key="salarie.id">
            <td class="name-cell">
              {{ salarie.firstname }} {{ salarie.lastname }}
            </td>
            <td>{{ salarie.email || '-' }}</td>
            <td>{{ salarie.job || '-' }}</td>
            <td>{{ salarie.phone || '-' }}</td>
            <td>
              <span :class="['status-badge', salarie.status === 1 ? 'active' : 'inactive']">
                {{ salarie.status === 1 ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td>
              <button @click="goToPay(salarie.id)" class="btn-pay">
                Créer/Payer salaire
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Aucun résultat -->
    <div v-else class="no-results">
      <p v-if="salaries.length">Aucun salarié ne correspond aux critères de recherche.</p>
      <p v-else>Aucun salarié trouvé.</p>
    </div>

    <!-- Statistiques -->
    <div v-if="salaries.length" class="stats">
      <span>{{ filteredSalaries.length }} salarié(s) affiché(s) sur {{ salaries.length }}</span>
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
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
  color: #1e293b;
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

.status-badge.inactive {
  background: #fee2e2;
  color: #dc2626;
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
