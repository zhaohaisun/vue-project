<template>
  <div class="data-import-container">
    <el-card class="import-card">
      <template #header>
        <div class="card-header">
          <h2>数据导入</h2>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="inner-card">
            <template #header>
              <div class="card-header">
                <h3>节点导入</h3>
              </div>
            </template>
            <el-form>
              <el-form-item>
                <el-input v-model="nodeCsvPath" placeholder="节点CSV文件路径" clearable>
                  <template #prepend>文件路径</template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="importNodesData" :loading="nodeLoading" :disabled="!nodeCsvPath">
                  导入节点数据
                </el-button>
              </el-form-item>
            </el-form>
            <div v-if="nodeResult" class="result-box">
              <p>导入结果: {{ nodeResult }}</p>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card class="inner-card">
            <template #header>
              <div class="card-header">
                <h3>边导入</h3>
              </div>
            </template>
            <el-form>
              <el-form-item>
                <el-input v-model="edgeCsvPath" placeholder="边CSV文件路径" clearable>
                  <template #prepend>文件路径</template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="importRelationshipsData" :loading="edgeLoading" :disabled="!edgeCsvPath">
                  导入边数据
                </el-button>
              </el-form-item>
            </el-form>
            <div v-if="edgeResult" class="result-box">
              <p>导入结果: {{ edgeResult }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-divider />
      
      <div class="log-section">
        <h3>导入日志</h3>
        <el-input
          type="textarea"
          v-model="logOutput"
          :rows="10"
          readonly
          resize="none"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { importNodes, importRelationships } from '../utils/importData'

// 数据
const nodeCsvPath = ref('/data/node-with-latitude-longitude.csv')
const edgeCsvPath = ref('/data/edge-with-road-label.csv')
const nodeLoading = ref(false)
const edgeLoading = ref(false)
const nodeResult = ref('')
const edgeResult = ref('')
const logOutput = ref('准备导入数据...\n')

// 记录日志
const logMessage = (message) => {
  const timestamp = new Date().toLocaleTimeString()
  logOutput.value += `[${timestamp}] ${message}\n`
  // 自动滚动到底部
  const textarea = document.querySelector('.log-section textarea')
  if (textarea) {
    setTimeout(() => {
      textarea.scrollTop = textarea.scrollHeight
    }, 0)
  }
}

// 导入节点
const importNodesData = async () => {
  try {
    nodeLoading.value = true
    nodeResult.value = ''
    logMessage(`开始导入节点数据: ${nodeCsvPath.value}`)
    
    // 重定向console.log以捕获日志
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    
    console.log = (message) => {
      originalConsoleLog(message)
      logMessage(message)
    }
    
    console.error = (message, error) => {
      originalConsoleError(message, error)
      logMessage(`错误: ${message} ${error ? error.message || JSON.stringify(error) : ''}`)
    }
    
    // 执行导入
    const result = await importNodes(nodeCsvPath.value)
    nodeResult.value = `成功导入 ${result.length} 个节点`
    ElMessage.success(nodeResult.value)
    
    // 恢复console
    console.log = originalConsoleLog
    console.error = originalConsoleError
  } catch (error) {
    nodeResult.value = `导入失败: ${error.message}`
    ElMessage.error(nodeResult.value)
    logMessage(`导入节点数据失败: ${error.message}`)
  } finally {
    nodeLoading.value = false
  }
}

// 导入关系
const importRelationshipsData = async () => {
  try {
    edgeLoading.value = true
    edgeResult.value = ''
    logMessage(`开始导入边数据: ${edgeCsvPath.value}`)
    
    // 重定向console.log以捕获日志
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    
    console.log = (message) => {
      originalConsoleLog(message)
      logMessage(message)
    }
    
    console.error = (message, error) => {
      originalConsoleError(message, error)
      logMessage(`错误: ${message} ${error ? error.message || JSON.stringify(error) : ''}`)
    }
    
    // 执行导入
    const result = await importRelationships(edgeCsvPath.value)
    edgeResult.value = `成功导入 ${result.length} 条边`
    ElMessage.success(edgeResult.value)
    
    // 恢复console
    console.log = originalConsoleLog
    console.error = originalConsoleError
  } catch (error) {
    edgeResult.value = `导入失败: ${error.message}`
    ElMessage.error(edgeResult.value)
    logMessage(`导入边数据失败: ${error.message}`)
  } finally {
    edgeLoading.value = false
  }
}

// 页面加载时设置默认路径
onMounted(() => {
  logMessage('页面已加载，请选择数据文件路径并开始导入')
})
</script>

<style scoped>
.data-import-container {
  padding: 20px;
}

.import-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inner-card {
  height: 100%;
  margin-bottom: 20px;
}

.result-box {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.log-section {
  margin-top: 20px;
}

.log-section textarea {
  font-family: monospace;
  font-size: 14px;
  background-color: #f5f7fa;
}
</style> 