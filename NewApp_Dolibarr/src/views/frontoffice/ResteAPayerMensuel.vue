<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries, runPaymentPlan } from '@/api/dolibarr'
import {
  buildMonthlyRest, buildPivot, pivotColumns, sortPeriods,
  sumRows, listYears, paymentsOfRow,
  cellsOfPeriod, cellsOfEmployee, restOf, MONTH_NAMES
} from '@/services/salaryMonthlyService'
import { buildPercentPlan } from '@/services/paymentDispatcherService'
import { money, tsToFr, round2 } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref('')
const success   = ref('')

// ── Filtres & tri ─────────────────────────────────────────────
const year    = ref(null)   // null = toutes les années
const month   = ref(null)   // null = tous les mois
const sortDir = ref('asc')  // tri de la colonne « Mois & Année »

// ── Détail (croisement sélectionné) ───────────────────────────
const selectedKey = ref(null)

// ── Paiement au pourcentage (Alea 5) ──────────────────────────
const percent = ref(100)    // saisi AVANT de cliquer sur Payer
const paying  = ref(null)   // clé du bouton en cours ('row:…' | 'col:…')
const lastRun = ref(null)

const today = new Date().toISOString().split('T')[0]

// Le pourcentage est borné [0,100] : le reste du composant ne lit que celui-ci.
const pct = computed(() => Math.min(Math.max(Number(percent.value) || 0, 0), 100))

// ── Vues dérivées (logique dans salaryMonthlyService) ─────────
const years   = computed(() => listYears(salaries.value))
const columns = computed(() => pivotColumns(employees.value))

// 1 croisement = 1 (mois, année, salarié) ; le pivot les regroupe par période.
const allRows = computed(() =>
  buildMonthlyRest(employees.value, salaries.value, { year: year.value, month: month.value }))
const periods    = computed(() => sortPeriods(buildPivot(allRows.value), { dir: sortDir.value }))
const grandTotal = computed(() => sumRows(allRows.value))

const selectedRow      = computed(() => allRows.value.find(r => r.key === selectedKey.value) || null)
const selectedPayments = computed(() => paymentsOfRow(selectedRow.value))

/** Reste à payer par colonne (salarié), toutes périodes affichées. */
const columnRest = computed(() => {
  const out = {}
  for (const c of columns.value) out[c.userId] = restOf(cellsOfEmployee(allRows.value, c.userId))
  return out
})

/** Montants qui seront réellement payés au pourcentage courant. */
const rowTarget = (p)      => round2(p.rest * pct.value / 100)
const colTarget = (userId) => round2((columnRest.value[userId] || 0) * pct.value / 100)

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

/** Clic sur l'en-tête « Mois & Année » : inverse le sens du tri. */
function toggleSort() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

/** Clic sur un montant : ouvre / referme le détail du croisement. */
function selectCell(row) {
  selectedKey.value = selectedKey.value === row.key ? null : row.key
}

function clearFilters() {
  year.value    = null
  month.value   = null
  sortDir.value = 'asc'
}

