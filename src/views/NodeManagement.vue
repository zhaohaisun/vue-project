<template>
  <div class="node-management">
    <el-card class="node-card">
      <template #header>
        <div class="card-header">
          <span>节点管理</span>
          <div class="header-controls">
            <!-- 时间范围输入控件 -->
            <div class="time-range-controls">
              <el-form :inline="true" class="time-form">
                <el-form-item label="时间范围:">
                  <el-input
                    v-model="globalTimeRange.startTime"
                    placeholder="开始时间 (如: 05010005)"
                    style="width: 120px"
                    class="time-input"
                  />
                  <span class="time-separator">至</span>
                  <el-input
                    v-model="globalTimeRange.endTime"
                    placeholder="结束时间 (如: 05010540)"
                    style="width: 120px"
                    class="time-input"
                  />
                </el-form-item>
              </el-form>
            </div>
            
            <div class="action-buttons">
              <el-tooltip content="刷新" placement="top">
                <el-button :icon="Refresh" circle @click="fetchNodes" />
              </el-tooltip>
              <el-button type="primary" @click="openAddDialog">创建节点</el-button>
            </div>
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
              
              <!-- 时态属性展示区域 -->
              <div class="temporal-properties-section">
                <el-divider content-position="left">时态属性</el-divider>
                
                <!-- 时态属性列表 -->
                <div class="temporal-properties-list">
                  <div class="temporal-properties-header">
                    <h4>时态属性列表:</h4>
                    <el-button 
                      size="small" 
                      type="success" 
                      @click="openCreateTemporalPropertyDialog(props.row.id)"
                      :icon="Plus"
                    >
                      新建时态属性
                    </el-button>
                  </div>
                  
                  <!-- 如果有时态属性，显示查询按钮和属性列表 -->
                  <template v-if="props.row.temporalProperties && props.row.temporalProperties.length > 0">
                    <!-- 查询按钮 -->
                    <div class="temporal-controls">
                      <el-button 
                        type="primary" 
                        @click="queryTemporalData(props.row)"
                        :loading="props.row.temporalLoading"
                        :disabled="!globalTimeRange.startTime || !globalTimeRange.endTime"
                      >
                        查询时态数据
                      </el-button>
                      <span v-if="!globalTimeRange.startTime || !globalTimeRange.endTime" class="time-hint">
                        请在页面右上角输入时间范围
                      </span>
                    </div>
                    
                    <!-- 时态属性图表 -->
                    <div v-if="props.row.temporalCharts && props.row.temporalCharts.length > 0" class="temporal-charts">
                      <div 
                        v-for="(chart, index) in props.row.temporalCharts" 
                        :key="`chart-${props.row.id}-${chart.propertyName}`" 
                        class="chart-container"
                      >
                        <h4>{{ chart.propertyName }} 时间变化图</h4>
                        <div 
                          :ref="el => setChartRef(el, props.row.id, chart.propertyName)"
                          class="chart"
                          :style="{ width: '100%', height: '150px' }"
                          :id="`chart-${props.row.id}-${chart.propertyName}`"
                        ></div>
                      </div>
                    </div>
                    
                    <!-- 属性列表 -->
                    <div class="temporal-property-item" v-for="property in props.row.temporalProperties" :key="property">
                      <el-tag 
                        type="info" 
                        class="temporal-property-tag"
                      >
                        {{ property }}
                      </el-tag>
                      <div class="temporal-property-actions">
                        <el-button 
                          size="small" 
                          type="primary" 
                          @click="openSetTemporalPropertyDialog(props.row.id, property)"
                        >
                          设置值
                        </el-button>
                        <el-button 
                          size="small" 
                          type="warning" 
                          @click="openSetTemporalRangeDialog(props.row.id, property)"
                        >
                          设置范围
                        </el-button>
                        <el-button 
                          size="small" 
                          type="danger" 
                          @click="deleteTemporalProperty(props.row.id, property)"
                        >
                          删除
                        </el-button>
                      </div>
                    </div>
                  </template>
                  
                  <!-- 如果没有时态属性，显示提示信息 -->
                  <template v-else>
                    <div class="no-temporal-properties">
                      <el-empty description="暂无时态属性" :image-size="80">
                        <template #description>
                          <span class="text-muted">该节点还没有时态属性，点击上方按钮创建</span>
                        </template>
                      </el-empty>
                    </div>
                  </template>
                </div>
              </div>
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
      width="800px"
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

    <!-- 设置时态属性对话框 -->
    <el-dialog
      v-model="setTemporalPropertyDialogVisible"
      title="设置时态属性"
      width="600px"
      destroy-on-close
      @close="resetTemporalPropertyForm"
    >
      <el-form 
        :model="temporalPropertyForm" 
        :rules="temporalPropertyRules" 
        ref="temporalPropertyFormRef" 
        label-width="100px"
      >
        <el-form-item label="属性名">
          <el-input v-model="temporalPropertyForm.propertyKey" disabled />
        </el-form-item>
        
        <el-form-item label="时间" prop="time">
          <el-input v-model="temporalPropertyForm.time" placeholder="请输入时间 (如: 5010010)" />
        </el-form-item>
        
        <el-form-item label="属性值" prop="value">
          <el-input v-model="temporalPropertyForm.value" placeholder="请输入属性值" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="setTemporalPropertyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitSetTemporalProperty" :loading="temporalPropertyLoading">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 设置时态属性范围对话框 -->
    <el-dialog
      v-model="setTemporalRangeDialogVisible"
      title="设置时态属性范围"
      width="600px"
      destroy-on-close
      @close="resetTemporalRangeForm"
    >
      <el-form 
        :model="temporalRangeForm" 
        :rules="temporalRangeRules" 
        ref="temporalRangeFormRef" 
        label-width="100px"
      >
        <el-form-item label="属性名">
          <el-input v-model="temporalRangeForm.propertyKey" disabled />
        </el-form-item>
        
        <el-form-item label="开始时间" prop="startTime">
          <el-input v-model="temporalRangeForm.startTime" placeholder="请输入开始时间 (如: 5010010)" />
        </el-form-item>
        
        <el-form-item label="结束时间" prop="endTime">
          <el-input v-model="temporalRangeForm.endTime" placeholder="请输入结束时间 (如: 5010540)" />
        </el-form-item>
        
        <el-form-item label="属性值" prop="value">
          <el-input v-model="temporalRangeForm.value" placeholder="请输入属性值" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="setTemporalRangeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitSetTemporalRange" :loading="temporalRangeLoading">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新建时态属性对话框 -->
    <el-dialog
      v-model="createTemporalPropertyDialogVisible"
      title="新建时态属性"
      width="700px"
      destroy-on-close
      @close="resetCreateTemporalPropertyForm"
    >
      <el-form 
        :model="createTemporalPropertyForm" 
        :rules="createTemporalPropertyRules" 
        ref="createTemporalPropertyFormRef" 
        label-width="100px"
      >
        <el-form-item label="属性名" prop="propertyKey">
          <el-input v-model="createTemporalPropertyForm.propertyKey" placeholder="请输入属性名" />
        </el-form-item>
        
        <el-form-item label="创建类型">
          <el-radio-group v-model="createTemporalPropertyForm.createMode">
            <el-radio label="single">单个时间点</el-radio>
            <el-radio label="range">时间范围</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 单个时间点模式 -->
        <template v-if="createTemporalPropertyForm.createMode === 'single'">
          <el-form-item label="时间" prop="time">
            <el-input v-model="createTemporalPropertyForm.time" placeholder="请输入时间 (如: 5010010)" />
          </el-form-item>
          
          <el-form-item label="属性值" prop="value">
            <el-input v-model="createTemporalPropertyForm.value" placeholder="请输入属性值" />
          </el-form-item>
        </template>
        
        <!-- 时间范围模式 -->
        <template v-else>
          <el-form-item label="开始时间" prop="startTime">
            <el-input v-model="createTemporalPropertyForm.startTime" placeholder="请输入开始时间 (如: 5010010)" />
          </el-form-item>
          
          <el-form-item label="结束时间" prop="endTime">
            <el-input v-model="createTemporalPropertyForm.endTime" placeholder="请输入结束时间 (如: 5010540)" />
          </el-form-item>
          
          <el-form-item label="属性值" prop="rangeValue">
            <el-input v-model="createTemporalPropertyForm.rangeValue" placeholder="请输入属性值" />
          </el-form-item>
        </template>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createTemporalPropertyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCreateTemporalProperty" :loading="createTemporalPropertyLoading">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Refresh, Edit, Delete, Plus, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nodeApi, labelApi } from '../api'
