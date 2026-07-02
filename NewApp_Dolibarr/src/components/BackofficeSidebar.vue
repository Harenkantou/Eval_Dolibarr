<script setup>
import { useRoute } from 'vue-router'
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['toggle'])
const route = useRoute()

const navItems = [
  { label: 'Dashboard', routeName: 'dashboard' },
  { label: 'Import', routeName: 'backoffice-import' },
  { label: 'Reset', routeName: 'backoffice-reset' }
]

function toggleSidebar() {
  emit('toggle')
}
</script>

<template>
  <aside class="backoffice-sidebar" :class="{ collapsed: props.collapsed }">
    <div class="brand-section">
      <div class="brand-icon">🧩</div>
      <div class="brand-copy">
        <strong>BackOffice</strong>
        <span>Admin</span>
      </div>
    </div>

    <nav class="nav-list">
      <router-link
        v-for="item in navItems"
        :key="item.routeName"
        :to="{ name: item.routeName }"
        class="nav-link"
        :class="{ active: route.name === item.routeName }"
      >
        {{ item.label }}
      </router-link>
    </nav>

    <button class="toggle-button" type="button" @click="toggleSidebar">
      <span>{{ props.collapsed ? 'Ouvrir le menu' : 'Réduire le menu' }}</span>
    </button>
  </aside>
</template>

<style scoped>
.backoffice-sidebar {
  min-width: 250px;
  max-width: 280px;
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: #0f172a;
  color: #f8fafc;
  border-radius: 0 28px 28px 0;
  box-shadow: 8px 0 32px rgba(15, 23, 42, 0.12);
  transition: width 0.25s ease, min-width 0.25s ease;
}

.backoffice-sidebar.collapsed {
  min-width: 88px;
  max-width: 88px;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-icon {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(96, 165, 250, 0.18);
  font-size: 1.35rem;
}

.brand-copy strong {
  display: block;
  font-size: 1rem;
}

.brand-copy span {
  color: #94a3b8;
  font-size: 0.82rem;
}

.nav-list {
  display: grid;
  gap: 0.75rem;
}

.nav-link {
  display: block;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.04);
  transition: background 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  background: rgba(255, 255, 255, 0.12);
}

.toggle-button {
  margin-top: auto;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border-radius: 14px;
  padding: 0.95rem 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle-button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.backoffice-sidebar.collapsed .brand-copy,
.backoffice-sidebar.collapsed .nav-link {
  text-align: center;
}

.backoffice-sidebar.collapsed .brand-copy strong,
.backoffice-sidebar.collapsed .brand-copy span {
  display: none;
}

.backoffice-sidebar.collapsed .nav-link {
  padding-left: 0.95rem;
  padding-right: 0.95rem;
}

@media (max-width: 860px) {
  .backoffice-sidebar {
    position: fixed;
    inset: 0 auto auto 0;
    z-index: 20;
    width: 100%;
    max-width: none;
    border-radius: 0 0 24px 0;
  }
}
</style>
