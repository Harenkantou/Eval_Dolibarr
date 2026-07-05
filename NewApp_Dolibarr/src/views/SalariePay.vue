<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSalarie, getSalariesPayments, createSalairePayment } from '@/api/dolibarr'

const route = useRoute()
const router = useRouter()
const salarieId = route.params.id

const salarie = ref(null)
const payments = ref([])
const loading = ref(false)
const error = ref(null)
const success = ref('')

// Formulaire de création/paiement de salaire
const paymentForm = ref({
  date: new Date().toISOString().split('T')[0],
  amount: '',
  payment_type: 'virement',
  label: ''
})

const paymentTypes = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'especes', label: 'Espèces' },
  { value: 'prelevement', label: 'Prélèvement' }
]

// Calcul du total payé
const totalPaid = computed(() => {
  return payments.value.reduce((sum, p) => {
    return sum + (parseFloat(p.amount) || parseFloat(p.amount_payment) || 0)
  }, 0)
})

// Charger les données
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    // Charger le salarié
    salarie.value = await getSalarie(salarieId)

    // Charger les paiements existants
    try {
      const paymentsData = await getSalariesPayments(salarieId)
      payments.value = Array.isArray(paymentsData) ? paymentsData : []
    } catch {
      // L'API peut ne pas avoir de paiements
      payments.value = []
    }
  } catch (e) {
    error.value = 'Erreur lors du chargement: ' + (e.message || 'Erreur inconnue')
  } finally {
    loading.value = false
  }
}

// Créer un nouveau paiement
async function createPayment() {
  if (!paymentForm.value.amount || parseFloat(paymentForm.value.amount) <= 0) {
    error.value = 'Veuillez saisir un montant valide'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const payload = {
      date: paymentForm.value.date,
      amount: parseFloat(paymentForm.value.amount),
      payment_type: paymentForm.value.payment_type,
      label: paymentForm.value.label || `Paiement salaire - ${paymentForm.value.date}`
    }

    await createSalairePayment(salarieId, payload)

    success.value = `Paiement de ${payload.amount} € enregistré avec succès`

    // Recharger les paiements
    try {
      const paymentsData = await getSalariesPayments(salarieId)
      payments.value = Array.isArray(paymentsData) ? paymentsData : []
    } catch {
      payments.value = []
    }

    // Réinitialiser le formulaire
    paymentForm.value.amount = ''
    paymentForm.value.label = ''

  } catch (e) {
    error.value = 'Erreur lors du paiement: ' + (e.response?.data?.error?.message || e.message || 'Erreur inconnue')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/salaries')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatCurrency(amount) {
  const value = parseFloat(amount) || 0
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

onMounted(loadData)
</script>

<template>
  <div class="salarie-pay">
    <!-- Header -->
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour</button>
      <h1>Gestion du Salaire</h1>
    </header>

    <!-- Loading -->
    <div v-if="loading && !salarie" class="loading">
      Chargement...
    </div>

    <!-- Contenu principal -->
    <div v-else class="content">
      <!-- Infos salarié -->
      <div class="salarie-card">
        <div class="salarie-avatar">
          {{ (salarie?.firstname?.[0] || '') + (salarie?.lastname?.[0] || '') }}
        </div>
        <div class="salarie-info">
          <h2>{{ salarie?.firstname }} {{ salarie?.lastname }}</h2>
          <p class="job">{{ salarie?.job || 'Poste non défini' }}</p>
          <p class="email">{{ salarie?.email || '-' }}</p>
        </div>
        <div class="salarie-status">
          <span :class="['badge', salarie?.status === 1 ? 'active' : 'inactive']">
            {{ salarie?.status === 1 ? 'Actif' : 'Inactif' }}
          </span>
        </div>
      </div>

      <!-- Récapitulatif des paiements -->
      <div class="payment-summary">
        <h3>Récapitulatif</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Total payé</span>
            <span class="value">{{ formatCurrency(totalPaid) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Nombre de paiements</span>
            <span class="value">{{ payments.length }}</span>
          </div>
        </div>
      </div>

      <!-- Formulaire de paiement -->
      <div class="payment-form-card">
        <h3>Créer un paiement</h3>

        <form @submit.prevent="createPayment" class="payment-form">
          <div class="form-row">
            <div class="form-group">
              <label for="date">Date du paiement</label>
              <input
                id="date"
                type="date"
                v-model="paymentForm.date"
                required
              />
            </div>

            <div class="form-group">
              <label for="amount">Montant (€)</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                v-model="paymentForm.amount"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="payment_type">Mode de paiement</label>
              <select id="payment_type" v-model="paymentForm.payment_type">
                <option v-for="pt in paymentTypes" :key="pt.value" :value="pt.value">
                  {{ pt.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="label">Libellé</label>
              <input
                id="label"
                type="text"
                v-model="paymentForm.label"
                placeholder="Ex: Salaire juillet 2026 - 1er versement"
              />
            </div>
          </div>

          <!-- Messages -->
          <div v-if="error" class="error">{{ error }}</div>
          <div v-if="success" class="success">{{ success }}</div>

          <div class="form-actions">
            <button type="submit" :disabled="loading" class="btn-submit">
              {{ loading ? 'Enregistrement...' : 'Enregistrer le paiement' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Historique des paiements -->
      <div class="payments-history">
        <h3>Historique des paiements</h3>

        <div v-if="payments.length === 0" class="no-payments">
          Aucun paiement enregistré pour ce salarié.
        </div>

        <table v-else class="payments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Montant</th>
              <th>Mode</th>
              <th>Libellé</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment.id || payment.rowid">
              <td>{{ formatDate(payment.date || payment.datep) }}</td>
              <td class="amount">{{ formatCurrency(payment.amount || payment.amount_payment) }}</td>
              <td>{{ payment.payment_type || payment.type_label || '-' }}</td>
              <td>{{ payment.label || '-' }}</td>
            </tr>
          </tbody>
        </table>
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

.salarie-info {
  flex: 1;
}

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

.badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge.active {
  background: #dcfce7;
  color: #16a34a;
}

.badge.inactive {
  background: #fee2e2;
  color: #dc2626;
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

/* Payment Form */
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
  grid-template-columns: 1fr 1fr;
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

.error {
  padding: 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.875rem;
}

.success {
  padding: 0.75rem;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-submit {
  padding: 0.625rem 1.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background: #059669;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Payments History */
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

.no-payments {
  padding: 1.5rem;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  border-radius: 6px;
}

.payments-table {
  width: 100%;
  border-collapse: collapse;
}

.payments-table th,
.payments-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.payments-table th {
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #64748b;
}

.payments-table .amount {
  font-weight: 500;
  color: #1e293b;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