import * as echarts from 'echarts'

// 数据加载状态
const loading = ref(false)
const submitLoading = ref(false)

// 图表引用管理
const chartRefs = ref({})
const chartInstances = ref({})

// 设置图表引用
const setChartRef = (el, nodeId, propertyName) => {
  const key = `${nodeId}_${propertyName}`
  
  if (el) {
    chartRefs.value[key] = el
    console.log(`设置图表引用 ${key}:`, el)
  } else {
    // 当元素被移除时，清理引用
    if (chartRefs.value[key]) {
      console.log(`清理图表引用 ${key}`)
      delete chartRefs.value[key]
    }
  }
}

// 表格数据和过滤
const nodes = ref([])
const availableLabels = ref([])
const currentPage = ref(1)
const pageSize = ref(50)
const totalNodes = ref(0)

// 搜索表单
const searchForm = reactive({
  label: ''
})

// 全局时间范围
const globalTimeRange = reactive({
  startTime: '',
  endTime: ''
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
  // 标签不再是必填项
  // labels: [
  //   { required: true, message: '请至少选择一个标签', trigger: 'change' }
  // ]
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
    const rawNodes = nodesRes.data || []
    
    // 处理节点数据，添加时态属性相关字段
    const processedNodes = []
    for (const node of rawNodes) {
      const processedNode = {
        ...node,
        temporalProperties: [], // 时态属性列表
        temporalLoading: false, // 时态数据加载状态
        temporalCharts: [] // 时态图表数据
      }
      
      // 获取节点的时态属性
      try {
        const temporalRes = await nodeApi.getTemporalProperty(node.id)
        // API返回的应该是时态属性名称的数组
        processedNode.temporalProperties = temporalRes.data || []
      } catch (error) {
        console.warn(`获取节点 ${node.id} 的时态属性失败:`, error)
        processedNode.temporalProperties = []
      }
      
      processedNodes.push(processedNode)
    }
    
    nodes.value = processedNodes
    
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
    
    // 构建普通属性对象
    const properties = {}
    nodeForm.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    let nodeIdToUpdate = currentNodeId.value;

    if (isEdit.value) {
      // 编辑节点：更新标签和属性
      await nodeApi.replaceNodeLabels(nodeIdToUpdate, nodeForm.labels)
      await nodeApi.updateNodeProperties(nodeIdToUpdate, properties)
      
    } else {
      // 创建节点
      const nodeRes = await nodeApi.createNode()
      nodeIdToUpdate = nodeRes.data.metadata.id
      
      // 添加标签
      await nodeApi.addNodeLabels(nodeIdToUpdate, nodeForm.labels)
      
      // 设置属性
      if (Object.keys(properties).length > 0) {
        await nodeApi.updateNodeProperties(nodeIdToUpdate, properties)
      }
    }

    ElMessage.success(isEdit.value ? '节点更新成功' : '节点创建成功')
    dialogVisible.value = false
    fetchNodes()

  } catch (error) {
    console.error('保存节点失败:', error)
    ElMessage.error((isEdit.value ? '更新节点失败: ' : '创建节点失败: ') + (error.response?.data?.message || error.message || '未知错误'))
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

// ========== 时态属性管理相关方法 ==========

// 时态属性管理对话框状态
const setTemporalPropertyDialogVisible = ref(false)
const setTemporalRangeDialogVisible = ref(false)
const createTemporalPropertyDialogVisible = ref(false)
const temporalPropertyLoading = ref(false)
const temporalRangeLoading = ref(false)
const createTemporalPropertyLoading = ref(false)

// 时态属性表单
const temporalPropertyForm = reactive({
  nodeId: '',
  propertyKey: '',
  time: '',
  value: ''
})

const temporalRangeForm = reactive({
  nodeId: '',
  propertyKey: '',
  startTime: '',
  endTime: '',
  value: ''
})

const createTemporalPropertyForm = reactive({
  nodeId: '',
  propertyKey: '',
  createMode: 'single', // 'single' 或 'range'
  time: '',
  value: '',
  startTime: '',
  endTime: '',
  rangeValue: ''
})

// 表单引用
const temporalPropertyFormRef = ref(null)
const temporalRangeFormRef = ref(null)
const createTemporalPropertyFormRef = ref(null)

// 表单验证规则
const temporalPropertyRules = {
  time: [{ required: true, message: '请输入时间', trigger: 'blur' }],
  value: [{ required: true, message: '请输入属性值', trigger: 'blur' }]
}

const temporalRangeRules = {
  startTime: [{ required: true, message: '请输入开始时间', trigger: 'blur' }],
  endTime: [{ required: true, message: '请输入结束时间', trigger: 'blur' }],
  value: [{ required: true, message: '请输入属性值', trigger: 'blur' }]
}

const createTemporalPropertyRules = {
  propertyKey: [{ required: true, message: '请输入属性名', trigger: 'blur' }],
  time: [{ 
    required: true, 
    validator: (rule, value, callback) => {
      if (createTemporalPropertyForm.createMode === 'single' && !value) {
        callback(new Error('请输入时间'))
      } else {
        callback()
      }
    }, 
    trigger: 'blur' 
  }],
  value: [{ 
    required: true, 
    validator: (rule, value, callback) => {
      if (createTemporalPropertyForm.createMode === 'single' && !value) {
        callback(new Error('请输入属性值'))
      } else {
        callback()
      }
    }, 
    trigger: 'blur' 
  }],
  startTime: [{ 
    required: true, 
    validator: (rule, value, callback) => {
      if (createTemporalPropertyForm.createMode === 'range' && !value) {
        callback(new Error('请输入开始时间'))
      } else {
        callback()
      }
    }, 
    trigger: 'blur' 
  }],
  endTime: [{ 
    required: true, 
    validator: (rule, value, callback) => {
      if (createTemporalPropertyForm.createMode === 'range' && !value) {
        callback(new Error('请输入结束时间'))
      } else {
        callback()
      }
    }, 
    trigger: 'blur' 
  }],
  rangeValue: [{ 
    required: true, 
    validator: (rule, value, callback) => {
      if (createTemporalPropertyForm.createMode === 'range' && !value) {
        callback(new Error('请输入属性值'))
      } else {
        callback()
      }
    }, 
    trigger: 'blur' 
  }]
}

// 清理节点相关的图表实例和引用
const cleanupNodeCharts = (nodeId) => {
  console.log(`清理节点 ${nodeId} 的所有图表`)
  const keysToDelete = []
  
  for (const key in chartInstances.value) {
    if (key.startsWith(`${nodeId}_`)) {
      console.log(`销毁图表实例: ${key}`)
      const chartInstance = chartInstances.value[key]
      
      // 移除resize监听器
      if (chartInstance._resizeHandler) {
        window.removeEventListener('resize', chartInstance._resizeHandler)
      }
      
      // 销毁图表实例
      chartInstance.dispose()
      keysToDelete.push(key)
    }
  }
  
  // 删除实例引用
  keysToDelete.forEach(key => {
    delete chartInstances.value[key]
    delete chartRefs.value[key]
  })
}

// 查询时态数据
const queryTemporalData = async (node) => {
  if (!globalTimeRange.startTime || !globalTimeRange.endTime) {
    ElMessage.warning('请在页面右上角输入时间范围')
    return
  }
  
  console.log('开始查询时态数据，节点ID:', node.id)
  console.log('时间范围:', globalTimeRange.startTime, '到', globalTimeRange.endTime)
  console.log('时态属性列表:', node.temporalProperties)
  
  // 清理该节点之前的图表实例和引用
  cleanupNodeCharts(node.id)
  
  node.temporalLoading = true
  node.temporalCharts = []
  
  try {
    const startTime = globalTimeRange.startTime
    const endTime = globalTimeRange.endTime
    
    // 为每个时态属性查询数据
    const chartPromises = node.temporalProperties.map(async (property) => {
      try {
        console.log(`查询时态属性: ${property}`)
        const response = await nodeApi.getNodeTemporalPropertyRange(
          node.id,
          property,
          startTime,
          endTime
        )
        
        console.log(`属性 ${property} 响应数据:`, response.data)
        const data = response.data || {}
        
        // 转换时间格式和数据
        const chartData = Object.entries(data).map(([timeStr, value]) => {
          // 将时间字符串转换为更易读的格式
          const timeFormatted = parseTimeString(timeStr)
          console.log(`时间转换: ${timeStr} -> ${timeFormatted}`)
          return {
            time: timeFormatted,
            value: value,
            originalTime: timeStr
          }
        }).sort((a, b) => a.originalTime.localeCompare(b.originalTime))
        
        console.log(`属性 ${property} 转换后的图表数据:`, chartData)
        
        return {
          propertyName: property,
          data: chartData
        }
      } catch (error) {
        console.error(`查询时态属性 ${property} 失败:`, error)
        return {
          propertyName: property,
          data: []
        }
      }
    })
    
    const chartsData = await Promise.all(chartPromises)
    console.log('所有图表数据:', chartsData)
    
    node.temporalCharts = chartsData.filter(chart => chart.data.length > 0)
    console.log('过滤后的图表数据:', node.temporalCharts)
    
    // 等待DOM更新后绘制图表
    await nextTick()
    console.log('DOM更新完成，开始渲染图表')
    
    // 添加延迟确保DOM完全渲染
    setTimeout(() => {
      node.temporalCharts.forEach((chart, index) => {
        console.log(`渲染第 ${index + 1} 个图表:`, chart.propertyName)
        renderChart(node.id, chart)
      })
    }, 100)
    
    if (node.temporalCharts.length === 0) {
      ElMessage.info('在指定时间范围内没有找到时态属性数据')
    } else {
      ElMessage.success(`成功生成 ${node.temporalCharts.length} 个时态属性图表`)
    }
    
  } catch (error) {
    console.error('查询时态数据失败:', error)
    ElMessage.error('查询时态数据失败: ' + (error.message || '未知错误'))
  } finally {
    node.temporalLoading = false
  }
}

// 解析时间字符串（例如：5010010 -> 2010-05-01 00:10）
const parseTimeString = (timeStr) => {
  if (timeStr.length === 7) {
    // 5010010 格式解析：
    // 位置 0: 月份 (5 = 05月)
    // 位置 1-2: 日期 (01)
    // 位置 3-4: 小时 (00)
    // 位置 5-6: 分钟 (10)
    const month = timeStr.substring(0, 1).padStart(2, '0') // 第1位是月份，补零
    const day = timeStr.substring(1, 3) // 第2-3位是日期
    const hour = timeStr.substring(3, 5) // 第4-5位是小时
    const minute = timeStr.substring(5, 7) // 第6-7位是分钟
    
    return `2010-${month}-${day} ${hour}:${minute}`
  }
  return timeStr
}

// 渲染图表
const renderChart = (nodeId, chartData) => {
  const key = `${nodeId}_${chartData.propertyName}`
  console.log(`尝试渲染图表，key: ${key}`)
  
  const chartElement = chartRefs.value[key]
  console.log('图表元素:', chartElement)
  
  if (!chartElement) {
    console.warn(`找不到图表元素: ${key}`)
    // 延迟一点时间再试，最多重试8次
    let retryCount = 0
    const maxRetries = 8
    
    const retryRender = () => {
      setTimeout(() => {
        retryCount++
        const retryElement = chartRefs.value[key]
        console.log(`第 ${retryCount} 次重试查找图表元素 ${key}:`, retryElement)
        
        if (retryElement && retryElement.offsetParent !== null) { // 确保元素在DOM中且可见
          doRender(retryElement, nodeId, chartData)
        } else if (retryCount < maxRetries) {
          retryRender()
        } else {
          console.error(`经过 ${maxRetries} 次重试仍然找不到图表元素: ${key}`)
        }
      }, 100 + (50 * retryCount)) // 递增延迟：100ms, 150ms, 200ms...
    }
    
    retryRender()
    return
  }
  
  // 检查元素是否在DOM中且可见
  if (chartElement.offsetParent === null) {
    console.warn(`图表元素 ${key} 不可见，延迟渲染`)
    setTimeout(() => renderChart(nodeId, chartData), 200)
    return
  }
  
  // 立即渲染
  doRender(chartElement, nodeId, chartData)
}

// 实际渲染图表的函数
const doRender = (chartElement, nodeId, chartData) => {
  const key = `${nodeId}_${chartData.propertyName}`
  
  // 如果已存在图表实例，先销毁
  if (chartInstances.value[key]) {
    console.log(`销毁已存在的图表实例: ${key}`)
    chartInstances.value[key].dispose()
  }
  
  console.log(`创建新的图表实例: ${key}`)
  console.log('图表数据:', chartData)
  console.log('图表元素尺寸:', {
    width: chartElement.offsetWidth,
    height: chartElement.offsetHeight,
    clientWidth: chartElement.clientWidth,
    clientHeight: chartElement.clientHeight
  })
  
  try {
    // 确保容器有明确的尺寸
    if (chartElement.offsetWidth === 0 || chartElement.offsetHeight === 0) {
      console.warn('图表容器尺寸为0，强制设置尺寸')
      chartElement.style.width = '100%'
      chartElement.style.height = '150px'
      chartElement.style.minHeight = '150px'
    }
    
    // 创建新的图表实例
    const chart = echarts.init(chartElement, null, {
      width: chartElement.offsetWidth || 800,
      height: chartElement.offsetHeight || 150
    })
    chartInstances.value[key] = chart
    
    // 检查数据是否有效
    if (!chartData.data || chartData.data.length === 0) {
      console.warn('图表数据为空')
      const option = {
        xAxis: {
          type: 'category',
          data: []
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: chartData.propertyName,
          type: 'line',
          data: []
        }],
        grid: {
          left: '10%',
          right: '10%',
          bottom: '20%',
          top: '10%',
          containLabel: true
        }
      }
      chart.setOption(option)
      return
    }
    
    // 准备图表数据：排序并转换为时间戳格式
    const sortedData = [...chartData.data].sort((a, b) => {
      const timeA = parseTimeString(a.time)
      const timeB = parseTimeString(b.time)
      return new Date(timeA).getTime() - new Date(timeB).getTime()
    })
    
    // 将数据转换为 [timestamp, value] 格式
    const seriesData = sortedData.map(item => {
      const timeStr = parseTimeString(item.time)
      const timestamp = new Date(timeStr).getTime()
      return [timestamp, item.value]
    })
    
    console.log('转换后的时间戳数据:', seriesData)

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          if (params && params.length > 0) {
            const point = params[0]
            const time = new Date(point.value[0]).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
            return `时间: ${time}<br/>值: ${point.value[1]}`
          }
          return ''
        }
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: function(value) {
            const date = new Date(value)
            return date.toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          },
          rotate: 45,
          fontSize: 10,
          interval: 'auto' // 自动计算标签间隔
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#e0e0e0',
            width: 1,
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10
        }
      },
      series: [{
        name: chartData.propertyName,
        type: 'line',
        data: seriesData,
        smooth: true,
        lineStyle: {
          width: 2,
          color: '#409eff'
        },
        symbolSize: 4,
        symbol: 'circle'
      }],
      grid: {
        left: '10%',
        right: '10%',
        bottom: '20%',
        top: '10%',
        containLabel: true
      },
      animation: true,
      animationDuration: 1000
    }
    
    console.log('最终图表配置:', option)
    chart.setOption(option, true)
    
    // 强制重绘
    setTimeout(() => {
      chart.resize()
    }, 100)
    
    console.log(`图表 ${key} 渲染完成`)
    
    // 监听窗口大小变化
    const resizeHandler = () => {
      if (chart && !chart.isDisposed()) {
        chart.resize()
      }
    }
    window.addEventListener('resize', resizeHandler)
    
    // 存储resize处理器，以便后续清理
    chart._resizeHandler = resizeHandler
    
  } catch (error) {
    console.error(`渲染图表 ${key} 时发生错误:`, error)
  }
}

