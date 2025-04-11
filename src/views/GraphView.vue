<template>
  <div class="graph-view-container">
    <div class="graph-header">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Connection /></el-icon>
                <span>节点总数</span>
              </div>
            </template>
            <div class="card-content">
              <span class="stat-number">{{ stats.nodeCount }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Link /></el-icon>
                <span>关系总数</span>
              </div>
            </template>
            <div class="card-content">
              <span class="stat-number">{{ stats.relationshipCount }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Collection /></el-icon>
                <span>标签总数</span>
              </div>
            </template>
            <div class="card-content">
              <span class="stat-number">{{ stats.labelCount }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-card class="additional-info-card">
      <template #header>
        <div class="card-header">
          <span>数据库概览</span>
          <div>
            <el-tooltip content="刷新数据" placement="top">
              <el-button type="primary" :icon="Refresh" circle @click="loadGraphData" />
            </el-tooltip>
          </div>
        </div>
      </template>
      <div v-if="availableLabels.length > 0" class="info-section">
        <h3>数据库标签</h3>
        <el-tag 
          v-for="label in availableLabels" 
          :key="label" 
          class="label-tag"
          type="info"
          effect="plain"
        >
          {{ label }}
        </el-tag>
      </div>
      <div v-if="relationshipTypes.length > 0" class="info-section">
        <h3>关系类型</h3>
        <el-tag 
          v-for="type in relationshipTypes" 
          :key="type" 
          class="relation-tag"
          type="success"
          effect="plain"
        >
          {{ type }}
        </el-tag>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Connection, Link, Collection, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { nodeApi, relationshipApi, labelApi } from '../api'

// 存储节点和关系数据
const availableLabels = ref([])
const relationshipTypes = ref([])

// 图表统计
const stats = reactive({
  nodeCount: 0,
  relationshipCount: 0,
  labelCount: 0
})

// 加载图数据
const loadGraphData = async () => {
  try {
    // 获取所有标签
    const labelsRes = await labelApi.getAllLabels()
    availableLabels.value = labelsRes.data || []
    stats.labelCount = availableLabels.value.length
    
    // 获取关系类型
    const typesRes = await relationshipApi.getRelationshipTypes()
    relationshipTypes.value = typesRes.data || []
    
    // 获取节点总数
    try {
      const nodesCountRes = await nodeApi.getNodesCount()
      stats.nodeCount = parseInt(nodesCountRes.data) || 0
    } catch (error) {
      console.error('获取节点总数失败:', error)
      stats.nodeCount = 0
    }
    
    // 获取关系总数
    try {
      const relsCountRes = await relationshipApi.getRelationshipsCount()
      stats.relationshipCount = parseInt(relsCountRes.data) || 0
    } catch (error) {
      console.error('获取关系总数失败:', error)
      stats.relationshipCount = 0
    }
    
    ElMessage.success('数据统计刷新成功')
  } catch (error) {
    console.error('加载图数据失败:', error)
    ElMessage.error('加载图数据失败，请检查后端服务是否正常运行')
  }
}

// 生命周期钩子
onMounted(() => {
  loadGraphData()
})
</script>

<style scoped>
.graph-view-container {
  height: 100%;
}

.graph-header {
  margin-bottom: 20px;
}

.additional-info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header .el-icon {
  margin-right: 8px;
}

.card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

.info-section {
  margin-bottom: 20px;
}

.info-section h3 {
  margin-bottom: 10px;
  color: #606266;
}

.label-tag, .relation-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}
</style> 