<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getEmployee,
  getEmployeeSalaries,
  createSalary,
  addPayment
} from '@/api/dolibarr'

const route  = useRoute()
const router = useRouter()
const userId = route.params.id

const employee = ref(null)
const salaries = ref([])
const loading  = ref(false)
const error    = ref('')
const success  = ref('')

const today = new Date().toISOString().split('T')[0]

// ── Formulaire : création d'un salaire ────────────────────────
const salaryForm = ref({
  amount   : '',
  dateStart: today,
  dateEnd  : today
})

// ── État des mini-formulaires de paiement (un par salaire) ────
// payForms[salaryId] = { date, amount }
const payForms = ref({})

// ── Totaux du salarié ─────────────────────────────────────────
const totals = computed(() => {
  const due  = salaries.value.reduce((s, x) => s + x.amount, 0)
  const paid = salaries.value.reduce((s, x) => s + x.totalPaye, 0)
  return {
    due : Math.round(due * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    rest: Math.round((due - paid) * 100) / 100
  }
})

const genderLabel = (g) => (g === 'man' ? '👨 Homme' : g === 'woman' ? '👩 Femme' : '—')
const money = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)
const initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase()

// ── Chargement ────────────────────────────────────────────────
async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    const [emp, sal] = await Promise.all([
      getEmployee(userId),
      getEmployeeSalaries(userId)
    ])
    employee.value = emp
    salaries.value = sal
    // init des mini-formulaires
    const forms = {}
    for (const s of sal) forms[s.id] = { date: today, amount: '' }
    payForms.value = forms
  } catch (e) {
    error.value = 'Erreur lors du chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

// ── Créer un salaire ──────────────────────────────────────────
async function handleCreateSalary() {
  error.value = ''; success.value = ''
  const amount = parseFloat(salaryForm.value.amount)

  if (!amount || amount <= 0) { error.value = 'Montant du salaire invalide.'; return }
  if (salaryForm.value.dateEnd < salaryForm.value.dateStart) {
    error.value = 'La date de fin doit être postérieure à la date de début.'; return
  }

  loading.value = true
  try {
    await createSalary({
      fk_user  : parseInt(userId),
      amount,
      dateStart: salaryForm.value.dateStart,
      dateEnd  : salaryForm.value.dateEnd
    })
    success.value = `Salaire de ${money(amount)} créé.`
    salaryForm.value.amount = ''
    await loadData()
  } catch (e) {
    error.value = 'Erreur lors de la création : ' + (e.response?.data?.error?.message || e.message)
  } finally {
    loading.value = false
  }
}

// ── Ajouter un paiement (paiement en plusieurs fois) ──────────
async function handlePay(salary) {
  error.value = ''; success.value = ''
  const form   = payForms.value[salary.id]
  const amount = parseFloat(form.amount)

  if (!amount || amount <= 0) { error.value = 'Montant du paiement invalide.'; return }
  if (amount > salary.reste + 0.001) {
    error.value = `Le paiement dépasse le reste dû (${money(salary.reste)}).`; return
  }

  loading.value = true
  try {
    await addPayment(salary.id, { date: form.date, amount })
    success.value = `Paiement de ${money(amount)} enregistré.`
    await loadData()
  } catch (e) {
    error.value = 'Erreur lors du paiement : ' + (e.response?.data?.error?.message || e.message)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'frontoffice-salaries' })
}

onMounted(loadData)
</script>

<template>
  <div class="salarie-pay">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <h1>Créer / Payer un salaire</h1>
    </header>

    <div v-if="loading && !employee" class="loading">Chargement…</div>

    <div v-else class="content">
      <!-- Infos salarié -->
      <div class="salarie-card">
        <div class="salarie-avatar">{{ initials(employee?.name) }}</div>
        <div class="salarie-info">
          <h2>{{ employee?.name }}</h2>
          <p class="job">Réf. {{ employee?.ref ?? '-' }} · {{ genderLabel(employee?.gender) }}</p>
          <p class="email">Identifiant : {{ employee?.login || '-' }}</p>
        </div>
      </div>

      <!-- Récapitulatif -->
      <div class="payment-summary">
        <h3>Récapitulatif</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Total dû</span>
            <span class="value">{{ money(totals.due) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Total payé</span>
            <span class="value">{{ money(totals.paid) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Reste à payer</span>
            <span class="value">{{ money(totals.rest) }}</span>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">{{ success }}</div>

      <!-- Créer un salaire -->
      <div class="payment-form-card">
        <h3>Créer un salaire</h3>
        <form @submit.prevent="handleCreateSalary" class="payment-form">
          <div class="form-row">
            <div class="form-group">
              <label for="amount">Montant (€)</label>
              <input id="amount" type="number" step="0.01" min="0.01"
                     v-model="salaryForm.amount" placeholder="0.00" required />
            </div>
            <div class="form-group">
              <label for="ds">Début de période</label>
              <input id="ds" type="date" v-model="salaryForm.dateStart" required />
            </div>
            <div class="form-group">
              <label for="de">Fin de période</label>
              <input id="de" type="date" v-model="salaryForm.dateEnd" required />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="loading" class="btn-submit">
              {{ loading ? 'Enregistrement…' : 'Créer le salaire' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Salaires existants + paiements -->
      <div class="payments-history">
        <h3>Salaires du salarié</h3>

        <div v-if="salaries.length === 0" class="no-payments">
          Aucun salaire pour ce salarié. Créez-en un ci-dessus.
        </div>

        <div v-for="s in salaries" :key="s.id" class="salary-block">
          <div class="salary-head">
            <div>
              <strong>{{ s.baseLabel || ('Salaire #' + s.id) }}</strong>
              <span :class="['status-badge', s.solde ? 'active' : 'pending']">
                {{ s.solde ? 'Soldé' : 'En cours' }}
              </span>
            </div>
            <div class="salary-amounts">
              Payé {{ money(s.totalPaye) }} / {{ money(s.amount) }}
              · Reste <strong>{{ money(s.reste) }}</strong>
            </div>
          </div>

          <!-- Historique des paiements de ce salaire -->
          <table v-if="s.payments.length" class="payments-table">
            <thead>
              <tr><th>Date de règlement</th><th>Montant</th></tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in s.payments" :key="i">
                <td>{{ p.date }}</td>
                <td class="amount">{{ money(p.amount) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="no-payments small">Aucun règlement pour l'instant.</p>

          <!-- Mini-formulaire : ajouter un paiement -->
          <form v-if="!s.solde && payForms[s.id]"
                @submit.prevent="handlePay(s)" class="pay-inline">
            <input type="date" v-model="payForms[s.id].date" required />
            <input type="number" step="0.01" min="0.01" :max="s.reste"
                   v-model="payForms[s.id].amount" placeholder="Montant à payer" required />
            <button type="submit" :disabled="loading" class="btn-pay">Payer</button>
          </form>
        </div>
      </div>
    </div>
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

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
