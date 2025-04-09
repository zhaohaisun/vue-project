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

// 导入节点
const importNodesData = async () => {
  try {
    nodeLoading.value = true
    nodeResult.value = ''
    
    // 执行导入
    const result = await importNodes(nodeCsvPath.value)
    nodeResult.value = `成功导入 ${result.length} 个节点`
    ElMessage.success(nodeResult.value)
  } catch (error) {
    nodeResult.value = `导入失败: ${error.message}`
    ElMessage.error(nodeResult.value)
  } finally {
    nodeLoading.value = false
  }
}

// 导入关系
const importRelationshipsData = async () => {
  try {
    edgeLoading.value = true
    edgeResult.value = ''
    
    // 执行导入
    const result = await importRelationships(edgeCsvPath.value)
    edgeResult.value = `成功导入 ${result.length} 条边`
    ElMessage.success(edgeResult.value)
  } catch (error) {
    edgeResult.value = `导入失败: ${error.message}`
    ElMessage.error(edgeResult.value)
  } finally {
    edgeLoading.value = false
  }
}
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
</style> 