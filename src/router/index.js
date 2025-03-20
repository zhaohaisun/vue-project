import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'GraphView' }
      },
      {
        path: 'graph',
        name: 'GraphView',
        component: () => import('../views/GraphView.vue')
      },
      {
        path: 'nodes',
        name: 'NodeManagement',
        component: () => import('../views/NodeManagement.vue')
      },
      {
        path: 'relationships',
        name: 'RelationshipManagement',
        component: () => import('../views/RelationshipManagement.vue')
      },
      {
        path: 'database',
        name: 'DatabaseManagement',
        component: () => import('../views/DatabaseManagement.vue')
      },
      {
        path: 'system',
        name: 'SystemInfo',
        component: () => import('../views/SystemInfo.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token')
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({ name: 'Login' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router 