// 时态属性管理方法
const openSetTemporalPropertyDialog = (nodeId, propertyKey) => {
  console.log('打开设置时态属性对话框:', nodeId, propertyKey)
  temporalPropertyForm.nodeId = nodeId
  temporalPropertyForm.propertyKey = propertyKey
  temporalPropertyForm.time = ''
  temporalPropertyForm.value = ''
  setTemporalPropertyDialogVisible.value = true
}

const openSetTemporalRangeDialog = (nodeId, propertyKey) => {
  console.log('打开设置时态属性范围对话框:', nodeId, propertyKey)
  temporalRangeForm.nodeId = nodeId
  temporalRangeForm.propertyKey = propertyKey
  temporalRangeForm.startTime = ''
  temporalRangeForm.endTime = ''
  temporalRangeForm.value = ''
  setTemporalRangeDialogVisible.value = true
}

const resetTemporalPropertyForm = () => {
  temporalPropertyForm.nodeId = ''
  temporalPropertyForm.propertyKey = ''
  temporalPropertyForm.time = ''
  temporalPropertyForm.value = ''
}

const resetTemporalRangeForm = () => {
  temporalRangeForm.nodeId = ''
  temporalRangeForm.propertyKey = ''
  temporalRangeForm.startTime = ''
  temporalRangeForm.endTime = ''
  temporalRangeForm.value = ''
}

