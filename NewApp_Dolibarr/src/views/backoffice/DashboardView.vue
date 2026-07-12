<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BackofficeLayout from '@/components/BackofficeLayout.vue'
import { getDashboardStats, formatMoney } from '@/services/dashboardService'

const auth = useAuthStore()
const router = useRouter()

// ── État ──────────────────────────────────────────────────────
const loading = ref(true)
const error   = ref('')
const stats   = ref(null)

// ── Chargement des statistiques au montage ────────────────────
async function loadStats() {
  loading.value = true
  error.value   = ''
  try {
    stats.value = await getDashboardStats()
  } catch (e) {
    error.value = e.message || 'Impossible de charger les statistiques.'
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)

// ── Genre : total pour calculer les proportions des barres ────
const genderTotal = computed(() => {
  if (!stats.value) return 0
  const g = stats.value.byGender
  return g.man + g.woman + g.unknown
})

const pct = (part) =>
  genderTotal.value > 0 ? Math.round((part / genderTotal.value) * 100) : 0

// ── Mois : max pour dimensionner les barres ───────────────────
const monthMax = computed(() => {
  if (!stats.value || stats.value.byMonth.length === 0) return 0
  return Math.max(...stats.value.byMonth.map(m => m.total))
})

const monthPct = (total) =>
  monthMax.value > 0 ? Math.round((total / monthMax.value) * 100) : 0

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <BackofficeLayout>
    <section class="dashboard-overview">
      <!-- ── En-tête ─────────────────────────────────────────── -->
      <div class="headline-card">
        <div>
          <p class="eyebrow">Dashboard</p>
          <h1>Statistiques des salaires</h1>
          <p>Montant de salaire par genre et par mois (date de début comme référence).</p>
        </div>
        <div class="head-actions">
          <button class="refresh-button" :disabled="loading" @click="loadStats">
            {{ loading ? '⏳' : '🔄' }} Actualiser
          </button>
          <button class="logout-button" @click="logout">Se déconnecter</button>
        </div>
      </div>

      <!-- ── Chargement / erreur ─────────────────────────────── -->
      <div v-if="loading" class="state-card">⏳ Chargement des statistiques…</div>
      <div v-else-if="error" class="state-card state-error">❌ {{ error }}</div>

      <template v-else-if="stats">
        <!-- ── Bandeau de totaux ─────────────────────────────── -->
        <div class="stats-grid">
          <article class="stat-card">
            <span class="stat-title">Total salaires</span>
            <strong>{{ stats.totalSalaries }}</strong>
            <p>Nombre de fiches de salaire enregistrées.</p>
          </article>
          <article class="stat-card">
            <span class="stat-title">Montant total</span>
            <strong>{{ formatMoney(stats.totalAmount) }}</strong>
            <p>Somme de tous les salaires dus.</p>
          </article>
          <article class="stat-card">
            <span class="stat-title">Mois couverts</span>
            <strong>{{ stats.byMonth.length }}</strong>
            <p>Mois distincts avec au moins un salaire.</p>
          </article>
        </div>

        <!-- ── Montant par genre ─────────────────────────────── -->
        <article class="panel">
          <h2>💶 Montant de salaire par genre</h2>

          <div class="gender-row">
            <span class="gender-label">👨 Hommes</span>
            <div class="bar-track">
              <div class="bar-fill man" :style="{ width: pct(stats.byGender.man) + '%' }"></div>
            </div>
            <span class="gender-amount">{{ formatMoney(stats.byGender.man) }}</span>
          </div>

          <div class="gender-row">
            <span class="gender-label">👩 Femmes</span>
            <div class="bar-track">
              <div class="bar-fill woman" :style="{ width: pct(stats.byGender.woman) + '%' }"></div>
            </div>
            <span class="gender-amount">{{ formatMoney(stats.byGender.woman) }}</span>
          </div>

          <div v-if="stats.byGender.unknown > 0" class="gender-row">
            <span class="gender-label">❓ Non renseigné</span>
            <div class="bar-track">
              <div class="bar-fill unknown" :style="{ width: pct(stats.byGender.unknown) + '%' }"></div>
            </div>
            <span class="gender-amount">{{ formatMoney(stats.byGender.unknown) }}</span>
          </div>

          <p class="panel-total">
            Total général : <strong>{{ formatMoney(stats.totalAmount) }}</strong>
          </p>
        </article>

        <!-- ── Montant par mois ──────────────────────────────── -->
        <article class="panel">
          <h2>📅 Montant de salaire par mois (date de début)</h2>

          <p v-if="stats.byMonth.length === 0" class="empty">
            Aucun salaire enregistré pour le moment.
          </p>

          <div v-for="m in stats.byMonth" :key="m.month" class="month-row">
            <span class="month-label">{{ m.label }}</span>
            <div class="bar-track">
              <div class="bar-fill month" :style="{ width: monthPct(m.total) + '%' }"></div>
            </div>
            <span class="month-amount">{{ formatMoney(m.total) }}</span>
          </div>

          <p v-if="stats.byMonth.length" class="panel-total">
            Total général : <strong>{{ formatMoney(stats.totalAmount) }}</strong>
          </p>
        </article>
      </template>
    </section>
  </BackofficeLayout>
</template>

<style scoped>
.dashboard-overview {
  display: grid;
  gap: 1.5rem;
}

.headline-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: #2563eb;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.85rem;
}

