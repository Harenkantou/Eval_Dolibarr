<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BackofficeSidebar from '@/components/BackofficeSidebar.vue'

const sidebarCollapsed = ref(false)
const router = useRouter()
const auth = useAuthStore()

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function goSpaceSelection() {
  router.push({ name: 'select-space' })
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="backoffice-layout">
    <BackofficeSidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />

    <div class="layout-content" :class="{ collapsed: sidebarCollapsed }">
      <header class="layout-header">
        <div class="header-title">
          <p>BackOffice</p>
          <h2>Administration</h2>
        </div>

        <div class="header-actions">
          <button class="ghost-button" @click="goSpaceSelection">Changer d’espace</button>
          <button class="primary-button" @click="logout">Déconnexion</button>
        </div>
      </header>

      <main class="layout-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.backoffice-layout {
  min-height: 100vh;
  display: flex;
  background: #f8fafc;
}

.layout-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 2rem;
  transition: margin-left 0.25s ease;
}

.layout-content.collapsed {
  margin-left: 0;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.header-title p {
  margin: 0;
  color: #2563eb;
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.header-title h2 {
  margin: 0.35rem 0 0;
  color: #0f172a;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.ghost-button,
.primary-button {
  border: none;
  border-radius: 12px;
  padding: 0.9rem 1.25rem;
  cursor: pointer;
  font-weight: 700;
}

.ghost-button {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
}

.primary-button {
  background: #2563eb;
  color: #ffffff;
}

.layout-main {
  flex: 1;
}

@media (max-width: 860px) {
  .backoffice-layout {
    flex-direction: column;
  }

  .layout-content {
    padding: 1rem;
  }
}
</style>
