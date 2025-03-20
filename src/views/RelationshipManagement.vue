<template>
  <div class="relationship-management">
    <el-card class="relationship-card">
      <template #header>
        <div class="card-header">
          <span>关系管理</span>
          <div>
            <el-tooltip content="刷新" placement="top">
              <el-button :icon="Refresh" circle @click="fetchRelationships" />
            </el-tooltip>
            <el-button type="primary" @click="openAddDialog">创建关系</el-button>
          </div>
        </div>
      </template>
      
      <el-form :inline="true" class="search-form">
        <el-form-item label="关系类型">
          <el-select
            v-model="searchForm.type"
            clearable
            placeholder="选择关系类型"
            @change="handleTypeChange"
          >
            <el-option
              v-for="type in relationshipTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <el-table
        v-loading="loading"
        :data="filteredRelationships"
        border
        style="width: 100%"
        height="calc(100vh - 330px)"
      >
        <el-table-column type="expand">
          <template #default="props">
            <el-card class="relationship-properties">
              <template #header>
                <div class="card-header">
                  <span>关系属性</span>
                </div>
              </template>
              <el-descriptions border>
                <el-descriptions-item v-for="(value, key) in props.row.properties" :key="key" :label="key">
                  {{ value }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="关系类型" width="150">
          <template #default="scope">
            <el-tag type="success">{{ scope.row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="起始节点" min-width="180">
          <template #default="scope">
            <div class="node-info">
              <div>ID: {{ scope.row.sourceId }}</div>
              <div class="node-labels">
                <el-tag
                  v-for="label in scope.row.sourceLabels"
                  :key="label"
                  size="small"
                  class="tag-item"
                  effect="plain"
                >
                  {{ label }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="目标节点" min-width="180">
          <template #default="scope">
            <div class="node-info">
              <div>ID: {{ scope.row.targetId }}</div>
              <div class="node-labels">
                <el-tag
                  v-for="label in scope.row.targetLabels"
                  :key="label"
                  size="small"
                  class="tag-item"
                  effect="plain"
                >
                  {{ label }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="属性" min-width="180">
          <template #default="scope">
            <div v-if="Object.keys(scope.row.properties).length > 0">
              <div v-for="(value, key, index) in scope.row.properties" :key="key" class="property-preview">
                <template v-if="index < 2">
                  <strong>{{ key }}:</strong> {{ value }}
                </template>
                <template v-else-if="index === 2">
                  ...
                </template>
              </div>
            </div>
            <span v-else class="no-data">无属性</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="openEditDialog(scope.row)"
              :icon="Edit"
            >
              编辑
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleDelete(scope.row)"
              :icon="Delete"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredRelationships.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 关系表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑关系' : '创建关系'"
      width="580px"
      destroy-on-close
    >
      <el-form :model="relationForm" :rules="rules" ref="relationFormRef" label-width="100px">
        <el-form-item v-if="!isEdit" label="起始节点" prop="sourceId">
          <el-select v-model="relationForm.sourceId" placeholder="请选择起始节点">
            <el-option
              v-for="node in nodes"
              :key="node.id"
              :label="getNodeLabel(node)"
              :value="node.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="!isEdit" label="目标节点" prop="targetId">
          <el-select v-model="relationForm.targetId" placeholder="请选择目标节点">
            <el-option
              v-for="node in nodes"
              :key="node.id"
              :label="getNodeLabel(node)"
              :value="node.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="!isEdit" label="关系类型" prop="type">
          <el-select
            v-model="relationForm.type"
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入关系类型"
          >
            <el-option
              v-for="type in relationshipTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="isEdit" label="关系信息">
          <div class="relation-info">
            <div class="relation-node">
              <div class="node-label">起始节点</div>
              <div>ID: {{ currentRelation.sourceId }}</div>
            </div>
            <div class="relation-type">
              <el-tag>{{ currentRelation.type }}</el-tag>
            </div>
            <div class="relation-node">
              <div class="node-label">目标节点</div>
              <div>ID: {{ currentRelation.targetId }}</div>
            </div>
          </div>
        </el-form-item>
        
        <el-divider content-position="left">关系属性</el-divider>
        
        <div v-for="(prop, index) in relationForm.properties" :key="index" class="property-item">
          <el-row :gutter="10">
            <el-col :span="10">
              <el-form-item :prop="'properties.' + index + '.key'" :rules="{ required: true, message: '请输入属性名', trigger: 'blur' }">
                <el-input v-model="prop.key" placeholder="属性名" />
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item :prop="'properties.' + index + '.value'" :rules="{ required: true, message: '请输入属性值', trigger: 'blur' }">
                <el-input v-model="prop.value" placeholder="属性值" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-button type="danger" :icon="Delete" circle @click="removeProperty(index)" />
            </el-col>
          </el-row>
        </div>
        
        <el-form-item>
          <el-button type="primary" :icon="Plus" @click="addProperty">添加属性</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Refresh, Edit, Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nodeApi, relationshipApi } from '../api'

// 数据加载状态
const loading = ref(false)
const submitLoading = ref(false)

// 表格数据和过滤
const relationships = ref([])
const nodes = ref([])
const relationshipTypes = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索表单
const searchForm = reactive({
  type: ''
})

// 过滤后的关系
const filteredRelationships = computed(() => {
  let result = relationships.value
  
  if (searchForm.type) {
    result = result.filter(rel => rel.type === searchForm.type)
  }
  
  return result
})

// 对话框状态
const dialogVisible = ref(false)
const isEdit = ref(false)
const relationFormRef = ref(null)
const currentRelation = ref(null)

// 关系表单
const relationForm = reactive({
  sourceId: '',
  targetId: '',
  type: '',
  properties: [{ key: '', value: '' }]
})

// 表单验证规则
const rules = {
  sourceId: [
    { required: true, message: '请选择起始节点', trigger: 'change' }
  ],
  targetId: [
    { required: true, message: '请选择目标节点', trigger: 'change' }
  ],
  type: [
    { required: true, message: '请输入关系类型', trigger: 'change' }
  ]
}

// 获取节点显示标签
const getNodeLabel = (node) => {
  const id = node.id
  const labels = node.labels || []
  const properties = node.properties || {}
  
  // 尝试使用name属性
  if (properties.name) {
    return `${properties.name} (${labels.join(', ')})`
  }
  
  // 否则使用第一个属性
  const firstProp = Object.keys(properties)[0]
  if (firstProp) {
    return `${properties[firstProp]} (${labels.join(', ')})`
  }
  
  // 如果没有属性，则使用标签和ID
  if (labels.length > 0) {
    return `${labels[0]}-${id}`
  }
  
  // 最后只使用ID
  return `Node-${id}`
}

// 获取所有关系数据
const fetchRelationships = async () => {
  loading.value = true
  try {
    // 首先获取所有节点以便后续关联
    await fetchNodes()
    
    // 获取关系类型
    const typesRes = await relationshipApi.getRelationshipTypes()
    relationshipTypes.value = typesRes.data || []
    
    // 通过遍历所有节点来获取所有关系
    const relationshipsData = []
    const processedRelationships = new Set()
    
    for (const node of nodes.value) {
      // 获取节点的关系
      const relsRes = await relationshipApi.getAllRelationships(node.id)
      const nodeRelationships = relsRes.data || []
      
      for (const rel of nodeRelationships) {
        const relId = rel.self.split('/').pop()
        
        // 避免重复处理同一关系
        if (processedRelationships.has(relId)) continue
        processedRelationships.add(relId)
        
        const sourceId = rel.start.split('/').pop()
        const targetId = rel.end.split('/').pop()
        
        // 获取关系属性
        const relPropsRes = await relationshipApi.getRelationshipProperties(relId)
        
        // 查找源节点和目标节点信息
        const sourceNode = nodes.value.find(node => node.id === sourceId)
        const targetNode = nodes.value.find(node => node.id === targetId)
        
        relationshipsData.push({
          id: relId,
          type: rel.type,
          sourceId: sourceId,
          targetId: targetId,
          sourceLabels: sourceNode?.labels || [],
          targetLabels: targetNode?.labels || [],
          properties: relPropsRes.data || {},
          self: rel.self
        })
      }
    }
    
    relationships.value = relationshipsData
  } catch (error) {
    console.error('获取关系数据失败:', error)
    ElMessage.error('获取关系数据失败，请检查后端服务是否正常运行')
  } finally {
    loading.value = false
  }
}

// 获取所有节点
const fetchNodes = async () => {
  try {
    // 获取所有标签
    const labelsRes = await nodeApi.getAllLabels()
    const availableLabels = labelsRes.data || []
    
    // 获取所有标签的节点
    const nodeData = []
    let nodeMap = new Map()
    
    for (const label of availableLabels) {
      const nodesRes = await nodeApi.getNodesByLabel(label)
      const labelNodes = nodesRes.data || []
      
      for (const node of labelNodes) {
        // 提取节点ID
        const nodeId = node.self.split('/').pop()
        
        // 如果节点已存在于map中，则合并标签
        if (nodeMap.has(nodeId)) {
          const existingNode = nodeMap.get(nodeId)
          existingNode.labels = [...new Set([...existingNode.labels, label])]
        } else {
          // 获取节点属性
          const propsRes = await nodeApi.getNodeProperties(nodeId)
          
          // 创建新节点
          const newNode = {
            id: nodeId,
            labels: [label],
            properties: propsRes.data || {},
            self: node.self
          }
          
          nodeMap.set(nodeId, newNode)
        }
      }
    }
    
    // 将Map转换为数组
    nodes.value = Array.from(nodeMap.values())
  } catch (error) {
    console.error('获取节点数据失败:', error)
    ElMessage.error('获取节点数据失败，请检查后端服务是否正常运行')
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 关系类型过滤
const handleTypeChange = () => {
  currentPage.value = 1  // 重置到第一页
}

// 添加关系对话框
const openAddDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
  currentRelation.value = null
  // 重置表单
  relationForm.sourceId = ''
  relationForm.targetId = ''
  relationForm.type = ''
  relationForm.properties = [{ key: '', value: '' }]
}

// 编辑关系对话框
const openEditDialog = (row) => {
  isEdit.value = true
  dialogVisible.value = true
  currentRelation.value = row
  
  // 设置表单初始值 - 编辑模式下不允许修改源节点、目标节点和关系类型
  // 只能修改属性
  
  // 转换属性
  relationForm.properties = []
  for (const [key, value] of Object.entries(row.properties)) {
    relationForm.properties.push({ key, value })
  }
  
  // 如果没有属性，添加一个空属性
  if (relationForm.properties.length === 0) {
    relationForm.properties.push({ key: '', value: '' })
  }
}

// 添加属性
const addProperty = () => {
  relationForm.properties.push({ key: '', value: '' })
}

// 移除属性
const removeProperty = (index) => {
  relationForm.properties.splice(index, 1)
}

// 提交表单
const submitForm = async () => {
  if (!relationFormRef.value) return
  
  try {
    await relationFormRef.value.validate()
    submitLoading.value = true
    
    // 构建属性对象
    const properties = {}
    relationForm.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    if (isEdit.value) {
      // 编辑关系：只更新属性
      await relationshipApi.setRelationshipProperties(currentRelation.value.id, properties)
      
      ElMessage.success('关系更新成功')
    } else {
      // 创建关系
      const payload = {
        to: `http://localhost:7474/db/data/node/${relationForm.targetId}`,
        type: relationForm.type,
        data: properties
      }
      
      await relationshipApi.createRelationship(relationForm.sourceId, payload)
      
      ElMessage.success('关系创建成功')
    }
    
    dialogVisible.value = false
    fetchRelationships()
  } catch (error) {
    console.error('保存关系失败:', error)
    ElMessage.error(isEdit.value ? '更新关系失败' : '创建关系失败')
  } finally {
    submitLoading.value = false
  }
}

// 删除关系
const handleDelete = (row) => {
  ElMessageBox.confirm(
    '此操作将永久删除该关系，是否继续？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await relationshipApi.deleteRelationship(row.id)
      ElMessage.success('删除成功')
      fetchRelationships()
    } catch (error) {
      console.error('删除关系失败:', error)
      ElMessage.error('删除关系失败')
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

// 页面加载时获取数据
onMounted(() => {
  fetchRelationships()
})
</script>

<style scoped>
.relationship-management {
  height: 100%;
}

.relationship-card {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-form {
  margin-bottom: 20px;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.node-labels {
  display: flex;
  flex-wrap: wrap;
}

.tag-item {
  margin: 2px;
}

.property-preview {
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-data {
  color: #999;
  font-style: italic;
}

.property-item {
  margin-bottom: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.relationship-properties {
  margin: 10px;
}

.relation-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.relation-node {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.node-label {
  font-weight: bold;
  color: #409EFF;
}

.relation-type {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 