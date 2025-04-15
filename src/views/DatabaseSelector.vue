<template>
  <div class="database-selector">
    <el-card class="selector-card">
      <template #header>
        <div class="card-header">
          <h2>选择数据库</h2>
          <div class="header-actions">
            <el-button type="success" size="small" @click="showCreateDatabaseDialog">
              <el-icon><Plus /></el-icon>
              创建数据库
            </el-button>
            <el-button type="primary" size="small" @click="refreshDatabases">
              <el-icon><Refresh /></el-icon>
              刷新列表
            </el-button>
            <el-button type="warning" size="small" @click="showBackupDialog">
              恢复备份
            </el-button>
            <el-button type="danger" size="small" @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-button>
          </div>
        </div>
      </template>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="databases.length === 0" class="empty-container">
        <el-empty description="暂无可用数据库" />
      </div>
      
      <el-table v-else :data="databases" style="width: 100%">
        <el-table-column prop="name" label="数据库名称" />
        <el-table-column label="操作" width="320">
          <template #default="scope">
            <el-button 
              type="primary"
              size="small"
              @click="startDatabase(scope.row.name)"
              :loading="startingDb === scope.row.name"
            >
              启动
            </el-button>
            <el-button 
              type="danger"
              size="small"
              @click="stopDatabase(scope.row.name)"
              :loading="stoppingDb === scope.row.name"
            >
              停止
            </el-button>
            <el-button 
              type="success"
              size="small"
              @click="useDatabase(scope.row.name)"
            >
              使用
            </el-button>
            <el-button 
              type="danger"
              size="small"
              @click="confirmDeleteDatabase(scope.row.name)"
              :loading="deletingDb === scope.row.name"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 恢复备份对话框 -->
    <el-dialog
      v-model="backupDialogVisible"
      title="恢复数据库备份"
      width="600px"
    >
      <div v-if="username" class="filter-info">
        <el-alert
          title="备份文件过滤"
          type="info"
          :closable="false"
          description="当前仅显示以您用户名开头的备份文件"
        />
      </div>
      
      <div v-if="loadingBackups" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="backupList.length === 0" class="empty-container">
        <el-empty description="暂无可用备份" />
      </div>
      
      <el-table v-else :data="backupList" style="width: 100%">
        <el-table-column prop="name" label="备份文件名" />
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button 
              type="primary"
              size="small"
              @click="confirmRestore(scope.row.name)"
              :loading="restoringBackup === scope.row.name"
            >
              恢复
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="backupDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="fetchBackupList">刷新列表</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 创建数据库对话框 -->
    <el-dialog
      v-model="createDatabaseDialogVisible"
      title="创建数据库"
      width="400px"
    >
      <el-form :model="createDatabaseForm" label-width="100px">
        <el-form-item label="数据库名称" required>
          <el-input v-model="createDatabaseForm.name" placeholder="请输入数据库名称"></el-input>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createDatabaseDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="createDatabase" :loading="creatingDb">创建</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Delete, SwitchButton } from '@element-plus/icons-vue'
import { databaseApi, userApi } from '../api'

const router = useRouter()
const databases = ref([])
const loading = ref(true)
const startingDb = ref('')
const stoppingDb = ref('')
const creatingDb = ref(false)
const deletingDb = ref('')

// 创建数据库相关
const createDatabaseDialogVisible = ref(false)
const createDatabaseForm = reactive({
  name: ''
})

// 备份相关
const backupDialogVisible = ref(false)
const backupList = ref([])
const loadingBackups = ref(false)
const restoringBackup = ref('')
const username = ref(localStorage.getItem('username') || '')

