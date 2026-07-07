<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEmployee, getEmployeeSalaries } from '@/api/dolibarr'
import { sumSalaries } from '@/services/salaryListService'
import { money, tsToFr, genderLabel, initials } from '@/services/formatService'

const route  = useRoute()
const router = useRouter()
const userId = route.params.id

const employee = ref(null)
const salaries = ref([])
const loading  = ref(false)
const error    = ref('')

const totals = computed(() => sumSalaries(salaries.value))

async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    const [emp, sal] = await Promise.all([
      getEmployee(userId),
      getEmployeeSalaries(userId)
    ])
    employee.value = emp
    salaries.value = sal.sort((a, b) => (b.datesp || 0) - (a.datesp || 0))
  } catch (e) {
    error.value = 'Erreur chargement : ' + (e.message || 'inconnue')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'frontoffice-salaries-all' })
}

function goToPay() {
  router.push({ name: 'frontoffice-salarie-pay', params: { id: userId } })
}

onMounted(loadData)
</script>

<template>
  <div class="salarie-detail">
    <header class="page-header">
      <button @click="goBack" class="btn-back">← Retour à la liste</button>
      <h1>Fiche salarié</h1>
      <button @click="loadData" :disabled="loading" class="btn-refresh">
        {{ loading ? '⏳ Chargement…' : '🔄 Actualiser' }}
      </button>
      <button @click="goToPay" class="btn-pay-link">Créer / Payer un salaire →</button>
    </header>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="loading && !employee" class="loading">Chargement…</div>

    <div v-else-if="employee" class="content">
      <!-- ── Infos salarié ─────────────────────────────── -->
      <section class="card salarie-card">
        <div class="avatar">{{ initials(employee.name) }}</div>
        <div class="info-grid">
          <div>
            <span class="label">Nom</span>
            <strong>{{ employee.name }}</strong>
          </div>
          <div>
            <span class="label">Référence</span>
            <strong>{{ employee.ref ?? '-' }}</strong>
          </div>
          <div>
            <span class="label">Identifiant</span>
            <strong>{{ employee.login || '-' }}</strong>
          </div>
          <div>
            <span class="label">Genre</span>
            <strong>{{ genderLabel(employee.gender) }}</strong>
          </div>
          <div>
            <span class="label">Poste</span>
            <strong>{{ employee.job || '-' }}</strong>
          </div>
          <div>
            <span class="label">Heures / semaine</span>
            <strong>{{ employee.hours ?? '-' }}</strong>
          </div>
        </div>
      </section>

      <!-- ── Récapitulatif financier ─────────────────────── -->
      <section class="card">
        <h2>Récapitulatif</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Total dû</span>
            <strong>{{ money(totals.due) }}</strong>
          </div>
          <div class="summary-item">
            <span class="label">Total payé</span>
            <strong class="paid">{{ money(totals.paid) }}</strong>
          </div>
          <div class="summary-item highlight">
            <span class="label">Reste à payer</span>
            <strong :class="totals.rest > 0 ? 'due' : 'ok'">
              {{ money(totals.rest) }}
            </strong>
          </div>
          <div class="summary-item">
            <span class="label">Nombre de salaires</span>
            <strong>{{ salaries.length }}</strong>
          </div>
        </div>
      </section>

      <!-- ── Historique salaires + paiements ─────────────── -->
      <section class="card">
        <h2>Historique des salaires et paiements</h2>

        <div v-if="salaries.length === 0" class="empty">
          Aucun salaire enregistré pour ce salarié.
        </div>

        <div v-for="s in salaries" :key="s.id" class="salary-block">
          <div class="salary-head">
            <div>
              <strong>Du {{ tsToFr(s.datesp) }} au {{ tsToFr(s.dateep) }}</strong>
              <span :class="['badge', s.solde ? 'ok' : 'pending']">
                {{ s.solde ? 'Soldé' : 'En cours' }}
              </span>
            </div>
            <div class="salary-amounts">
              Payé <strong>{{ money(s.totalPaye) }}</strong>
              / {{ money(s.amount) }}
              · Reste <strong :class="s.reste > 0 ? 'due' : 'ok'">{{ money(s.reste) }}</strong>
            </div>
          </div>

          <table v-if="s.payments.length" class="payments-table">
            <thead>
              <tr>
                <th>Date de règlement</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in s.payments" :key="i">
                <td>{{ p.date }}</td>
                <td class="amount">{{ money(p.amount) }}</td>
              </tr>
            </tbody>
          </table>

          <p v-else class="no-payments">Aucun règlement pour l'instant.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.salarie-detail {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1e293b;
  flex: 1;
}

.btn-back, .btn-pay-link {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-back { background: #f1f5f9; color: #475569; }
.btn-back:hover { background: #e2e8f0; }
.btn-refresh { background: #3b82f6; color: white; font-weight: 500; }
.btn-refresh:hover:not(:disabled) { background: #2563eb; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-pay-link { background: #10b981; color: white; font-weight: 500; }
.btn-pay-link:hover { background: #059669; }

.content { display: flex; flex-direction: column; gap: 1.5rem; }

.card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  color: #1e293b;
}

.salarie-card {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.avatar {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.5rem;
}

.info-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.info-grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 500;
}

.info-grid strong {
  font-size: 0.95rem;
  color: #1e293b;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
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

.summary-item strong {
  font-size: 1.3rem;
  color: #1e293b;
}

.summary-item .paid { color: #16a34a; }
.summary-item .due  { color: #dc2626; }
.summary-item .ok   { color: #16a34a; }

.salary-block {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.salary-block:last-child { margin-bottom: 0; }

.salary-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.salary-amounts {
  font-size: 0.875rem;
  color: #475569;
}

.salary-amounts .due { color: #dc2626; }
.salary-amounts .ok  { color: #16a34a; }

.badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 500;
}

.badge.ok      { background: #dcfce7; color: #16a34a; }
.badge.pending { background: #fef9c3; color: #ca8a04; }

.payments-table {
  width: 100%;
  border-collapse: collapse;
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

.payments-table .amount { font-weight: 500; color: #1e293b; }

.no-payments {
  padding: 0.5rem;
  font-size: 0.85rem;
  color: #64748b;
  text-align: center;
  background: #f8fafc;
  border-radius: 6px;
}

.loading, .empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.alert.error {
  padding: 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .info-grid { grid-template-columns: 1fr; }
  .salarie-card { flex-direction: column; }
}
</style>