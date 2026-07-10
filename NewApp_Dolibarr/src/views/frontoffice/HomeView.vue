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

function goToSalariesAll() {
  router.push({ name: 'frontoffice-salaries-all' })
}

function goToSalariesGenerate() {
  router.push({ name: 'frontoffice-salaries-generate' })
}

function goToSalariesGenerateMonthly() {
  router.push({ name: 'frontoffice-salaries-generate-monthly' })
}

function goToListSalary() {
  router.push({ name: 'frontoffice-salaries-history' })
}

function goToPayGenerate() {
  router.push({ name: 'frontoffice-payment-generate' })
}

function goToResteMensuel() {
  router.push({ name: 'frontoffice-reste-mensuel' })
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
          <button class="secondary" @click="goToListSalary">Voir la liste des salaires </button>
          <!-- <button class="secondary" @click="goToPayGenerate">Voir la page liste générer paiement </button>
 -->        </div>
      </div>
    </section>

    <section class="quick-links">
      <h2>Accès rapide</h2>
      <div class="links-grid">
        <article class="quick-card">
          <span class="card-icon">🔍</span>
          <h3>Rechercher un salarié</h3>
          <p>Liste avec recherche multi-critères, création et paiement d'un salaire.</p>
          <button class="inline-action" @click="goToSalaries">Ouvrir</button>
        </article>

        <article class="quick-card">
          <span class="card-icon">📋</span>
          <h3>Liste complète</h3>
          <p>Consultez la fiche détaillée de chaque salarié : infos, historique et reste à payer.</p>
          <button class="inline-action" @click="goToSalariesAll">Ouvrir</button>
        </article>

        <article class="quick-card highlight">
          <span class="card-icon">⚡</span>
          <h3>Générer salaires en masse</h3>
          <p>Filtrez les salariés (poste, genre, heures) puis créez plusieurs salaires en une fois.</p>
          <button class="inline-action alt" @click="goToSalariesGenerate">Ouvrir</button>
        </article>
        <article class="quick-card highlight">
          <span class="card-icon">📅</span>
          <h3>Générer par mois (jours fériés)</h3>
          <p>Générez les salaires des jours non couverts d'un mois, avec majoration des jours fériés.</p>
          <button class="inline-action alt" @click="goToSalariesGenerateMonthly">Ouvrir</button>
        </article>

         <article class="quick-card highlight">
          <span class="card-icon">📅</span>
          <h3>Generer paiement </h3>
          <p>Veuillez entrer le paiement</p>
          <button class="inline-action alt" @click="goToPayGenerate">Ouvrir</button>
        </article>


        <article class="quick-card highlight">
          <span class="card-icon">📅</span>
          <h3>Reste à payer par mois </h3>
          <p>Veuillez voir le reste à payer mensuel dans cette page</p>
          <button class="inline-action alt" @click="goToPayGenerateReste">Ouvrir</button>
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

.primary   { background: #2563eb; color: white; }
.secondary { background: rgba(37, 99, 235, 0.08); color: #1d4ed8; }

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

.stat-card p { margin: 0; color: #64748b; }

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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quick-card .card-icon {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.quick-card h3 {
  margin: 0;
  color: #0f172a;
}

.quick-card p {
  margin: 0;
  color: #475569;
  line-height: 1.65;
  flex: 1;
}

.quick-card.highlight {
  background: linear-gradient(135deg, #2563eb, #10b981);
  border-color: transparent;
  color: white;
}

.quick-card.highlight h3,
.quick-card.highlight p { color: white; }

.inline-action {
  margin-top: 1rem;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  background: #2563eb;
  color: white;
  cursor: pointer;
  font-weight: 600;
  align-self: flex-start;
}

.inline-action.alt {
  background: white;
  color: #2563eb;
}

@media (max-width: 960px) {
  .hero-panel,
  .links-grid { grid-template-columns: 1fr; }
}
</style>