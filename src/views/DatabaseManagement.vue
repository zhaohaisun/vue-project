<template>
  <div class="database-management">
    <el-row :gutter="20">
      <el-col :span="24">
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
          
          <el-tabs type="border-card">
            <el-tab-pane label="数据库状态">
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
                </el-descriptions>
                
                <!-- 数据库文件大小详情 -->
                <div class="space-details">
                  <h4>数据库文件大小详情</h4>
                  <el-table 
                    :data="spaceDetails" 
                    style="width: 100%" 
                    size="small" 
                    border 
                    stripe
                    :header-cell-style="{ backgroundColor: '#f5f7fa' }"
                  >
                    <el-table-column prop="name" label="数据类型" width="180" />
                    <el-table-column prop="size" label="大小" />
                  </el-table>
                  <div class="total-size">
                    <span>总大小: <strong>{{ calculateTotalSize() }}</strong></span>
                  </div>
                </div>
                
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
                    :disabled="databaseInfo.status === 'running'" 
                    @click="backupDatabase"
                    :loading="backupLoading"
                  >
                    备份数据库
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="HTTP日志">
              <div class="http-logs-container">
                <div class="logs-header">
                  <h3>系统HTTP请求日志</h3>
                  <el-button type="primary" size="small" @click="fetchHttpLogs" :loading="logsLoading">
                    <el-icon><Refresh /></el-icon> 刷新日志
                  </el-button>
                </div>
                
                <div v-if="logsLoading" class="logs-loading">
                  <el-skeleton :rows="10" animated />
                </div>
                
                <div v-else class="logs-content">
                  <pre class="logs-pre">{{ httpLogsContent }}</pre>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { databaseApi, userApi } from '../api'

// 数据加载状态
const startLoading = ref(false)
const stopLoading = ref(false)
const backupLoading = ref(false)

// 监听当前数据库的变化
const currentDatabase = ref(localStorage.getItem('currentDatabase') || 'test')

// 数据库文件大小详情
const spaceDetails = ref([])

// 数据库信息
const databaseInfo = reactive({
  name: currentDatabase.value,
  status: null,
  path: '',
  size: 0
})

// 创建一个函数来检查localStorage变化
const checkDatabaseChange = () => {
  const storedDb = localStorage.getItem('currentDatabase')
  if (storedDb !== currentDatabase.value) {
    currentDatabase.value = storedDb || 'test'
    databaseInfo.name = currentDatabase.value
    fetchDatabaseInfo()
  }
}

// 添加存储事件监听器，当其他标签页改变localStorage时触发更新
window.addEventListener('storage', (e) => {
  if (e.key === 'currentDatabase') {
    checkDatabaseChange()
  }
})

// 每次组件激活时检查数据库是否变化
const checkInterval = setInterval(checkDatabaseChange, 2000)

// 组件卸载时清除计时器和事件监听器
onUnmounted(() => {
  clearInterval(checkInterval)
  window.removeEventListener('storage', checkDatabaseChange)
})

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
    
    // 获取数据库空间详细统计信息
    if (sizeRes.data?.space_statistics) {
      // 将对象转换为数组格式以便表格展示
      spaceDetails.value = Object.entries(sizeRes.data.space_statistics).map(([key, value]) => {
        return {
          name: formatSpaceName(key),
          size: value
        }
      })
    } else {
      spaceDetails.value = []
    }
  } catch (error) {
    console.error('获取数据库信息失败:', error)
    ElMessage.error('获取数据库信息失败')
  }
}

// 格式化空间名称，将下划线分隔的名称转换为更易读的格式
const formatSpaceName = (name) => {
  return name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

// 计算数据库总大小
const calculateTotalSize = () => {
  // 如果没有空间数据，返回0
  if (!spaceDetails.value || spaceDetails.value.length === 0) {
    return '0 B'
  }
  
  // 遍历所有空间数据，尝试提取数值部分并累加
  let totalBytes = 0
  
  spaceDetails.value.forEach(item => {
    const sizeStr = item.size
    if (typeof sizeStr === 'string') {
      const matches = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/i)
      if (matches) {
        const size = parseFloat(matches[1])
        const unit = matches[2].toUpperCase()
        
        // 转换为字节
        const unitMultipliers = {
          'B': 1,
          'KB': 1024,
          'MB': 1024 * 1024,
          'GB': 1024 * 1024 * 1024,
          'TB': 1024 * 1024 * 1024 * 1024
        }
        
        totalBytes += size * (unitMultipliers[unit] || 1)
      }
    }
  })
  
  // 格式化总大小
  return formatFileSize(totalBytes)
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

// HTTP日志相关
const httpLogs = ref([])
const httpLogsContent = ref('')
const logsLoading = ref(false)

// 获取HTTP日志
const fetchHttpLogs = async () => {
  logsLoading.value = true
  try {
    const response = await userApi.getUserLogs()
    // 保存原始响应数据
    httpLogs.value = response.data || []
    // 格式化为JSON字符串显示
    httpLogsContent.value = JSON.stringify(response.data, null, 2)
  } catch (error) {
    console.error('获取HTTP日志失败:', error)
    ElMessage.error('获取HTTP日志失败')
    httpLogsContent.value = '获取日志失败: ' + (error.message || '未知错误')
  } finally {
    logsLoading.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchDatabaseInfo()
  fetchHttpLogs()
})
</script>

<style scoped>
.database-management {
  height: 100%;
}

.db-card {
  height: calc(100vh - 130px);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.db-status-container {
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

.space-details {
  margin-bottom: 20px;
}

.space-details h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #606266;
}

.total-size {
  margin-top: 10px;
  text-align: right;
  padding-right: 10px;
  font-size: 14px;
  color: #606266;
}

.total-size strong {
  color: #409EFF;
  font-weight: bold;
}

.db-actions {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 20px;
}

.http-logs-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.logs-header h3 {
  margin: 0;
}

.logs-loading, .empty-logs {
  padding: 20px 0;
  text-align: center;
}

.logs-content {
  overflow-y: auto;
  max-height: calc(100vh - 250px);
}

.logs-pre {
  background-color: #f7f9fb;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}
</style> 