<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function selectSpace(space) {
  localStorage.setItem('seenSpaceSelection', 'true')
  if (space === 'frontoffice') {
    router.push({ name: 'frontoffice-home' })
  } else {
    router.push({ name: 'login' })
  }
}
</script>

<template>
  <div class="switch-space-page">
    <div class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">Bienvenue dans NewApp Dolibarr</p>
        <h1>Sélectionnez votre espace</h1>
        <p>
          Choisissez le mode d’accès qui correspond à votre usage :
          gestion administrative ou consultation frontale.
        </p>
      </div>

      <div class="space-cards">
        <article class="space-card frontoffice-card">
          <div class="space-icon">🏠</div>
          <h2>FrontOffice</h2>
          <p>Accédez à l’espace client, visualisez les données et consultez le contenu.</p>
          <button @click="selectSpace('frontoffice')">Accéder au FrontOffice</button>
        </article>

        <article class="space-card backoffice-card">
          <div class="space-icon">⚙️</div>
          <h2>BackOffice</h2>
          <p>Accédez à l’administration, importez des fichiers et gérez les réinitialisations.</p>
          <button @click="selectSpace('backoffice')">Accéder au BackOffice</button>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.switch-space-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: radial-gradient(circle at top, #eef2ff 0%, #f8fafc 45%, #ffffff 100%);
}

.hero-panel {
  width: min(1080px, 100%);
  display: grid;
  gap: 2rem;
}

.hero-copy {
  padding: 2rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: #2563eb;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.85rem;
}

h1 {
  margin: 0 0 1rem;
  font-size: clamp(2rem, 3vw, 3rem);
  color: #0f172a;
}

.hero-copy p {
  margin: 0;
  max-width: 58ch;
  color: #475569;
  line-height: 1.75;
}

.space-cards {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.space-card {
  display: grid;
  gap: 1rem;
  padding: 2rem;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.09);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.space-card.frontoffice-card {
  border-color: rgba(59, 130, 246, 0.26);
}

.space-card.backoffice-card {
  border-color: rgba(236, 72, 153, 0.24);
}

.space-icon {
  width: 3.5rem;
  height: 3.5rem;
  display: grid;
  place-items: center;
  font-size: 1.9rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(59,130,246,0.14), rgba(37,99,235,0.15));
}

.space-card h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #0f172a;
}

.space-card p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.space-card button {
  width: fit-content;
  padding: 0.95rem 1.4rem;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.space-card button:hover {
  transform: translateY(-1px);
}

.space-card.frontoffice-card button {
  background: #2563eb;
  color: white;
}

.space-card.backoffice-card button {
  background: #db2777;
  color: white;
}

@media (max-width: 860px) {
  .space-cards {
    grid-template-columns: 1fr;
  }
}
</style>