const submitSetTemporalProperty = async () => {
  console.log('提交设置时态属性:', temporalPropertyForm)
  if (!temporalPropertyFormRef.value) return
  
  try {
    await temporalPropertyFormRef.value.validate()
    temporalPropertyLoading.value = true
    
    console.log('调用API - setTemporalProperty:', {
      id: temporalPropertyForm.nodeId,
      key: temporalPropertyForm.propertyKey,
      time: temporalPropertyForm.time,
      value: temporalPropertyForm.value
    })
    
    await nodeApi.setTemporalProperty(
      temporalPropertyForm.nodeId,
      temporalPropertyForm.propertyKey,
      temporalPropertyForm.time,
      temporalPropertyForm.value
    )
    
    ElMessage.success('时态属性设置成功')
    setTemporalPropertyDialogVisible.value = false
    
    // 刷新节点列表
    await fetchNodes()
    
  } catch (error) {
    console.error('设置时态属性失败:', error)
    ElMessage.error('设置时态属性失败: ' + (error.response?.data?.message || error.message))
  } finally {
    temporalPropertyLoading.value = false
  }
}

const submitSetTemporalRange = async () => {
  if (!temporalRangeFormRef.value) return
  
  try {
    await temporalRangeFormRef.value.validate()
    temporalRangeLoading.value = true
    
    await nodeApi.setTemporalPropertyRange(
      temporalRangeForm.nodeId,
      temporalRangeForm.propertyKey,
      temporalRangeForm.startTime,
      temporalRangeForm.endTime,
      temporalRangeForm.value
    )
    
    ElMessage.success('时态属性范围设置成功')
    setTemporalRangeDialogVisible.value = false
    
    // 刷新节点列表
    await fetchNodes()
    
  } catch (error) {
    console.error('设置时态属性范围失败:', error)
    ElMessage.error('设置时态属性范围失败: ' + (error.response?.data?.message || error.message))
  } finally {
    temporalRangeLoading.value = false
  }
}

