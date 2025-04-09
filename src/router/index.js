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
    path: '/select-database',
    name: 'DatabaseSelector',
    component: () => import('../views/DatabaseSelector.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true, requiresDatabase: true },
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
      },
      {
        path: 'map',
        name: 'MapVisualization',
        component: () => import('../views/MapVisualization.vue')
      },
      {
        path: 'import',
        name: 'DataImport',
        component: () => import('../views/DataImport.vue')
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
  const hasSelectedDatabase = localStorage.getItem('currentDatabase')
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({ name: 'Login' })
    } else if (to.matched.some(record => record.meta.requiresDatabase) && !hasSelectedDatabase) {
      // 已登录但未选择数据库，重定向到数据库选择页面
      next({ name: 'DatabaseSelector' })
    } else {
      next()
    }
  } else {
    if (to.name === 'Login' && isAuthenticated) {
      // 已登录用户访问登录页，重定向到数据库选择或仪表盘
      if (hasSelectedDatabase) {
        next({ name: 'GraphView' })
      } else {
        next({ name: 'DatabaseSelector' })
      }
    } else {
      next()
    }
  }
})

export default router 