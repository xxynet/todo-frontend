import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useSession } from '../stores/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/todos' },
    {
      path: '/login',
      component: () => import('../views/LoginView.vue'),
      meta: { chrome: false },
    },
    {
      path: '/todos',
      component: () => import('../views/TodosView.vue'),
      meta: { chrome: true, requiresAuth: true },
    },
    {
      path: '/categories',
      component: () => import('../views/CategoriesView.vue'),
      meta: { chrome: true, requiresAuth: true },
    },
    {
      path: '/profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { chrome: true, requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/todos' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  const session = useSession()

  await auth.validateStoredSession()

  if (to.meta.requiresAuth && !session.isAuthenticated.value) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    }
  }
  if (to.path === '/login' && session.isAuthenticated.value) {
    return { path: '/todos' }
  }
  return true
})

export { router }