const deleteTemporalProperty = async (nodeId, propertyKey) => {
  console.log('删除时态属性:', nodeId, propertyKey)
  try {
    await ElMessageBox.confirm(
      `确认删除节点 ${nodeId} 的时态属性 "${propertyKey}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    console.log('调用API - deleteTemporalProperty:', { id: nodeId, key: propertyKey })
    await nodeApi.deleteTemporalProperty(nodeId, propertyKey)
    ElMessage.success('时态属性删除成功')
    
    // 刷新节点列表
    await fetchNodes()
    
  } catch (error) {
    if (error === 'cancel') {
      console.log('用户取消删除操作')
      return
    }
    console.error('删除时态属性失败:', error)
    ElMessage.error('删除时态属性失败: ' + (error.response?.data?.message || error.message))
  }
}

// 新建时态属性相关方法
const openCreateTemporalPropertyDialog = (nodeId) => {
  console.log('打开新建时态属性对话框:', nodeId)
  createTemporalPropertyForm.nodeId = nodeId
  createTemporalPropertyForm.propertyKey = ''
  createTemporalPropertyForm.createMode = 'single'
  createTemporalPropertyForm.time = ''
  createTemporalPropertyForm.value = ''
  createTemporalPropertyForm.startTime = ''
  createTemporalPropertyForm.endTime = ''
  createTemporalPropertyForm.rangeValue = ''
  createTemporalPropertyDialogVisible.value = true
}

const resetCreateTemporalPropertyForm = () => {
  createTemporalPropertyForm.nodeId = ''
  createTemporalPropertyForm.propertyKey = ''
  createTemporalPropertyForm.createMode = 'single'
  createTemporalPropertyForm.time = ''
  createTemporalPropertyForm.value = ''
  createTemporalPropertyForm.startTime = ''
  createTemporalPropertyForm.endTime = ''
  createTemporalPropertyForm.rangeValue = ''
}

const submitCreateTemporalProperty = async () => {
  console.log('提交新建时态属性:', createTemporalPropertyForm)
  if (!createTemporalPropertyFormRef.value) return
  
  try {
    await createTemporalPropertyFormRef.value.validate()
    createTemporalPropertyLoading.value = true
    
    if (createTemporalPropertyForm.createMode === 'single') {
      // 创建单个时间点的时态属性
      console.log('调用API - setTemporalProperty (单个时间点):', {
        id: createTemporalPropertyForm.nodeId,
        key: createTemporalPropertyForm.propertyKey,
        time: createTemporalPropertyForm.time,
        value: createTemporalPropertyForm.value
      })
      
      await nodeApi.setTemporalProperty(
        createTemporalPropertyForm.nodeId,
        createTemporalPropertyForm.propertyKey,
        createTemporalPropertyForm.time,
        createTemporalPropertyForm.value
      )
      
      ElMessage.success('单个时间点时态属性创建成功')
    } else {
      // 创建时间范围的时态属性
      console.log('调用API - setTemporalPropertyRange (时间范围):', {
        id: createTemporalPropertyForm.nodeId,
        key: createTemporalPropertyForm.propertyKey,
        startTime: createTemporalPropertyForm.startTime,
        endTime: createTemporalPropertyForm.endTime,
        value: createTemporalPropertyForm.rangeValue
      })
      
      await nodeApi.setTemporalPropertyRange(
        createTemporalPropertyForm.nodeId,
        createTemporalPropertyForm.propertyKey,
        createTemporalPropertyForm.startTime,
        createTemporalPropertyForm.endTime,
        createTemporalPropertyForm.rangeValue
      )
      
      ElMessage.success('时间范围时态属性创建成功')
    }
    
    createTemporalPropertyDialogVisible.value = false
    
    // 刷新节点列表
    await fetchNodes()
    
  } catch (error) {
    console.error('创建时态属性失败:', error)
    ElMessage.error('创建时态属性失败: ' + (error.response?.data?.message || error.message))
  } finally {
    createTemporalPropertyLoading.value = false
  }
}
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.time-range-controls {
  display: flex;
  align-items: center;
}

.time-form {
  margin: 0;
}

.time-input {
  margin: 0 5px;
}

.time-separator {
  margin: 0 5px;
  color: #606266;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
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
  margin-bottom: 18px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.node-properties {
  margin: 10px;
}

/* 时态属性相关样式 */
.temporal-properties-section {
  margin-top: 20px;
}

.temporal-controls {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-hint {
  color: #909399;
  font-size: 12px;
}

.temporal-charts {
  margin-bottom: 20px;
}

.chart-container {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background-color: #fff;
}

.chart-container h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
}

.chart {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.temporal-properties-list {
  margin-top: 15px;
}

.temporal-properties-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.temporal-properties-header h4 {
  margin: 0;
  color: #303133;
  font-size: 14px;
}

.temporal-property-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.temporal-property-tag {
  margin-right: 10px;
}

.temporal-property-actions {
  display: flex;
  gap: 5px;
}

.no-temporal-properties {
  margin-top: 20px;
  text-align: center;
}

.text-muted {
  color: #909399;
  font-size: 14px;
}

:deep(.el-input__inner),
:deep(.el-date-editor) {
  width: 100%;
}

:deep(.el-date-editor .el-input__wrapper) {
  width: 100%;
}

:deep(.el-date-editor--datetimerange) {
  width: 100%;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style> 