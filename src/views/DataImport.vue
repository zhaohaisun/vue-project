<template>
  <div class="import-container">
    <el-card class="import-card">
      <template #header>
        <div class="card-header">
          <h2>数据导入工具</h2>
        </div>
      </template>
      
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="选择文件" />
        <el-step title="导入数据" />
        <el-step title="导入结果" />
      </el-steps>
      
      <!-- 第一步：选择文件 -->
      <div v-if="currentStep === 0" class="step-content">
        <el-alert
          v-if="error"
          :title="error"
          type="error"
          show-icon
          @close="error = ''"
        />
        
        <el-form label-position="top">
          <el-form-item label="节点数据文件 (CSV)">
            <el-upload
              ref="nodesUpload"
              action="#"
              :auto-upload="false"
              :on-change="handleNodesFileChange"
              :limit="1"
              accept=".csv"
            >
              <template #trigger>
                <el-button type="primary">选择文件</el-button>
              </template>
              <template #tip>
                <div class="el-upload__tip">
                  请上传包含节点数据的CSV文件。文件应包含Id、latitude和longitude三列
                </div>
              </template>
            </el-upload>
          </el-form-item>
          
          <el-form-item label="关系数据文件 (CSV)">
            <el-upload
              ref="edgesUpload"
              action="#"
              :auto-upload="false"
              :on-change="handleEdgesFileChange"
              :limit="1"
              accept=".csv"
            >
              <template #trigger>
                <el-button type="primary">选择文件</el-button>
              </template>
              <template #tip>
                <div class="el-upload__tip">
                  请上传包含关系数据的CSV文件。文件应包含Source、Target、Type、Id、Label和highwayType列
                </div>
              </template>
            </el-upload>
          </el-form-item>
          
          <el-button 
            type="success" 
            :disabled="!nodesFile || !edgesFile" 
            @click="goToNextStep"
          >
            下一步
          </el-button>
        </el-form>
      </div>
      
      <!-- 第二步：导入数据 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="import-summary">
          <h3>准备导入以下数据:</h3>
          <ul>
            <li>节点数据文件: {{ nodesFile?.name }}</li>
            <li>关系数据文件: {{ edgesFile?.name }}</li>
          </ul>
        </div>
        
        <el-divider />
        
        <div class="import-buttons">
          <el-button @click="currentStep = 0">上一步</el-button>
          <el-button type="primary" @click="startImport" :loading="importing">
            {{ importing ? '导入中...' : '开始导入' }}
          </el-button>
        </div>
        
        <div v-if="importProgress.nodes || importProgress.relationships" class="import-progress">
          <h3>导入进度:</h3>
          
          <div v-if="importProgress.nodes">
            <p>节点导入: {{ importProgress.nodes.current }} / {{ importProgress.nodes.total }}</p>
            <el-progress 
              :percentage="Math.round((importProgress.nodes.current / importProgress.nodes.total) * 100)" 
              :status="importProgress.nodes.complete ? 'success' : ''"
            />
          </div>
          
          <div v-if="importProgress.relationships">
            <p>关系导入: {{ importProgress.relationships.current }} / {{ importProgress.relationships.total }}</p>
            <el-progress 
              :percentage="Math.round((importProgress.relationships.current / importProgress.relationships.total) * 100)" 
              :status="importProgress.relationships.complete ? 'success' : ''"
            />
          </div>
        </div>
      </div>
      
      <!-- 第三步：导入结果 -->
      <div v-if="currentStep === 2" class="step-content">
        <el-result
          :icon="importResult.success ? 'success' : 'error'"
          :title="importResult.success ? '导入成功' : '导入失败'"
          :sub-title="getResultSummary()"
        >
          <template #extra>
            <div class="result-actions">
              <el-button type="primary" @click="resetImport">新的导入</el-button>
            </div>
          </template>
        </el-result>
        
        <el-collapse v-if="importResult.nodesResult || importResult.relationshipsResult">
          <el-collapse-item title="详细导入结果" name="1">
            <el-descriptions v-if="importResult.nodesResult" title="节点导入结果" :column="1" border>
              <el-descriptions-item label="总节点数">{{ importResult.nodesResult.totalNodes }}</el-descriptions-item>
              <el-descriptions-item label="成功导入">{{ importResult.nodesResult.importedCount }}</el-descriptions-item>
              <el-descriptions-item label="失败数量">{{ importResult.nodesResult.errorCount }}</el-descriptions-item>
            </el-descriptions>
            
            <el-descriptions v-if="importResult.relationshipsResult" title="关系导入结果" :column="1" border>
              <el-descriptions-item label="总关系数">{{ importResult.relationshipsResult.totalRelationships }}</el-descriptions-item>
              <el-descriptions-item label="成功导入">{{ importResult.relationshipsResult.importedCount }}</el-descriptions-item>
              <el-descriptions-item label="失败数量">{{ importResult.relationshipsResult.errorCount }}</el-descriptions-item>
            </el-descriptions>
            
            <template v-if="hasErrors()">
              <h4>错误详情</h4>
              <el-collapse>
                <el-collapse-item v-if="importResult.nodesResult?.errors?.length" title="节点导入错误" name="nodes-errors">
                  <el-table :data="importResult.nodesResult.errors">
                    <el-table-column prop="nodeData.Id" label="节点ID" />
                    <el-table-column prop="error" label="错误信息" />
                  </el-table>
                </el-collapse-item>
                
                <el-collapse-item v-if="importResult.relationshipsResult?.errors?.length" title="关系导入错误" name="relationship-errors">
                  <el-table :data="importResult.relationshipsResult.errors">
                    <el-table-column prop="edgeData.Source" label="源节点" />
                    <el-table-column prop="edgeData.Target" label="目标节点" />
                    <el-table-column prop="error" label="错误信息" />
                  </el-table>
                </el-collapse-item>
              </el-collapse>
            </template>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { importNodes, importRelationships, importGraphData } from '../utils/dataimport'