function goToPay(userId) {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

// ── Payer une ligne / une colonne ─────────────────────────────
/** Construit le plan au pourcentage sur `cells`, confirme, puis l'exécute. */
async function payCells(cells, label, busyKey) {
  error.value = ''; success.value = ''; lastRun.value = null

  if (pct.value <= 0) {
    error.value = 'Saisissez d’abord un pourcentage supérieur à 0 %.'
    return
  }

  const { plan, totalRest, totalPaid } = buildPercentPlan({
    cells, percent: pct.value, employees: employees.value
  })
  const funded = plan.filter(l => l.payment > 0)
  if (funded.length === 0) {
    error.value = `Rien à payer pour ${label} (tout est soldé).`
    return
  }

  const ok = confirm(
    `${label}\n\n` +
    `Reste à payer : ${money(totalRest)}\n` +
    `Pourcentage   : ${pct.value} %\n` +
    `Montant payé  : ${money(totalPaid)} sur ${funded.length} salaire(s)\n\n` +
    `Confirmer le paiement ?`
  )
  if (!ok) return

  paying.value = busyKey
  try {
    const run = await runPaymentPlan(plan, { date: today })
    lastRun.value = { ...run, label }
    if (run.ko === 0) {
      success.value = `${money(run.paidOk)} payés sur ${run.ok} salaire(s) — ${label}.`
    } else {
      error.value = `${run.ok} succès, ${run.ko} échec(s) — ${label}.`
    }
    await loadData()
  } catch (e) {
    error.value = 'Erreur lors du paiement : ' + (e.message || 'inconnue')
  } finally {
    paying.value = null
  }
}

function payPeriod(p) {
  payCells(cellsOfPeriod(p, columns.value), `${p.monthLabel} ${p.year}`, `row:${p.key}`)
}

function payEmployee(c) {
  payCells(cellsOfEmployee(allRows.value, c.userId), c.name, `col:${c.userId}`)
}

// Un croisement masqué par un filtre ne doit pas rester déplié en bas.
watch(allRows, (rows) => {
  if (selectedKey.value && !rows.some(r => r.key === selectedKey.value)) {
    selectedKey.value = null
  }
})

onMounted(loadData)
</script>

<template>
  <div class="reste-mensuel">
    <header class="page-header">
      <div>
        <h1>Reste à payer par mois</h1>
        <p class="muted">Aperçu global des salaires restants à payer par mois et par salarié.</p>
      </div>
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
        <label for="month">Mois</label>
        <select id="month" v-model="month" class="filter-select">
          <option :value="null">Tous les mois</option>
          <option v-for="(m, i) in MONTH_NAMES" :key="i" :value="i + 1">{{ m }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="year">Année</label>
        <select id="year" v-model="year" class="filter-select">
          <option :value="null">Toutes les années</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Alea 5 : le pourcentage se saisit AVANT de cliquer sur Payer -->
      <div class="filter-group">
        <label for="percent">Pourcentage à payer</label>
        <div class="percent-input">
          <input id="percent" type="number" min="0" max="100" step="1"
                 v-model.number="percent" class="filter-input" />
          <span class="suffix">%</span>
        </div>
      </div>

      <button @click="clearFilters" class="btn-clear">Réinitialiser</button>

      <div class="grand-total" v-if="periods.length">
        {{ grandTotal.count }} croisement(s) · Dû {{ money(grandTotal.due) }}
        · Payé {{ money(grandTotal.paid) }} · Reste <strong>{{ money(grandTotal.rest) }}</strong>
      </div>
    </div>

    <div v-if="error"   class="error-message">{{ error }}</div>
    <div v-if="success" class="success-message">{{ success }}</div>
    <div v-if="loading && salaries.length === 0" class="loading">Chargement des salaires…</div>

    <!-- Tableau croisé : lignes = Mois & Année, colonnes = salariés -->
    <div v-else-if="periods.length" class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort">
              Mois &amp; Année {{ sortDir === 'asc' ? '▲' : '▼' }}
            </th>
            <th v-for="c in columns" :key="c.userId" class="align-right">{{ c.name }}</th>
            <th class="align-right">Payer la ligne</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="p in periods" :key="p.key">
            <td class="name-cell">{{ p.monthLabel }} {{ p.year }}</td>

            <td v-for="c in columns" :key="c.userId" class="align-right"
                :class="{ selected: p.cells[c.userId] && p.cells[c.userId].key === selectedKey }">
              <button v-if="p.cells[c.userId]"
                      class="amount-link" :class="{ ok: p.cells[c.userId].solde }"
                      @click="selectCell(p.cells[c.userId])"
                      :title="`Voir le détail — ${p.monthLabel} ${p.year} · ${c.name}`">
                {{ money(p.cells[c.userId].rest) }}
              </button>
              <span v-else class="muted">—</span>
            </td>

            <!-- Alea 5 : paiement de toute la ligne (tous les salariés du mois) -->
            <td class="align-right action-cell">
              <span class="target">{{ money(rowTarget(p)) }}</span>
              <button class="btn-pay sm"
                      :disabled="loading || paying !== null || p.rest <= 0 || pct <= 0"
                      :title="`Payer ${pct}% du reste de ${p.monthLabel} ${p.year}`"
                      @click="payPeriod(p)">
                {{ paying === `row:${p.key}` ? '…' : 'Payer' }}
              </button>
            </td>
          </tr>
        </tbody>

        <!-- Alea 5 : paiement de toute la colonne (toutes les périodes d'un salarié) -->
        <tfoot>
          <tr class="foot-rest">
            <td class="name-cell">Reste par salarié</td>
            <td v-for="c in columns" :key="c.userId" class="align-right">
              {{ money(columnRest[c.userId] || 0) }}
            </td>
            <td class="align-right muted">{{ money(grandTotal.rest) }}</td>
          </tr>
          <tr class="foot-actions">
            <td class="name-cell">Payer la colonne</td>
            <td v-for="c in columns" :key="c.userId" class="align-right action-cell">
              <span class="target">{{ money(colTarget(c.userId)) }}</span>
              <button class="btn-pay sm"
                      :disabled="loading || paying !== null || (columnRest[c.userId] || 0) <= 0 || pct <= 0"
                      :title="`Payer ${pct}% du reste de ${c.name}`"
                      @click="payEmployee(c)">
                {{ paying === `col:${c.userId}` ? '…' : 'Payer' }}
              </button>
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else class="no-results">
      <p v-if="salaries.length">Aucune ligne ne correspond aux critères.</p>
      <p v-else>Aucun salaire trouvé.</p>
    </div>

    <!-- Résultat du dernier paiement ligne/colonne -->
    <section v-if="lastRun" class="run-result">
      <p>
        <strong>{{ lastRun.label }}</strong> — {{ lastRun.ok }} paiement(s) réussi(s),
        total {{ money(lastRun.paidOk) }}
        <span v-if="lastRun.ko"> · {{ lastRun.ko }} échec(s)</span>
      </p>
      <details v-if="lastRun.ko > 0">
        <summary>Voir les échecs</summary>
        <ul>
          <li v-for="(r, i) in lastRun.results.filter(x => !x.success)" :key="i">
            {{ r.name }} — {{ money(r.payment) }} : {{ r.error }}
          </li>
        </ul>
      </details>
    </section>

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
.page-header h1 { margin: 0 0 0.25rem; font-size: 1.75rem; color: #1e293b; }
.page-header p  { margin: 0; }
.header-actions { display: flex; gap: 0.75rem; }

.table-scroll { overflow-x: auto; }

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
.percent-input { display: flex; align-items: center; gap: 0.4rem; }
.percent-input .filter-input { min-width: 110px; }
.percent-input .suffix { font-weight: 600; color: #475569; }
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
.btn-pay:hover:not(:disabled) { background: #059669; }
.btn-pay:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-pay.sm { padding: 0.3rem 0.7rem; font-size: 0.78rem; }

.action-cell { white-space: nowrap; }
.action-cell .target {
  display: inline-block;
  margin-right: 0.5rem;
  font-size: 0.78rem;
  color: #64748b;
}

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
.data-table tbody td.selected,
.data-table tbody tr:hover td.selected { background: #eff6ff; }
.data-table.sub { margin-bottom: 1.5rem; }
.data-table tfoot td { background: #f8fafc; }
.data-table tfoot .foot-rest td { font-weight: 600; color: #1e293b; }
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

.run-result {
  margin-top: 1.25rem;
  padding: 0.9rem 1.25rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #475569;
}
.run-result p { margin: 0; }

.error-message {
  padding: 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.success-message {
  padding: 1rem;
  background: #dcfce7;
  color: #16a34a;
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
