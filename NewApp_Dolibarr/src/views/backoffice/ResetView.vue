<!-- src/views/backoffice/ResetView.vue -->
<template>
  <div class="page">
    <h1>🔄 Réinitialisation</h1>

    <!-- ── Avertissement ──────────────────────────────────── -->
    <div class="warning">
      ⚠️ Cette action supprime les données dans Dolibarr. Irréversible.
    </div>

    <!-- ── Sélecteur de type ─────────────────────────────── -->
    <div class="card">

      <div class="field">
        <label>Que voulez-vous réinitialiser ?</label>
        <select v-model="resetType" :disabled="loading">
          <option value="all">💣 Tout (salaires + employés)</option>
          <option value="salaries">💰 Salaires uniquement</option>
          <option value="employees">👥 Employés uniquement</option>
          <option value="joursFeries"> Jours Fériés uniquement</option>
        </select>
      </div>

      <!-- Bouton unique -->
      <button
        class="btn-danger"
        :disabled="loading"
        @click="handleReset"
      >
        {{ loading ? '⏳ Suppression en cours...' : '🗑️ Réinitialiser' }}
      </button>

    </div>

    <!-- ── Barre de progression ───────────────────────────── -->
    <div v-if="loading" class="card">

      <p class="step-label">{{ stepLabel }}</p>

      <div class="progress-track">
        <div
          class="progress-bar"
          :style="{ width: progressPct + '%' }"
        ></div>
      </div>

      <p class="progress-text">
        {{ progress.current }} / {{ progress.total }}
        ({{ progressPct }}%)
      </p>

    </div>

    <!-- ── Résultat ───────────────────────────────────────── -->
    <div
      v-if="result"
      class="card result"
      :class="result.success ? 'result-ok' : 'result-err'"
    >
      <p class="result-title">
        {{ result.success ? '✅ Réinitialisation réussie' : '⚠️ Terminé avec erreurs' }}
      </p>

      <!-- Résultat reset ALL -->
      <ul v-if="result.salaries && result.employees">
        <li>
          💰 Salaires supprimés :
          <strong>{{ result.salaries.deleted }}</strong>
          <span v-if="result.salaries.errors > 0" class="err-count">
            ({{ result.salaries.errors }} erreur(s))
          </span>
        </li>
        <li>
          👥 Employés supprimés :
          <strong>{{ result.employees.deleted }}</strong>
          <span v-if="result.employees.errors > 0" class="err-count">
            ({{ result.employees.errors }} erreur(s))
          </span>
        </li>
        <li v-if="result.joursFeries">
        📅 Jours fériés supprimés :
        <strong>{{ result.joursFeries.deleted }}</strong>
        <span v-if="result.joursFeries.errors > 0" class="err-count">
          ({{ result.joursFeries.errors }} erreur(s))
        </span>
        </li>
      </ul>

      <!-- Résultat reset partiel -->
      <ul v-else>
        <li>
          Éléments supprimés : <strong>{{ result.deleted }}</strong>
          <span v-if="result.errors > 0" class="err-count">
            ({{ result.errors }} erreur(s))
          </span>
        </li>
      </ul>

      <p v-if="result.error" class="error-msg">{{ result.error }}</p>

    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import {
  resetAll,
  resetSalaries,
  resetEmployees,
  resetJoursFeries
} from '@/services/resetService'

// ── État ──────────────────────────────────────────────────────
const resetType = ref('all')
const loading   = ref(false)
const result    = ref(null)

const progress = reactive({ current: 0, total: 0, step: '' })

// ── Labels ────────────────────────────────────────────────────
const typeLabels = {
  all      : 'toutes les données',
  salaries : 'les salaires',
  employees: 'les employés',
  joursFeries: 'les jours fériés'
}

// ── Pourcentage ───────────────────────────────────────────────
const progressPct = computed(() =>
  progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0
)

// ── Label étape ───────────────────────────────────────────────
const stepLabel = computed(() => {
  const labels = {
    salaries : '💰 Suppression des salaires...',
    employees: '👥 Suppression des employés...',
    documents  : '🖼️ Suppression des images...',
    joursFeries: '📅 Suppression des jours fériés...'
  }
  return labels[progress.step] || '⏳ Initialisation...'
})