// 获取数据库列表
const fetchDatabases = async () => {
  loading.value = true
  try {
    const response = await databaseApi.getUserDatabases()
    // 将简单的名称列表转换为对象数组
    databases.value = response.data.map(name => ({ name }))
  } catch (error) {
    console.error('获取数据库列表失败:', error)
    ElMessage.error('获取数据库列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新数据库列表
const refreshDatabases = () => {
  fetchDatabases()
}

// 启动数据库
const startDatabase = async (dbName) => {
  startingDb.value = dbName
  try {
    await databaseApi.startDatabase(dbName)
    ElMessage.success(`数据库 ${dbName} 启动成功`)
    
    // 自动使用刚启动的数据库
    useDatabase(dbName)
  } catch (error) {
    console.error('启动数据库失败:', error)
    ElMessage.error(`启动数据库 ${dbName} 失败`)
  } finally {
    startingDb.value = ''
  }
}

// 停止数据库
const stopDatabase = async (dbName) => {
  stoppingDb.value = dbName
  try {
    await databaseApi.stopDatabase()
    ElMessage.success(`数据库 ${dbName} 已停止`)
    refreshDatabases()
  } catch (error) {
    console.error('停止数据库失败:', error)
    ElMessage.error(`停止数据库 ${dbName} 失败`)
  } finally {
    stoppingDb.value = ''
  }
}

// 使用数据库
const useDatabase = (dbName) => {
  // 将选中的数据库保存到 localStorage
  localStorage.setItem('currentDatabase', dbName)
  
  // 跳转到仪表盘
  router.push('/dashboard/graph')
}

// 显示备份对话框
const showBackupDialog = () => {
  backupDialogVisible.value = true
  fetchBackupList()
}

// 获取备份列表
const fetchBackupList = async () => {
  loadingBackups.value = true
  try {
    const res = await databaseApi.getBackupList()
    if (res.data && Array.isArray(res.data)) {
      // 过滤备份文件，只显示以当前用户名开头的文件
      const filteredFiles = res.data.filter(filename => {
        // 如果未获取到用户名，则显示所有备份文件
        if (!username.value) return true;
        // 检查文件名是否以用户名开头
        return filename.startsWith(username.value);
      });
      backupList.value = filteredFiles.map(filename => ({ name: filename }))
    }
  } catch (error) {
    console.error('获取备份列表失败:', error)
    ElMessage.error('获取备份列表失败')
  } finally {
    loadingBackups.value = false
  }
}

// 确认恢复备份
const confirmRestore = (filename) => {
  ElMessageBox.confirm(
    '恢复备份会导致当前数据库被删除，确定要继续吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      restoreDatabase(filename)
    })
    .catch(() => {
      ElMessage.info('已取消恢复操作')
    })
}

// 恢复数据库备份
const restoreDatabase = async (filename) => {
  restoringBackup.value = filename
  try {
    await databaseApi.restoreDatabase(filename)
    ElMessage.success('数据库恢复成功')
    backupDialogVisible.value = false
    refreshDatabases()
  } catch (error) {
    console.error('恢复数据库失败:', error)
    ElMessage.error('恢复数据库失败')
  } finally {
    restoringBackup.value = ''
  }
}

// 显示创建数据库对话框
const showCreateDatabaseDialog = () => {
  createDatabaseDialogVisible.value = true
  createDatabaseForm.name = ''
}

// 创建数据库
const createDatabase = async () => {
  if (!createDatabaseForm.name) {
    ElMessage.warning('请输入数据库名称')
    return
  }
  
  creatingDb.value = true
  try {
    await databaseApi.createDatabase(createDatabaseForm.name)
    ElMessage.success(`数据库 ${createDatabaseForm.name} 创建成功`)
    createDatabaseDialogVisible.value = false
    refreshDatabases()
  } catch (error) {
    console.error('创建数据库失败:', error)
    ElMessage.error('创建数据库失败')
  } finally {
    creatingDb.value = false
  }
}

// 确认删除数据库
const confirmDeleteDatabase = (dbName) => {
  ElMessageBox.confirm(
    `您确定要删除数据库 "${dbName}" 吗？此操作无法撤销，数据库中的所有数据将永久丢失！`,
    '警告',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    }
  )
    .then(() => {
      deleteDatabase(dbName)
    })
    .catch(() => {
      ElMessage.info('已取消删除操作')
    })
}

// 删除数据库
const deleteDatabase = async (dbName) => {
  deletingDb.value = dbName
  try {
    await databaseApi.deleteDatabase(dbName)
    ElMessage.success(`数据库 ${dbName} 已成功删除`)
    refreshDatabases()
  } catch (error) {
    console.error('删除数据库失败:', error)
    ElMessage.error(`删除数据库 ${dbName} 失败`)
  } finally {
    deletingDb.value = ''
  }
}

// 退出登录
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

// 组件挂载时获取数据库列表
onMounted(() => {
  fetchDatabases()
})
</script>

<style scoped>
.database-selector {
  max-width: 800px;
  margin: 40px auto;
}

.selector-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.loading-container, .empty-container {
  padding: 40px 0;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.filter-info {
  margin-bottom: 16px;
}
</style> 