<template>
  <div class="database-management">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="db-card">
          <template #header>
            <div class="card-header">
              <span>数据库管理</span>
              <div>
                <el-tooltip content="刷新" placement="top">
                  <el-button :icon="Refresh" circle @click="fetchDatabaseInfo" />
                </el-tooltip>
              </div>
            </div>
          </template>
          
          <div class="db-status-container">
            <div class="status-header">
              <h3>数据库状态</h3>
              <el-tag 
                v-if="databaseInfo.status" 
                :type="databaseInfo.status === 'running' ? 'success' : 'danger'"
              >
                {{ databaseInfo.status === 'running' ? '运行中' : '已停止' }}
              </el-tag>
            </div>
            
            <el-descriptions border :column="1" class="db-info">
              <el-descriptions-item label="数据库名称">
                {{ databaseInfo.name || 'neo4j-hello-db' }}
              </el-descriptions-item>
              <el-descriptions-item label="数据文件位置">
                {{ databaseInfo.path || '获取中...' }}
              </el-descriptions-item>
              <el-descriptions-item label="数据文件大小">
                {{ formatFileSize(databaseInfo.size) }}
              </el-descriptions-item>
            </el-descriptions>
            
            <div class="db-actions">
              <el-button 
                type="primary" 
                :disabled="databaseInfo.status === 'running'" 
                @click="startDatabase"
                :loading="startLoading"
              >
                启动数据库
              </el-button>
              <el-button 
                type="danger" 
                :disabled="databaseInfo.status !== 'running'" 
                @click="stopDatabase"
                :loading="stopLoading"
              >
                关闭数据库
              </el-button>
              <el-button 
                type="warning" 
                :disabled="databaseInfo.status !== 'running'" 
                @click="backupDatabase"
                :loading="backupLoading"
              >
                备份数据库
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="users-card">
          <template #header>
            <div class="card-header">
              <span>用户管理</span>
              <div>
                <el-tooltip content="刷新" placement="top">
                  <el-button :icon="Refresh" circle @click="fetchUsers" />
                </el-tooltip>
              </div>
            </div>
          </template>
          
          <div class="users-container">
            <el-table
              v-loading="usersLoading"
              :data="users"
              style="width: 100%"
              height="250px"
            >
              <el-table-column prop="username" label="用户名" />
              <el-table-column prop="role" label="角色" />
              <el-table-column prop="status" label="状态">
                <template #default="scope">
                  <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
                    {{ scope.row.status === 'active' ? '在线' : '离线' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="openChangePasswordDialog(scope.row)"
                    :icon="Edit"
                  >
                    修改密码
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="logs-viewer">
              <h3>用户操作日志</h3>
              <el-scrollbar height="200px">
                <div v-if="logs.length > 0" class="logs-content">
                  <div v-for="(log, index) in logs" :key="index" class="log-item">
                    <div class="log-time">{{ formatTime(log.time) }}</div>
                    <div class="log-user">{{ log.user }}</div>
                    <div class="log-action">{{ log.action }}</div>
                  </div>
                </div>
                <div v-else class="no-logs">
                  暂无日志记录
                </div>
              </el-scrollbar>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改用户密码"
      width="400px"
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="120px">
        <el-form-item label="用户名">
          <el-input v-model="passwordForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="passwordForm.password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="changePassword" :loading="changePasswordLoading">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Refresh, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { databaseApi, userApi } from '../api'

// 数据加载状态
const startLoading = ref(false)
const stopLoading = ref(false)
const backupLoading = ref(false)
const usersLoading = ref(false)
const changePasswordLoading = ref(false)

// 数据库信息
const databaseInfo = reactive({
  name: 'neo4j-hello-db',
  status: null,
  path: '',
  size: 0
})

// 用户列表和日志
const users = ref([])
const logs = ref([])

// 修改密码对话框
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const passwordForm = reactive({
  username: '',
  password: ''
})

const passwordRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 个字符', trigger: 'blur' }
  ]
}

