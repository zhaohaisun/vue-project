<template>
  <div class="database-selector">
    <el-card class="selector-card">
      <template #header>
        <div class="card-header">
          <h2>选择数据库</h2>
          <el-button type="primary" size="small" @click="refreshDatabases">
            <el-icon><Refresh /></el-icon>
            刷新列表
          </el-button>
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
        <el-table-column label="操作" width="160">
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
              type="success"
              size="small"
              @click="useDatabase(scope.row.name)"
            >
              使用
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { databaseApi } from '../api'

const router = useRouter()
const databases = ref([])
const loading = ref(true)
const startingDb = ref('')

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

// 使用数据库
const useDatabase = (dbName) => {
  // 将选中的数据库保存到 localStorage
  localStorage.setItem('currentDatabase', dbName)
  
  // 跳转到仪表盘
  router.push('/dashboard/graph')
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

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.loading-container, .empty-container {
  padding: 40px 0;
  text-align: center;
}
</style> 