.headline-card h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2.5vw, 2.4rem);
  color: #0f172a;
}

.headline-card p {
  margin: 0.75rem 0 0;
  color: #475569;
  line-height: 1.7;
}

.head-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.refresh-button {
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  padding: 0.9rem 1.2rem;
  cursor: pointer;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logout-button {
  border: none;
  border-radius: 12px;
  background: #ef4444;
  color: white;
  padding: 0.9rem 1.2rem;
  cursor: pointer;
}

/* ── États ─────────────────────────────────────────────────── */
.state-card {
  padding: 2rem;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.05);
  color: #475569;
  text-align: center;
}

.state-error {
  color: #b91c1c;
  background: #fff5f5;
  border: 1px solid #fecaca;
}

/* ── Cartes de totaux ──────────────────────────────────────── */
.stats-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat-card {
  padding: 1.75rem;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.stat-title {
  display: block;
  margin-bottom: 1rem;
  color: #475569;
  font-weight: 700;
}

.stat-card strong {
  display: block;
  font-size: 1.75rem;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

.stat-card p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

/* ── Panneaux graphiques ───────────────────────────────────── */
.panel {
  padding: 1.75rem 2rem;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.panel h2 {
  margin: 0 0 1.25rem;
  font-size: 1.15rem;
  color: #0f172a;
}

.empty {
  color: #94a3b8;
  margin: 0;
}

/* ── Lignes de barres (genre + mois) ───────────────────────── */
.gender-row,
.month-row {
  display: grid;
  grid-template-columns: 130px 1fr 120px;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

.gender-label,
.month-label {
  font-weight: 600;
  color: #334155;
  font-size: 0.9rem;
}

.bar-track {
  background: #eef2f7;
  border-radius: 20px;
  height: 14px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 20px;
  transition: width 0.4s ease;
  min-width: 2px;
}

.bar-fill.man     { background: #2563eb; }
.bar-fill.woman   { background: #db2777; }
.bar-fill.unknown { background: #94a3b8; }
.bar-fill.month   { background: #10b981; }

.gender-amount,
.month-amount {
  text-align: right;
  font-weight: 700;
  color: #0f172a;
  font-size: 0.9rem;
}

.panel-total {
  margin: 1.25rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
  text-align: right;
  color: #475569;
}

.panel-total strong {
  color: #0f172a;
  font-size: 1.1rem;
}

@media (max-width: 920px) {
  .headline-card,
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .gender-row,
  .month-row {
    grid-template-columns: 100px 1fr 100px;
  }
}
</style>
