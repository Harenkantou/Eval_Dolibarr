<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEmployees, getSalaries, runPaymentPlan } from '@/api/dolibarr'
import { buildDispatchPlan, buildRecap } from '@/services/paymentDispatcherService'
import { distinctJobs } from '@/services/employeeService'
import { money, tsToFr } from '@/services/formatService'

const router = useRouter()

const employees = ref([])
const salaries  = ref([])
const loading   = ref(false)
const error     = ref('')
const success   = ref('')
const lastRun   = ref(null)

const now   = new Date()
const today = now.toISOString().split('T')[0]

// ── Critères + montant à répartir ─────────────────────────────
const form = ref({
  amount     : '',
  month      : now.getMonth() + 1,
  year       : now.getFullYear(),
  priorityJob: ''
})

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

// ── Vues dérivées (toute la logique vit dans les services) ────
const jobs         = computed(() => distinctJobs(employees.value))
const recap        = computed(() => buildRecap(lastRun.value?.results))
const dispatchPlan = computed(() => {
  const budget = parseFloat(form.value.amount) || 0
  if (budget <= 0) return { plan: [], totalPaid: 0, unusedBudget: 0 }
  return buildDispatchPlan({
    budget,
    month      : form.value.month,
    year       : form.value.year,
    priorityJob: form.value.priorityJob,
    salaries   : salaries.value,
    employees  : employees.value
  })
})

