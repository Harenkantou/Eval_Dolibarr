<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="dashboard">
    <div class="panel">
      <h1>Back Office</h1>
      <p>Cette page est protégée et n’est accessible qu’après authentification.</p>
      <button @click="logout">Se déconnecter</button>
    </div>
  </div>
</template>

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
