<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries } from '@/api/dolibarr'
import {
  buildMonthlyRest, filterRows, sortRows, sumRows, listYears, paymentsOfRow
} from '@/services/salaryMonthlyService'
import { money, tsToFr } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref('')

// ── Filtres & tri ─────────────────────────────────────────────
const year      = ref(null)          // null = toutes les années
const search    = ref('')
const onlyRest  = ref(false)
const sortBy    = ref('month')       // 'month' | 'name' | 'rest'
const sortDir   = ref('asc')

// `year = null` est une sélection valide (« Toutes ») : sans ce drapeau,
// un Actualiser après ce choix reposerait l'année par défaut.
let yearInitialized = false

// ── Détail (croisement sélectionné) ───────────────────────────
const selectedKey = ref(null)

// ── Vues dérivées (logique dans salaryMonthlyService) ─────────
const years       = computed(() => listYears(salaries.value))
const allRows     = computed(() => buildMonthlyRest(employees.value, salaries.value, { year: year.value }))
const visibleRows = computed(() => sortRows(
  filterRows(allRows.value, { search: search.value, onlyRest: onlyRest.value }),
  { by: sortBy.value, dir: sortDir.value }
))
const grandTotal  = computed(() => sumRows(visibleRows.value))

const selectedRow      = computed(() => visibleRows.value.find(r => r.key === selectedKey.value) || null)
const selectedPayments = computed(() => paymentsOfRow(selectedRow.value))

async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    const [emp, sal] = await Promise.all([getEmployees(), getSalaries()])
    employees.value = emp
    salaries.value  = sal
    if (!yearInitialized && years.value.length) {
      year.value      = years.value[0]
      yearInitialized = true
    }
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

/** Clic sur un en-tête : bascule le sens si déjà actif, sinon trie sur la colonne. */
function toggleSort(column) {
  if (sortBy.value === column) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value  = column
    sortDir.value = 'asc'
  }
}

