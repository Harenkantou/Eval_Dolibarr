import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/salaries'
  },
  {
    path: '/salaries',
    name: 'SalarieList',
    component: () => import('@/views/SalarieList.vue')
  },
  {
    path: '/salaries/:id/pay',
    name: 'SalariePay',
    component: () => import('@/views/SalariePay.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
