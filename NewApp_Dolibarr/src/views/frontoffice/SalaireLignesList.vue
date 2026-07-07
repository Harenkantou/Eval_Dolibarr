<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries } from '@/api/dolibarr'
import { groupSalariesByEmployee, filterGroups, sumGroups } from '@/services/salaryListService'
import { money, tsToFr, genderLabel } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref('')

// ── Filtres ───────────────────────────────────────────────────
const filters = ref({
  search: '',   // nom / référence salarié
  status: ''    // '', 'solde', 'encours'
})

// ── Vues dérivées (logique dans salaryListService) ────────────
const groups         = computed(() => groupSalariesByEmployee(employees.value, salaries.value))
const filteredGroups = computed(() => filterGroups(groups.value, filters.value))
const grandTotal     = computed(() => sumGroups(filteredGroups.value))

async function loadData() {
  loading.value = true
  error.value   = ''
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

function clearFilters() {
  filters.value = { search: '', status: '' }
}

function goToPay(userId) {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

onMounted(loadData)
</script>

<template>
  <div class="salaire-lignes">
    <header class="page-header">
      <h1>Salaires &amp; historique</h1>
      <div class="header-actions">
        <button @click="router.push({ name: 'frontoffice-home' })" class="btn-clear">← Accueil</button>
        <button @click="loadData" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Chargement…' : 'Actualiser' }}
        </button>
      </div>
    </header>

    <!-- Filtres -->
    <div class="filters">
      <div class="filter-group">
        <label for="search">Recherche</label>
        <input id="search" type="text" v-model="filters.search"
               placeholder="Nom ou référence salarié…" class="filter-input" />
      </div>
      <div class="filter-group">
        <label for="status">Statut</label>
        <select id="status" v-model="filters.status" class="filter-select">
          <option value="">Tous</option>
          <option value="solde">Soldé</option>
          <option value="encours">En cours</option>
        </select>
      </div>
      <button @click="clearFilters" class="btn-clear">Réinitialiser</button>

      <div class="grand-total" v-if="filteredGroups.length">
        {{ grandTotal.count }} salaire(s) · Dû {{ money(grandTotal.due) }}
        · Payé {{ money(grandTotal.paid) }} · Reste <strong>{{ money(grandTotal.rest) }}</strong>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="loading && salaries.length === 0" class="loading">Chargement des salaires…</div>

    <div v-else-if="filteredGroups.length" class="groups">
      <section v-for="g in filteredGroups" :key="g.id" class="group-card">
        <!-- En-tête salarié -->
        <div class="group-head">
          <div class="who">
            <strong>{{ g.name }}</strong>
            <span class="muted">Réf. {{ g.ref ?? '-' }} · {{ genderLabel(g.gender) }} · {{ g.job || '—' }}</span>
          </div>
          <div class="group-totals">
            <span>{{ g.count }} salaire(s)</span>
            <span>Dû {{ money(g.due) }}</span>
            <span>Payé {{ money(g.paid) }}</span>
            <span :class="['status-badge', g.solde ? 'active' : 'pending']">
              {{ g.solde ? 'Soldé' : 'Reste ' + money(g.rest) }}
            </span>
            <button @click="goToPay(g.id)" class="btn-pay">Créer / Payer</button>
          </div>
        </div>

        <!-- Historique des salaires -->
        <table class="data-table">
          <thead>
            <tr>
              <th>Période</th>
              <th>Montant</th>
              <th>Payé</th>
              <th>Reste</th>
              <th>Règlements</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in g.lines" :key="s.id">
              <td class="name-cell">Du {{ tsToFr(s.datesp) }} au {{ tsToFr(s.dateep) }}</td>
              <td>{{ money(s.amount) }}</td>
              <td>{{ money(s.totalPaye) }}</td>
              <td>{{ money(s.reste) }}</td>
              <td>
                <span v-if="s.payments.length">{{ s.payments.length }} règlement(s)</span>
                <span v-else class="muted">aucun</span>
              </td>
              <td>
                <span :class="['status-badge', s.solde ? 'active' : 'pending']">
                  {{ s.solde ? 'Soldé' : 'En cours' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <div v-else class="no-results">
      <p v-if="salaries.length">Aucun salaire ne correspond aux critères.</p>
      <p v-else>Aucun salaire trouvé.</p>
    </div>
  </div>
</template>

<style scoped>
.salaire-lignes {
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
.page-header h1 { margin: 0; font-size: 1.75rem; color: #1e293b; }
.header-actions { display: flex; gap: 0.75rem; }

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
.filter-group { display: flex; flex-direction: column; gap: 0.25rem; }
.filter-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
}
.filter-input, .filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 180px;
}
.filter-input:focus, .filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.grand-total {
  margin-left: auto;
  font-size: 0.875rem;
  color: #475569;
  align-self: center;
}

.btn-clear {
  padding: 0.5rem 1rem;
  background: #e2e8f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #475569;
}
.btn-clear:hover { background: #cbd5e1; }

.btn-refresh {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}
.btn-refresh:hover:not(:disabled) { background: #2563eb; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

.groups { display: flex; flex-direction: column; gap: 1.5rem; }

.group-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.group-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.who { display: flex; flex-direction: column; gap: 0.2rem; }
.who strong { font-size: 1.05rem; color: #1e293b; }
.muted { color: #64748b; font-size: 0.8rem; }
.group-totals {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
  color: #475569;
  flex-wrap: wrap;
}

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td {
  padding: 0.7rem 1.25rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}
.data-table th {
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  color: #64748b;
}
.data-table tbody tr:hover { background: #f8fafc; }
.name-cell { font-weight: 500; color: #1e293b; }

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 500;
}
.status-badge.active  { background: #dcfce7; color: #16a34a; }
.status-badge.pending { background: #fef9c3; color: #ca8a04; }

.btn-pay {
  padding: 0.375rem 0.75rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}
.btn-pay:hover { background: #059669; }

.error-message {
  padding: 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.loading, .no-results {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}
.no-results { background: #f8fafc; border-radius: 8px; }
</style>