// 当前步骤
const currentStep = ref(0)

// 文件选择
const nodesFile = ref(null)
const edgesFile = ref(null)
const error = ref('')

// 上传组件引用
const nodesUpload = ref(null)
const edgesUpload = ref(null)

// 导入状态
const importing = ref(false)
const importProgress = reactive({
  nodes: null,
  relationships: null
})

// 导入结果
const importResult = reactive({
  success: false,
  nodesResult: null,
  relationshipsResult: null,
  error: null
})

// 处理节点文件选择
const handleNodesFileChange = (file) => {
  if (file) {
    nodesFile.value = file.raw
  }
}

// 处理边文件选择
const handleEdgesFileChange = (file) => {
  if (file) {
    edgesFile.value = file.raw
  }
}

// 下一步
const goToNextStep = () => {
  // 简单验证
  if (!nodesFile.value) {
    error.value = '请选择节点数据文件'
    return
  }
  
  if (!edgesFile.value) {
    error.value = '请选择关系数据文件'
    return
  }
  
  // 检查文件扩展名
  if (!nodesFile.value.name.toLowerCase().endsWith('.csv')) {
    error.value = '节点文件必须是CSV格式'
    return
  }
  
  if (!edgesFile.value.name.toLowerCase().endsWith('.csv')) {
    error.value = '关系文件必须是CSV格式'
    return
  }
  
  // 进入下一步
  currentStep.value = 1
}