// ── Callback de progression ───────────────────────────────────
const onProgress = ({ step, current, total }) => {
  progress.step    = step    || resetType.value
  progress.current = current
  progress.total   = total
}

// ── Handler unique ────────────────────────────────────────────
const handleReset = async () => {
  const label = typeLabels[resetType.value]
  if (!confirm(`Réinitialiser ${label} ? Cette action est irréversible.`)) return

  loading.value    = true
  result.value     = null
  progress.current = 0
  progress.total   = 0
  progress.step    = ''

  try {
    if (resetType.value === 'all') {
      result.value = await resetAll(onProgress)
    } else if (resetType.value === 'salaries') {
      result.value = await resetSalaries(onProgress)
    } else if (resetType.value === 'joursFeries') {
      result.value = await resetJoursFeries(onProgress)
    } else {
      result.value = await resetEmployees(onProgress)
    }
  } catch (err) {
    result.value = { success: false, error: err.message }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 560px;
  margin   : 0 auto;
  padding  : 24px 16px;
}

h1 {
  font-size    : 22px;
  margin-bottom: 16px;
  color        : #2c3e50;
}

/* ── Avertissement ──────────────────────────────────────────── */
.warning {
  background   : #fff3cd;
  border       : 1px solid #ffc107;
  border-radius: 6px;
  padding      : 10px 14px;
  font-size    : 13px;
  margin-bottom: 16px;
  color        : #856404;
}

/* ── Carte ──────────────────────────────────────────────────── */
.card {
  background   : #fff;
  border       : 1px solid #e0e0e0;
  border-radius: 8px;
  padding      : 20px;
  margin-bottom: 16px;
}

/* ── Champ ──────────────────────────────────────────────────── */
.field {
  margin-bottom: 16px;
}

.field label {
  display      : block;
  font-weight  : 600;
  font-size    : 14px;
  margin-bottom: 8px;
  color        : #333;
}

.field select {
  width        : 100%;
  padding      : 10px;
  border       : 1px solid #ccc;
  border-radius: 6px;
  font-size    : 14px;
  background   : #fff;
  cursor       : pointer;
}

.field select:disabled {
  background: #f5f5f5;
  cursor    : not-allowed;
}

/* ── Bouton ─────────────────────────────────────────────────── */
.btn-danger {
  width        : 100%;
  padding      : 12px;
  background   : #e74c3c;
  color        : #fff;
  border       : none;
  border-radius: 6px;
  font-size    : 15px;
  cursor       : pointer;
}

.btn-danger:disabled {
  background: #c0392b;
  opacity   : 0.6;
  cursor    : not-allowed;
}

.btn-danger:not(:disabled):hover {
  background: #c0392b;
}

/* ── Progression ────────────────────────────────────────────── */
.step-label {
  font-size    : 14px;
  font-weight  : 600;
  margin-bottom: 10px;
  color        : #2c3e50;
}

.progress-track {
  background   : #ecf0f1;
  border-radius: 20px;
  height       : 12px;
  overflow     : hidden;
}

.progress-bar {
  height          : 100%;
  background      : #e74c3c;
  border-radius   : 20px;
  transition      : width 0.3s ease;
}

.progress-text {
  font-size : 13px;
  color     : #666;
  margin-top: 6px;
  text-align: right;
}

/* ── Résultat ───────────────────────────────────────────────── */
.result-title {
  font-weight  : 700;
  font-size    : 16px;
  margin-bottom: 10px;
}

.result ul {
  list-style: none;
  padding   : 0;
}

.result ul li {
  font-size    : 14px;
  margin-bottom: 4px;
  color        : #333;
}

.result-ok {
  border-color    : #2ecc71;
  background-color: #f0fff4;
}

.result-err {
  border-color    : #e74c3c;
  background-color: #fff5f5;
}

.error-msg {
  color    : #e74c3c;
  font-size: 14px;
}

.err-count {
  color    : #e74c3c;
  font-size: 12px;
}
</style>