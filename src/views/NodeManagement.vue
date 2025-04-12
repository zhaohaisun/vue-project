<template>
  <div class="node-management">
    <el-card class="node-card">
      <template #header>
        <div class="card-header">
          <span>节点管理</span>
          <div>
            <el-tooltip content="刷新" placement="top">
              <el-button :icon="Refresh" circle @click="fetchNodes" />
            </el-tooltip>
            <el-button type="primary" @click="openAddDialog">创建节点</el-button>
          </div>
        </div>
      </template>
      
      <el-form :inline="true" class="search-form">
        <el-form-item label="标签过滤">
          <el-select
            v-model="searchForm.label"
            clearable
            placeholder="选择标签"
            @change="handleLabelChange"
          >
            <el-option
              v-for="item in availableLabels"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <el-table
        v-loading="loading"
        :data="filteredNodes"
        border
        style="width: 100%"
        height="calc(100vh - 330px)"
      >
        <el-table-column type="expand">
          <template #default="props">
            <el-card class="node-properties">
              <template #header>
                <div class="card-header">
                  <span>节点属性</span>
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
        <el-table-column label="标签" min-width="150">
          <template #default="scope">
            <el-tag
              v-for="tag in scope.row.labels"
              :key="tag"
              class="tag-item"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
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
        <el-table-column label="度数" width="100">
          <template #default="scope">
            <el-tooltip content="连接的关系数量" placement="top">
              <el-tag type="info">{{ scope.row.degree || 0 }}</el-tag>
            </el-tooltip>
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
          :page-sizes="[50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalNodes"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 节点表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑节点' : '创建节点'"
      width="580px"
      destroy-on-close
    >
      <el-form :model="nodeForm" :rules="rules" ref="nodeFormRef" label-width="100px">
        <el-form-item label="节点标签" prop="labels">
          <el-select
            v-model="nodeForm.labels"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入标签"
          >
            <el-option
              v-for="label in availableLabels"
              :key="label"
              :label="label"
              :value="label"
            />
          </el-select>
        </el-form-item>
        
        <el-divider content-position="left">节点属性</el-divider>
        
        <div v-for="(prop, index) in nodeForm.properties" :key="index" class="property-item">
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
import { nodeApi, labelApi } from '../api'

// 表格数据和过滤
const nodes = ref([])
const availableLabels = ref([])
const currentPage = ref(1)
const pageSize = ref(50)
const totalNodes = ref(0)
const loading = ref(false)
const submitLoading = ref(false)

// 搜索表单
const searchForm = reactive({
  label: ''
})

// 过滤后的节点
const filteredNodes = computed(() => {
  let result = nodes.value
  
  if (searchForm.label) {
    result = result.filter(node => node.labels.includes(searchForm.label))
  }
  
  return result
})

// 对话框状态
const dialogVisible = ref(false)
const isEdit = ref(false)
const nodeFormRef = ref(null)
const currentNodeId = ref(null)

// 节点表单
const nodeForm = reactive({
  labels: [],
  properties: [{ key: '', value: '' }]
})

// 表单验证规则
const rules = {
  labels: [
    { required: true, message: '请至少选择一个标签', trigger: 'change' }
  ]
}

// 获取所有节点数据
const fetchNodes = async () => {
  loading.value = true
  try {
    // 获取所有标签（用于过滤和创建节点表单）
    const labelsRes = await labelApi.getAllLabels()
    availableLabels.value = labelsRes.data || []
    
    // 获取节点总数
    const countRes = await nodeApi.getNodesCount()
    totalNodes.value = parseInt(countRes.data) || 0
    
    // 使用分页API获取节点数据
    const nodesRes = await nodeApi.getNodesPaginated(currentPage.value, pageSize.value)
    nodes.value = nodesRes.data || []
    
  } catch (error) {
    console.error('获取节点数据失败:', error)
    ElMessage.error('获取节点数据失败，请检查后端服务是否正常运行')
  } finally {
    loading.value = false
  }
}

// 分页处理
const handleSizeChange = async (val) => {
  pageSize.value = val
  currentPage.value = 1
  await fetchNodes()
}

const handleCurrentChange = async (val) => {
  currentPage.value = val
  await fetchNodes()
}

// 标签过滤
const handleLabelChange = () => {
  currentPage.value = 1  // 重置到第一页
}

// 添加节点对话框
const openAddDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
  currentNodeId.value = null
  // 重置表单
  nodeForm.labels = []
  nodeForm.properties = [{ key: '', value: '' }]
}

// 编辑节点对话框
const openEditDialog = (row) => {
  isEdit.value = true
  dialogVisible.value = true
  currentNodeId.value = row.id
  
  // 设置表单初始值
  nodeForm.labels = [...row.labels]
  
  // 转换属性
  nodeForm.properties = []
  for (const [key, value] of Object.entries(row.properties)) {
    nodeForm.properties.push({ key, value })
  }
  
  // 如果没有属性，添加一个空属性
  if (nodeForm.properties.length === 0) {
    nodeForm.properties.push({ key: '', value: '' })
  }
}

// 添加属性
const addProperty = () => {
  nodeForm.properties.push({ key: '', value: '' })
}

// 移除属性
const removeProperty = (index) => {
  nodeForm.properties.splice(index, 1)
}

// 提交表单
const submitForm = async () => {
  if (!nodeFormRef.value) return
  
  try {
    await nodeFormRef.value.validate()
    submitLoading.value = true
    
    // 构建属性对象
    const properties = {}
    nodeForm.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    if (isEdit.value) {
      // 编辑节点：更新标签和属性
      await nodeApi.replaceNodeLabels(currentNodeId.value, nodeForm.labels)
      
      // 更新属性
      await nodeApi.updateNodeProperties(currentNodeId.value, properties)
      
      ElMessage.success('节点更新成功')
    } else {
      // 创建节点
      const nodeRes = await nodeApi.createNode()
      const nodeId = nodeRes.data.metadata.id
      
      // 添加标签
      await nodeApi.addNodeLabels(nodeId, nodeForm.labels)
      
      // 设置属性
      if (Object.keys(properties).length > 0) {
        await nodeApi.updateNodeProperties(nodeId, properties)
      }
      
      ElMessage.success('节点创建成功')
    }
    
    dialogVisible.value = false
    fetchNodes()
  } catch (error) {
    console.error('保存节点失败:', error)
    ElMessage.error(isEdit.value ? '更新节点失败' : '创建节点失败')
  } finally {
    submitLoading.value = false
  }
}

// 删除节点
const handleDelete = (row) => {
  ElMessageBox.confirm(
    '此操作将永久删除该节点，是否继续？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await nodeApi.deleteNode(row.id)
      ElMessage.success('删除成功')
      fetchNodes()
    } catch (error) {
      console.error('删除节点失败:', error)
      ElMessage.error('删除节点失败，可能存在关联的关系')
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

// 页面加载时获取数据
onMounted(() => {
  fetchNodes()
})
</script>

<style scoped>
.node-management {
  height: 100%;
}

.node-card {
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

.node-properties {
  margin: 10px;
}
</style> 