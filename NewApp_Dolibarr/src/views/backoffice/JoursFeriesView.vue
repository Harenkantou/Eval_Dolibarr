<!-- src/views/backoffice/JoursFeriesView.vue -->
<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useJoursFeriesStore } from '@/stores/joursFeries'

const store = useJoursFeriesStore()

// ── État du formulaire (création + édition) ──────────────────
const form = reactive({
  id       : null,     // null → création, id → édition
  libelle  : '',
  dateFerie: '',
  recurrent: false
})

const isEditing = ref(false)
const successMsg = ref('')

// ── Reset formulaire ─────────────────────────────────────────
function resetForm() {
  form.id        = null
  form.libelle   = ''
  form.dateFerie = ''
  form.recurrent = false
  isEditing.value = false
}

// ── Soumission formulaire ────────────────────────────────────
async function handleSubmit() {
  successMsg.value = ''
  const payload = {
    libelle  : form.libelle.trim(),
    dateFerie: form.dateFerie,
    recurrent: form.recurrent
  }

  const ok = isEditing.value
    ? await store.update(form.id, payload)
    : await store.create(payload)

  if (ok) {
    successMsg.value = isEditing.value
      ? 'Jour férié mis à jour.'
      : 'Jour férié créé.'
    resetForm()
    setTimeout(() => (successMsg.value = ''), 3000)
  }
}

// ── Édition : préremplir le formulaire ───────────────────────
function handleEdit(jf) {
  form.id        = jf.id
  form.libelle   = jf.libelle
  form.dateFerie = jf.dateFerie
  form.recurrent = jf.recurrent
  isEditing.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Suppression ──────────────────────────────────────────────
async function handleDelete(jf) {
  if (!confirm(`Supprimer le jour férié "${jf.libelle}" (${jf.dateFerie}) ?`)) return
  const ok = await store.remove(jf.id)
  if (ok) {
    successMsg.value = 'Jour férié supprimé.'
    setTimeout(() => (successMsg.value = ''), 3000)
  }
}

const formatDate = (iso) => {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="jours-feries-view">
    <h1>📅 Jours Fériés</h1>
    <p class="subtitle">Gestion locale (SQLite via SpringBoot).</p>

    <!-- ── Formulaire ─────────────────────────────────────── -->
    <div class="form-card">
      <h2>{{ isEditing ? 'Modifier' : 'Ajouter' }} un jour férié</h2>

      <form @submit.prevent="handleSubmit" class="form-grid">
        <div class="form-group">
          <label for="libelle">Libellé</label>
          <input
            id="libelle"
            type="text"
            v-model="form.libelle"
            placeholder="Ex: Nouvel An"
            required
          />
        </div>

        <div class="form-group">
          <label for="dateFerie">Date</label>
          <input
            id="dateFerie"
            type="date"
            v-model="form.dateFerie"
            required
          />
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" v-model="form.recurrent" />
            Récurrent (chaque année)
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="store.loading" class="btn-primary">
            {{ store.loading ? '...' : (isEditing ? 'Enregistrer' : 'Ajouter') }}
          </button>
          <button
            v-if="isEditing"
            type="button"
            @click="resetForm"
            class="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </form>

      <div v-if="successMsg" class="alert success">{{ successMsg }}</div>
      <div v-if="store.error" class="alert error">{{ store.error }}</div>
    </div>

    <!-- ── Liste ──────────────────────────────────────────── -->
    <div class="list-card">
      <div class="list-header">
        <h2>Liste ({{ store.count }})</h2>
        <button @click="store.fetchAll()" :disabled="store.loading" class="btn-refresh">
          {{ store.loading ? 'Chargement...' : 'Actualiser' }}
        </button>
      </div>

      <div v-if="store.loading && store.list.length === 0" class="loading">
        Chargement...
      </div>

      <table v-else-if="store.sortedByDate.length" class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Libellé</th>
            <th>Récurrent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="jf in store.sortedByDate" :key="jf.id">
            <td>{{ formatDate(jf.dateFerie) }}</td>
            <td>{{ jf.libelle }}</td>
            <td>
              <span :class="['badge', jf.recurrent ? 'yes' : 'no']">
                {{ jf.recurrent ? 'Oui' : 'Non' }}
              </span>
            </td>
            <td class="actions">
              <button @click="handleEdit(jf)" class="btn-edit">Modifier</button>
              <button @click="handleDelete(jf)" class="btn-delete">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">Aucun jour férié enregistré.</div>
    </div>
  </div>
</template>

<style scoped>
.jours-feries-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin: 0 0 0.25rem;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 2rem;
  color: #64748b;
  font-size: 0.875rem;
}

.form-card,
.list-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.form-card h2,
.list-card h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: #1e293b;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
}

.form-group input[type="text"],
.form-group input[type="date"] {
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

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  text-transform: none;
  color: #1e293b;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary,
.btn-refresh,
.btn-edit,
.btn-delete {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover:not(:disabled) { background: #2563eb; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary { background: #e2e8f0; color: #475569; }
.btn-secondary:hover { background: #cbd5e1; }

.btn-refresh { background: #3b82f6; color: white; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

.alert {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}
.alert.success { background: #dcfce7; color: #16a34a; }
.alert.error   { background: #fee2e2; color: #dc2626; }

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.list-header h2 { margin: 0; }

.data-table {
  width: 100%;
  border-collapse: collapse;
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

.data-table tbody tr:hover { background: #f8fafc; }

.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}
.badge.yes { background: #dcfce7; color: #16a34a; }
.badge.no  { background: #f1f5f9; color: #64748b; }

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit   { background: #f59e0b; color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem; }
.btn-edit:hover   { background: #d97706; }
.btn-delete { background: #ef4444; color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem; }
.btn-delete:hover { background: #dc2626; }

.loading, .empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>