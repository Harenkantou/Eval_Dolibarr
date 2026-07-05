import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore }                   from '@/stores/auth'

import LoginView       from '@/views/backoffice/LoginView.vue'
import DashboardView   from '@/views/backoffice/DashboardView.vue'
import ImportView      from '@/views/backoffice/ImportView.vue'
import ResetView       from '@/views/backoffice/ResetView.vue'
import SwitchSpaceView from '@/views/SwitchSpaceView.vue'
import FrontofficeHome from '@/views/frontoffice/HomeView.vue'
import SalarieList     from '@/views/frontoffice/SalarieList.vue'
import SalariePay      from '@/views/frontoffice/SalariePay.vue'

const routes = [
  {
    path     : '/select-space',
    name     : 'select-space',
    component: SwitchSpaceView
  },
  {
    path     : '/frontoffice',
    name     : 'frontoffice-home',
    component: FrontofficeHome
  },
  {
    path     : '/frontoffice/salaries',
    name     : 'frontoffice-salaries',
    component: SalarieList
  },
  {
    path     : '/frontoffice/salaries/:id/pay',
    name     : 'frontoffice-salarie-pay',
    component: SalariePay
  },
  {
    path     : '/salaries',
    redirect : { name: 'frontoffice-salaries' }
  },
  {
    path     : '/salaries/:id/pay',
    redirect: to => ({ name: 'frontoffice-salarie-pay', params: to.params })
  },
  {
    path     : '/login',
    name     : 'login',
    component: LoginView
  },
  {
    path     : '/backoffice',
    name     : 'dashboard',
    component: DashboardView,
    meta     : { requiresAuth: true }
  },
  {
    path     : '/backoffice/import',
    name     : 'backoffice-import',
    component: ImportView,
    meta     : { requiresAuth: true }
  },
  {
    path     : '/backoffice/reset',
    name     : 'backoffice-reset',
    component: ResetView,
    meta     : { requiresAuth: true }
  },
  {
    path    : '/',
    redirect: { name: 'select-space' }
  }

  //FrontOffice
  /*{
  path: '/frontoffice',
  redirect: '/salaries'
  },

  {
    path: '/frontoffice/salaries',
    name: 'SalariesList', import ('@/views/SalariesList.vue')
  },*/
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ✅ NOUVELLE façon — sans next()
router.beforeEach((to) => {
  const auth               = useAuthStore()
  const seenSpaceSelection = localStorage.getItem('seenSpaceSelection') === 'true'

  // Redirige vers select-space si pas encore vu
  if (!seenSpaceSelection && to.name !== 'select-space') {
    return { name: 'select-space' }
  }

  // Redirige vers login si page protégée et non connecté
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Laisse passer — pas besoin de next()
})

export default router