function sortIcon(column) {
  if (sortBy.value !== column) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

/** Clic sur le montant : ouvre / referme le détail du croisement. */
function selectRow(row) {
  selectedKey.value = selectedKey.value === row.key ? null : row.key
}

function clearFilters() {
  search.value   = ''
  onlyRest.value = false
  sortBy.value   = 'month'
  sortDir.value  = 'asc'
}

function goToPay(userId) {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

// Une ligne masquée par un filtre ne doit pas rester dépliée en bas.
watch(visibleRows, (rows) => {
  if (selectedKey.value && !rows.some(r => r.key === selectedKey.value)) {
    selectedKey.value = null
  }
})

onMounted(loadData)
</script>

<template>
  <div class="reste-mensuel">
    <header class="page-header">
      <h1>Reste à payer par mois</h1>
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
        <label for="year">Année</label>
        <select id="year" v-model="year" class="filter-select">
          <option :value="null">Toutes</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="search">Recherche</label>
        <input id="search" type="text" v-model="search"
               placeholder="Nom ou référence salarié…" class="filter-input" />
      </div>

      <label class="checkbox">
        <input type="checkbox" v-model="onlyRest" />
        Masquer les mois soldés
      </label>

      <button @click="clearFilters" class="btn-clear">Réinitialiser</button>

      <div class="grand-total" v-if="visibleRows.length">
        {{ grandTotal.count }} ligne(s) · Dû {{ money(grandTotal.due) }}
        · Payé {{ money(grandTotal.paid) }} · Reste <strong>{{ money(grandTotal.rest) }}</strong>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="loading && salaries.length === 0" class="loading">Chargement des salaires…</div>

    <!-- Tableau principal : Mois | Nom employé | Reste à payer -->
    <table v-else-if="visibleRows.length" class="data-table">
      <thead>
        <tr>
          <th class="sortable" @click="toggleSort('month')">Mois {{ sortIcon('month') }}</th>
          <th class="sortable" @click="toggleSort('name')">Nom employé {{ sortIcon('name') }}</th>
          <th class="sortable align-right" @click="toggleSort('rest')">Reste à payer {{ sortIcon('rest') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in visibleRows" :key="row.key"
            :class="{ selected: row.key === selectedKey }">
          <td class="name-cell">{{ row.monthLabel }} {{ row.year }}</td>
          <td>
            {{ row.name }}
            <span class="muted">· Réf. {{ row.ref ?? '-' }}</span>
          </td>
          <td class="align-right">
            <button class="amount-link" :class="{ ok: row.solde }"
                    @click="selectRow(row)"
                    :title="`Voir le détail — ${row.monthLabel} ${row.year} · ${row.name}`">
              {{ money(row.rest) }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="no-results">
      <p v-if="salaries.length">Aucune ligne ne correspond aux critères.</p>
      <p v-else>Aucun salaire trouvé.</p>
    </div>

    <!-- Détail du reste à payer : Salaire + Paiement -->
    <section v-if="selectedRow" class="detail-panel">
      <div class="detail-head">
        <div>
          <h2>Détail du reste à payer</h2>
          <p class="muted">
            {{ selectedRow.monthLabel }} {{ selectedRow.year }} · {{ selectedRow.name }}
            <span v-if="selectedRow.job">· {{ selectedRow.job }}</span>
          </p>
        </div>
        <div class="detail-actions">
          <button class="btn-pay" @click="goToPay(selectedRow.userId)">Créer / Payer →</button>
          <button class="btn-clear" @click="selectedKey = null">Fermer</button>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">Total dû</span>
          <strong>{{ money(selectedRow.due) }}</strong>
        </div>
        <div class="summary-item">
          <span class="label">Total payé</span>
          <strong class="paid">{{ money(selectedRow.paid) }}</strong>
        </div>
        <div class="summary-item highlight">
          <span class="label">Reste à payer</span>
          <strong :class="selectedRow.rest > 0 ? 'due' : 'ok'">{{ money(selectedRow.rest) }}</strong>
        </div>
      </div>

      <!-- Bloc Salaire -->
      <h3>Salaire</h3>
      <table class="data-table sub">
        <thead>
          <tr>
            <th>Période</th>
            <th class="align-right">Montant</th>
            <th class="align-right">Payé</th>
            <th class="align-right">Reste</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in selectedRow.lines" :key="s.id">
            <td class="name-cell">Du {{ tsToFr(s.datesp) }} au {{ tsToFr(s.dateep) }}</td>
            <td class="align-right">{{ money(s.amount) }}</td>
            <td class="align-right">{{ money(s.totalPaye) }}</td>
            <td class="align-right">{{ money(s.reste) }}</td>
            <td>
              <span :class="['status-badge', s.solde ? 'active' : 'pending']">
                {{ s.solde ? 'Soldé' : 'En cours' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Bloc Paiement -->
      <h3>Paiement</h3>
      <table v-if="selectedPayments.length" class="data-table sub">
        <thead>
          <tr>
            <th>Date de règlement</th>
            <th>Salaire concerné</th>
            <th class="align-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in selectedPayments" :key="`${p.salaryId}-${i}`">
            <td class="name-cell">{{ p.date }}</td>
            <td class="muted">Du {{ tsToFr(p.datesp) }} au {{ tsToFr(p.dateep) }}</td>
            <td class="align-right">{{ money(p.amount) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="no-payments">Aucun règlement pour ce mois.</p>
    </section>
  </div>
</template>

<style scoped>
.reste-mensuel {
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
.checkbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #475569;
  padding-bottom: 0.5rem;
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

.btn-pay {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}
.btn-pay:hover { background: #059669; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
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
  background: #f8fafc;
}
.data-table th.sortable { cursor: pointer; user-select: none; }
.data-table th.sortable:hover { color: #1e293b; }
.data-table tbody tr:hover { background: #f8fafc; }
.data-table tbody tr.selected,
.data-table tbody tr.selected:hover { background: #eff6ff; }
.data-table.sub { margin-bottom: 1.5rem; }
.align-right { text-align: right; }
.name-cell { font-weight: 500; color: #1e293b; }
.muted { color: #64748b; font-size: 0.8rem; }

.amount-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: #dc2626;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.amount-link:hover { color: #991b1b; }
.amount-link.ok { color: #16a34a; }

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 500;
}
.status-badge.active  { background: #dcfce7; color: #16a34a; }
.status-badge.pending { background: #fef9c3; color: #ca8a04; }

.detail-panel {
  margin-top: 2rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.detail-head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; color: #1e293b; }
.detail-head p  { margin: 0; }
.detail-actions { display: flex; gap: 0.75rem; }
.detail-panel h3 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  color: #1e293b;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.summary-item {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.summary-item.highlight { background: #fef9c3; }
.summary-item strong { font-size: 1.3rem; color: #1e293b; }
.summary-item .paid { color: #16a34a; }
.summary-item .due  { color: #dc2626; }
.summary-item .ok   { color: #16a34a; }
.label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 500;
}

.no-payments {
  padding: 0.75rem;
  font-size: 0.85rem;
  color: #64748b;
  text-align: center;
  background: #f8fafc;
  border-radius: 6px;
}

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