async function loadAll() {
  loading.value = true; error.value = ''
  try {
    const [emp, sal] = await Promise.all([getEmployees(), getSalaries()])
    employees.value = emp
    salaries.value  = sal
  } catch (e) {
    error.value = 'Erreur chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

// ── Payer : délègue l'exécution du plan au service API ────────
async function handlePay() {
  error.value = ''; success.value = ''; lastRun.value = null

  const budget = parseFloat(form.value.amount) || 0
  if (budget <= 0) { error.value = 'Montant invalide.'; return }
  if (dispatchPlan.value.plan.length === 0) {
    error.value = 'Aucun salaire à payer avec ces critères.'; return
  }

  const nb   = dispatchPlan.value.plan.length
  const paid = dispatchPlan.value.totalPaid
  if (!confirm(`Répartir ${money(paid)} sur ${nb} salaire(s) ?`)) return

  loading.value = true
  try {
    const run = await runPaymentPlan(dispatchPlan.value.plan, { date: today })
    lastRun.value = run

    if (run.ko === 0) {
      success.value = `${money(run.paidOk)} payés sur ${run.ok} salaire(s).`
      form.value.amount = ''
    } else {
      error.value = `${run.ok} succès, ${run.ko} échec(s).`
    }
    await loadAll()
  } catch (e) {
    error.value = 'Erreur globale : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'frontoffice-salaries' })
}

onMounted(loadAll)
</script>

<template>
  <div class="payment-generate">
    <header>
      <button @click="goBack">← Retour</button>
      <h1>Générer un ordre de paiement</h1>
    </header>

    <!-- ── Filtres + Priorité ─────────────────────────── -->
    <section>
      <h2>Critères</h2>
      <div>
        <label>Mois</label>
        <select v-model.number="form.month">
          <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
        </select>

        <label>Année</label>
        <input type="number" min="2000" max="2100" v-model.number="form.year" />

        <label>Poste prioritaire</label>
        <select v-model="form.priorityJob">
          <option value="">Aucun</option>
          <option v-for="j in jobs" :key="j" :value="j">{{ j }}</option>
        </select>
      </div>
    </section>

    <!-- ── Montant ────────────────────────────────────── -->
    <section>
      <h2>Montant à répartir</h2>
      <label>Montant (€)</label>
      <input type="number" step="0.01" min="0.01"
             v-model="form.amount" placeholder="Ex: 1500" />
    </section>

    <!-- ── Aperçu de l'ordre de paiement ─────────────── -->
    <section v-if="dispatchPlan.plan.length">
      <h2>
        Ordre de paiement — {{ dispatchPlan.plan.length }} salaire(s),
        total {{ money(dispatchPlan.totalPaid) }}
        <span v-if="dispatchPlan.unusedBudget > 0">
          (reste non utilisé : {{ money(dispatchPlan.unusedBudget) }})
        </span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Salarié</th>
            <th>Poste</th>
            <th>Période salaire</th>
            <th>Reste avant</th>
            <th>À payer</th>
            <th>Reste après</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, i) in dispatchPlan.plan" :key="line.salaryId"
              :class="{ 'row-unfunded': !line.funded }">
            <td>{{ i + 1 }}</td>
            <td>{{ line.name }}</td>
            <td>{{ line.job || '-' }}</td>
            <td>{{ tsToFr(line.datesp) }} → {{ tsToFr(line.dateep) }}</td>
            <td>{{ money(line.resteBefore) }}</td>
            <td><strong>{{ money(line.payment) }}</strong></td>
            <td>{{ money(line.resteAfter) }}</td>
            <td>
              <span v-if="!line.funded">Non financé</span>
              <span v-else-if="line.partial">Partiel</span>
              <span v-else>Soldé</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="form.amount">
      <p>Aucun salaire ne correspond aux critères ou tout est déjà payé.</p>
    </section>

    <!-- ── Bouton Payer ───────────────────────────────── -->
    <section>
      <button @click="handlePay"
              :disabled="loading || dispatchPlan.plan.length === 0">
        {{ loading ? 'Paiement en cours…' : `Payer ${money(dispatchPlan.totalPaid)}` }}
      </button>
    </section>

    <p v-if="error"   style="color:red">{{ error }}</p>
    <p v-if="success" style="color:green">{{ success }}</p>

    <!-- ── Résultat détaillé ──────────────────────────── -->
    <section v-if="lastRun">
      <h3>Résultat</h3>
      <p>
        <strong>{{ lastRun.ok }}</strong> paiement(s) réussi(s) —
        total effectivement payé : <strong>{{ money(lastRun.paidOk) }}</strong>
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

    <!-- ── Récapitulatif par employé concerné ────────── -->
    <section v-if="recap.length" class="recap">
      <h3>Employé(s) concerné(s)</h3>
      <div class="recap-grid">
        <article v-for="r in recap" :key="r.userId" class="recap-card">
          <header class="recap-head">
            <span class="recap-name">{{ r.name }}</span>
            <span v-if="r.job" class="recap-job">{{ r.job }}</span>
            <span class="recap-badge" :class="r.solde ? 'solde' : 'partiel'">
              {{ r.solde ? 'Soldé' : 'Reste dû' }}
            </span>
          </header>
          <dl class="recap-lines">
            <div><dt>Salaire total à payer</dt><dd>{{ money(r.totalDue) }}</dd></div>
            <div class="hl"><dt>Salaire déjà payé</dt><dd>{{ money(r.totalPaid) }}</dd></div>
          </dl>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.salarie-pay {
  max-width: 900px;
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
  transition: background 0.2s;
}

.btn-back:hover {
  background: #e2e8f0;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

/* Salarie Card */
.salarie-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.salarie-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.25rem;
}

.salarie-info { flex: 1; }

.salarie-info h2 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  color: #1e293b;
}

.salarie-info .job {
  margin: 0 0 0.25rem;
  color: #64748b;
  font-size: 0.875rem;
}

.salarie-info .email {
  margin: 0;
  color: #3b82f6;
  font-size: 0.875rem;
}

/* Summary */
.payment-summary {
  background: #f8fafc;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.payment-summary h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: #1e293b;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-item .label {
  font-size: 0.75rem;
  color: #64748b;
}

.summary-item .value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

/* Form card */
.payment-form-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.payment-form-card h3 {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  color: #1e293b;
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
}

.form-group input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error {
  padding: 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.success {
  padding: 0.75rem;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-submit {
  padding: 0.625rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* History */
.payments-history {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.payments-history h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: #1e293b;
}

.salary-block {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.salary-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.salary-amounts {
  font-size: 0.875rem;
  color: #475569;
}

.status-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
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

.no-payments {
  padding: 1rem;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  border-radius: 6px;
}

.no-payments.small {
  padding: 0.5rem;
  font-size: 0.8rem;
}

.payments-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}

.payments-table th,
.payments-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.payments-table th {
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #64748b;
}

.payments-table .amount {
  font-weight: 500;
  color: #1e293b;
}

.pay-inline {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.pay-inline input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
}

.btn-pay {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-pay:hover:not(:disabled) {
  background: #059669;
}

.btn-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Ligne non financée (budget épuisé) */
.row-unfunded {
  opacity: 0.55;
  font-style: italic;
}

/* Récapitulatif par salarié */
.recap h3 {
  margin: 1.5rem 0 1rem;
  font-size: 1rem;
  color: #1e293b;
}

.recap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.recap-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.recap-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.recap-name {
  font-weight: 600;
  color: #1e293b;
}

.recap-job {
  font-size: 0.75rem;
  color: #64748b;
}

.recap-badge {
  margin-left: auto;
  padding: 0.15rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 500;
}

.recap-badge.solde {
  background: #dcfce7;
  color: #16a34a;
}

.recap-badge.partiel {
  background: #fef9c3;
  color: #ca8a04;
}

.recap-period {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  color: #64748b;
}

.recap-lines {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.recap-lines > div {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.recap-lines dt {
  color: #64748b;
}

.recap-lines dd {
  margin: 0;
  font-weight: 500;
  color: #1e293b;
}

.recap-lines .hl dd {
  color: #059669;
  font-weight: 700;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