// 开始导入
const startImport = async () => {
  try {
    importing.value = true
    
    // 初始化进度
    importProgress.nodes = {
      current: 0,
      total: 0,
      complete: false
    }
    
    importProgress.relationships = {
      current: 0,
      total: 0,
      complete: false
    }
    
    // 执行导入
    const result = await importGraphData(nodesFile.value, edgesFile.value)
    
    // 保存结果
    importResult.success = result.success
    importResult.nodesResult = result.nodesResult
    importResult.relationshipsResult = result.relationshipsResult
    importResult.error = result.error
    
    // 更新进度为完成
    if (importProgress.nodes) {
      importProgress.nodes.complete = true
      importProgress.nodes.current = importProgress.nodes.total
    }
    
    if (importProgress.relationships) {
      importProgress.relationships.complete = true
      importProgress.relationships.current = importProgress.relationships.total
    }
    
    // 进入结果页
    currentStep.value = 2
  } catch (err) {
    ElMessage.error('导入过程中发生错误: ' + err.message)
    importResult.success = false
    importResult.error = err.message
    currentStep.value = 2
  } finally {
    importing.value = false
  }
}

// 获取结果摘要
const getResultSummary = () => {
  if (!importResult.success) {
    return importResult.error || '导入过程中发生错误'
  }
  
  if (importResult.nodesResult && importResult.relationshipsResult) {
    return `成功导入 ${importResult.nodesResult.importedCount} 个节点和 ${importResult.relationshipsResult.importedCount} 条关系`
  }
  
  return '导入完成'
}

// 检查是否有错误
const hasErrors = () => {
  return (
    (importResult.nodesResult && importResult.nodesResult.errorCount > 0) ||
    (importResult.relationshipsResult && importResult.relationshipsResult.errorCount > 0)
  )
}

// 重置导入
const resetImport = () => {
  // 重置文件选择
  nodesFile.value = null
  edgesFile.value = null
  
  // 重置上传组件
  if (nodesUpload.value) {
    nodesUpload.value.clearFiles()
  }
  
  if (edgesUpload.value) {
    edgesUpload.value.clearFiles()
  }
  
  // 重置进度和结果
  importProgress.nodes = null
  importProgress.relationships = null
  
  Object.assign(importResult, {
    success: false,
    nodesResult: null,
    relationshipsResult: null,
    error: null
  })
  
  // 返回第一步
  currentStep.value = 0
}

// 监听导入进度
// 实际应用中，可以通过WebSocket或轮询接口获取实时进度
// 这里只是模拟进度更新
watch(() => importing.value, (val) => {
  if (val && nodesFile.value && edgesFile.value) {
    // 模拟进度更新
    const simulateProgress = () => {
      // 模拟节点导入进度
      if (importProgress.nodes && !importProgress.nodes.complete) {
        importProgress.nodes.total = 100 // 假设有100个节点
        let current = 0
        const interval = setInterval(() => {
          current += Math.floor(Math.random() * 5) + 1
          if (current >= importProgress.nodes.total) {
            current = importProgress.nodes.total
            clearInterval(interval)
            importProgress.nodes.complete = true
            
            // 开始模拟关系导入
            if (importProgress.relationships) {
              simulateRelationshipsProgress()
            }
          }
          importProgress.nodes.current = current
        }, 200)
      }
    }
    
    // 模拟关系导入进度
    const simulateRelationshipsProgress = () => {
      if (importProgress.relationships && !importProgress.relationships.complete) {
        importProgress.relationships.total = 150 // 假设有150个关系
        let current = 0
        const interval = setInterval(() => {
          current += Math.floor(Math.random() * 8) + 1
          if (current >= importProgress.relationships.total) {
            current = importProgress.relationships.total
            clearInterval(interval)
            importProgress.relationships.complete = true
          }
          importProgress.relationships.current = current
        }, 200)
      }
    }
    
    // 开始模拟进度
    simulateProgress()
  }
})
</script>

<style scoped>
.import-container {
  max-width: 900px;
  margin: 20px auto;
}

.import-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-content {
  margin-top: 20px;
  min-height: 300px;
}

.import-summary {
  margin: 20px 0;
}

.import-buttons {
  margin: 20px 0;
  display: flex;
  justify-content: space-between;
}

.import-progress {
  margin-top: 30px;
}

.result-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style> 