// 获取数据库信息
const fetchDatabaseInfo = async () => {
  try {
    // 获取数据库状态
    const statusRes = await databaseApi.getDatabaseStatus(databaseInfo.name)
    databaseInfo.status = statusRes.data?.status || 'stopped'
    
    // 获取数据库路径
    const pathRes = await databaseApi.getDatabasePath(databaseInfo.name)
    databaseInfo.path = pathRes.data?.path || ''
    
    // 获取数据库大小
    const sizeRes = await databaseApi.getDatabaseSpace(databaseInfo.name)
    databaseInfo.size = sizeRes.data?.totalSize || 0
  } catch (error) {
    console.error('获取数据库信息失败:', error)
    ElMessage.error('获取数据库信息失败')
  }
}

// 启动数据库
const startDatabase = async () => {
  startLoading.value = true
  try {
    await databaseApi.startDatabase(databaseInfo.name)
    ElMessage.success('数据库启动成功')
    fetchDatabaseInfo()
  } catch (error) {
    console.error('启动数据库失败:', error)
    ElMessage.error('启动数据库失败')
  } finally {
    startLoading.value = false
  }
}

// 关闭数据库
const stopDatabase = async () => {
  stopLoading.value = true
  try {
    await databaseApi.stopDatabase()
    ElMessage.success('数据库已关闭')
    fetchDatabaseInfo()
  } catch (error) {
    console.error('关闭数据库失败:', error)
    ElMessage.error('关闭数据库失败')
  } finally {
    stopLoading.value = false
  }
}

// 备份数据库
const backupDatabase = async () => {
  backupLoading.value = true
  try {
    await databaseApi.backupDatabase(databaseInfo.name)
    ElMessage.success('数据库备份成功')
  } catch (error) {
    console.error('备份数据库失败:', error)
    ElMessage.error('备份数据库失败')
  } finally {
    backupLoading.value = false
  }
}

// 获取用户列表
const fetchUsers = async () => {
  usersLoading.value = true
  try {
    // 获取用户列表
    const usersRes = await userApi.getUserList()
    users.value = (usersRes.data || []).map(user => ({
      username: user.username,
      role: user.role || 'user',
      status: user.status || 'inactive'
    }))
    
    // 获取用户日志
    const logsRes = await userApi.getUserLogs()
    logs.value = (logsRes.data || []).map(log => ({
      time: log.timestamp,
      user: log.username,
      action: log.action
    }))
  } catch (error) {
    console.error('获取用户数据失败:', error)
    ElMessage.error('获取用户数据失败')
  } finally {
    usersLoading.value = false
  }
}

// 打开修改密码对话框
const openChangePasswordDialog = (user) => {
  passwordForm.username = user.username
  passwordForm.password = ''
  passwordDialogVisible.value = true
}

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    await passwordFormRef.value.validate()
    changePasswordLoading.value = true
    
    const payload = {
      password: passwordForm.password
    }
    
    await userApi.changePassword(passwordForm.username, payload)
    
    ElMessage.success('密码修改成功')
    passwordDialogVisible.value = false
  } catch (error) {
    console.error('密码修改失败:', error)
    ElMessage.error('密码修改失败')
  } finally {
    changePasswordLoading.value = false
  }
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (!size) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let formattedSize = size
  
  while (formattedSize >= 1024 && index < units.length - 1) {
    formattedSize /= 1024
    index++
  }
  
  return `${formattedSize.toFixed(2)} ${units[index]}`
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 页面加载时获取数据
onMounted(() => {
  fetchDatabaseInfo()
  fetchUsers()
})
</script>

<style scoped>
.database-management {
  height: 100%;
}

.db-card,
.users-card {
  height: calc(100vh - 130px);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.db-status-container,
.users-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.status-header h3 {
  margin: 0;
}

.db-info {
  margin-bottom: 20px;
}

.db-actions {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 20px;
}

.logs-viewer {
  margin-top: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.logs-viewer h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.logs-content {
  padding: 0 10px;
}

.log-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.log-time {
  width: 160px;
  color: #999;
  font-size: 14px;
}

.log-user {
  width: 100px;
  font-weight: bold;
}

.log-action {
  flex: 1;
}

.no-logs {
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
}

.relation-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}
</style> 