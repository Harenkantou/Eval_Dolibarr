<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BackofficeLayout from '@/components/BackofficeLayout.vue'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <BackofficeLayout>
    <section class="dashboard-overview">
      <div class="headline-card">
        <div>
          <p class="eyebrow">Dashboard</p>
          <h1>Bienvenue dans le BackOffice</h1>
          <p>Gérez vos imports, réinitialisations et consultez les actions récentes.</p>
        </div>
        <button class="logout-button" @click="logout">Se déconnecter</button>
      </div>

      <div class="stats-grid">
        <article class="stat-card">
          <span class="stat-title">Import</span>
          <strong>4 modules prêts</strong>
          <p>Importez les CSV de manière structurée et suivez l’état de vos données.</p>
        </article>
        <article class="stat-card">
          <span class="stat-title">Sécurité</span>
          <strong>Auth client</strong>
          <p>Le BackOffice reste protégé par le code d’accès existant.</p>
        </article>
        <article class="stat-card">
          <span class="stat-title">Actions</span>
          <strong>Navigation rapide</strong>
          <p>Utilisez la barre latérale pour accéder aux pages Import et Reset.</p>
        </article>
      </div>
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
  font-size: clamp(2rem, 2.5vw, 2.6rem);
  color: #0f172a;
}

.headline-card p {
  margin: 0.75rem 0 0;
  color: #475569;
  line-height: 1.7;
}

.logout-button {
  border: none;
  border-radius: 12px;
  background: #ef4444;
  color: white;
  padding: 0.9rem 1.2rem;
  cursor: pointer;
}

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
  line-height: 1.75;
}

@media (max-width: 920px) {
  .headline-card,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.panel {
  background: #fff;
  padding: 2rem;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  width: min(92vw, 420px);
}
h1 {
  margin: 0 0 0.5rem;
  color: #0f172a;
}
p {
  margin: 0 0 1rem;
  color: #475569;
}
button {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
}
</style>
