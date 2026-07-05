<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goChangeSpace() {
  router.push({ name: 'select-space' })
}

function goToBackoffice() {
  router.push({ name: 'login' })
}

function goToSalaries() {
  router.push({ name: 'frontoffice-salaries' })
}
</script>

<template>
  <div class="frontoffice-home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">FrontOffice</p>
        <h1>Votre espace de consultation</h1>
        <p>
          Accédez à une présentation claire des informations et retrouvez les actions
          rapides pour suivre vos données Dolibarr.
        </p>

        <div class="hero-actions">
          <button class="primary" @click="goChangeSpace">Changer d’espace</button>
          <button class="secondary" @click="goToBackoffice">Aller au BackOffice</button>
          <button class="secondary" @click="goToSalaries">Voir les salariés</button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="stat-card">
          <span class="stat-label">Utilisateurs</span>
          <strong>124</strong>
          <p>Voir les interactions récentes et contacts importants.</p>
        </div>
        <div class="stat-card">
          <span class="stat-label">Transactions</span>
          <strong>87</strong>
          <p>Suivre les fichiers importés et les opérations en cours.</p>
        </div>
      </div>
    </section>

    <section class="quick-links">
      <h2>Accès rapide</h2>
      <div class="links-grid">
        <article class="quick-card">
          <h3>Salariés</h3>
          <p>Consultez la liste des salariés et ouvrez la page de paiement.</p>
          <button class="inline-action" @click="goToSalaries">Ouvrir</button>
        </article>
        <article class="quick-card">
          <h3>Support</h3>
          <p>Obtenez de l’aide, consultez les ressources ou contactez le support.</p>
        </article>
        <article class="quick-card">
          <h3>Modifications</h3>
          <p>Revoyez les derniers changements avant de passer au BackOffice.</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.frontoffice-home {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%);
}

.hero {
  display: grid;
  gap: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: #2563eb;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.82rem;
}

.hero-copy {
  padding: 2rem;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
}

.hero-copy h1 {
  margin: 0 0 1rem;
  font-size: clamp(2rem, 3vw, 3rem);
  color: #0f172a;
}

.hero-copy p {
  margin: 0 0 1.75rem;
  color: #475569;
  line-height: 1.75;
  max-width: 64ch;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.primary,
.secondary {
  border: none;
  border-radius: 12px;
  padding: 0.95rem 1.5rem;
  font-weight: 700;
  cursor: pointer;
}

.primary {
  background: #2563eb;
  color: white;
}

.secondary {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.hero-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.75rem;
  border-radius: 20px;
  background: white;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
}

.stat-label {
  display: block;
  color: #475569;
  margin-bottom: 1rem;
  font-weight: 600;
}

.stat-card strong {
  display: block;
  font-size: 2.5rem;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

.stat-card p {
  margin: 0;
  color: #64748b;
}

.quick-links {
  max-width: 1100px;
  margin: 2rem auto 0;
}

.quick-links h2 {
  margin-bottom: 1rem;
  color: #0f172a;
}

.links-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.quick-card {
  padding: 1.5rem;
  border-radius: 20px;
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.quick-card h3 {
  margin: 0 0 0.75rem;
  color: #0f172a;
}

.quick-card p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.inline-action {
  margin-top: 1rem;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  background: #2563eb;
  color: white;
  cursor: pointer;
  font-weight: 600;
}

@media (max-width: 960px) {
  .hero-panel,
  .links-grid {
    grid-template-columns: 1fr;
  }
}
</style>
