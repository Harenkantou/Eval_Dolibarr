import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginView from '@/views/backoffice/LoginView.vue'
import DashboardView from '@/views/backoffice/DashboardView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/backoffice',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  { path: '/', redirect: { name: 'login' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  next()
})

export default router