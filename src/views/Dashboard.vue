 <template>
  <div class="dashboard">
    <el-container class="dashboard-container">
      <el-aside width="240px" class="dashboard-aside">
        <div class="logo-container">
          <img src="../assets/graph-logo.svg" alt="TGraph Logo" class="logo" />
          <h2>TGraph</h2>
        </div>
        <el-menu
          :router="true"
          :default-active="activeMenu"
          class="dashboard-menu"
          background-color="#001529"
          text-color="#fff"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/dashboard/graph">
            <el-icon><Share /></el-icon>
            <span>图谱视图</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/nodes">
            <el-icon><Connection /></el-icon>
            <span>节点管理</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/relationships">
            <el-icon><Link /></el-icon>
            <span>关系管理</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/database">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据库管理</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/system">
            <el-icon><Monitor /></el-icon>
            <span>系统信息</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/map">
            <el-icon><Location /></el-icon>
            <span>地图可视化</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/import">
            <el-icon><Upload /></el-icon>
            <span>数据导入</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <el-container class="main-container">
        <el-header class="dashboard-header">
          <div class="header-left">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item>{{ currentRoute }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <div class="db-info" v-if="currentDatabase">
              <el-tag size="small" type="success">当前数据库: {{ currentDatabase }}</el-tag>
            </div>
            <el-dropdown @command="handleCommand">
              <span class="user-dropdown">
                {{ username }}
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
                  <el-dropdown-item command="switchDatabase">切换数据库</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        
        <el-main class="dashboard-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="400px"
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleChangePassword" :loading="passwordLoading">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Share, Connection, Link, DataAnalysis, Monitor, 
  ArrowDown, Location, Upload 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '../api'

const route = useRoute()
const router = useRouter()

// 用户信息
const username = ref('用户')
const currentDatabase = ref(localStorage.getItem('currentDatabase') || '')

// 侧边栏活动菜单
const activeMenu = computed(() => route.path)

// 当前路由名称
const currentRoute = computed(() => {
  const path = route.path
  if (path.includes('graph')) return '图谱视图'
  if (path.includes('nodes')) return '节点管理'
  if (path.includes('relationships')) return '关系管理'
  if (path.includes('database')) return '数据库管理'
  if (path.includes('system')) return '系统信息'
  if (path.includes('map')) return '地图可视化'
  if (path.includes('import')) return '数据导入'
  return '首页'
})

// 修改密码对话框
const passwordDialogVisible = ref(false)
const passwordLoading = ref(false)
const passwordFormRef = ref(null)

const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入新密码'))
  } else {
    if (passwordForm.confirmPassword !== '') {
      passwordFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, validator: validatePass, trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validatePass2, trigger: 'blur' }
  ]
}

// 下拉菜单命令处理
const handleCommand = (command) => {
  if (command === 'logout') {
    handleLogout()
  } else if (command === 'changePassword') {
    passwordDialogVisible.value = true
  } else if (command === 'switchDatabase') {
    switchDatabase()
  }
}

// 切换数据库
const switchDatabase = () => {
  // 清除当前选择的数据库
  localStorage.removeItem('currentDatabase')
  // 跳转到数据库选择页面
  router.push('/select-database')
}

// 登出
const handleLogout = async () => {
  try {
    await userApi.logout()
    
    // 清除所有用户相关标志
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (error) {
    console.error('登出失败:', error)
    ElMessage.error('登出失败，请稍后再试')
  }
}

// 修改密码
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true
    
    const payload = {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    }
    
    await userApi.changePassword(username.value, payload)
    
    ElMessage.success('密码修改成功')
    passwordDialogVisible.value = false
    
    // 重置表单
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    console.error('密码修改失败:', error)
    ElMessage.error(error.response?.data?.message || '密码修改失败，请稍后再试')
  } finally {
    passwordLoading.value = false
  }
}

// 检查是否已登录
onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return
  }
  
  // 从localStorage获取用户名
  const storedUsername = localStorage.getItem('username')
  if (storedUsername) {
    username.value = storedUsername
  }
  
  try {
    // 这里可以添加获取用户信息的API调用，以显示正确的用户名
    // 例如：const userInfo = await userApi.getCurrentUser()
    // username.value = userInfo.username
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
})
</script>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
}

.dashboard-container {
  width: 100%;
  height: 100%;
}

.dashboard-aside {
  background-color: #001529;
  height: 100%;
  overflow-x: hidden;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: #fff;
  background-color: #002140;
}

.logo {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}

.logo-container h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.dashboard-menu {
  border-right: none;
}

.dashboard-header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  height: 56px;
}

.header-right {
  display: flex;
  align-items: center;
}

.db-info {
  margin-right: 20px;
}

.user-dropdown {
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #333;
}

.user-dropdown .el-icon {
  margin-left: 4px;
}

.dashboard-main {
  background-color: #f0f2f5;
  padding: 20px;
  height: calc(100vh - 56px);
  overflow-y: auto;
}

.main-container {
  flex-direction: column;
  height: 100%;
}

/* 菜单项样式 */
.el-menu-item {
  display: flex !important;
  align-items: center;
}

.el-menu-item .el-icon {
  margin-right: 10px;
}
</style> 