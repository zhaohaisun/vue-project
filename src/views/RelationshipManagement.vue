<template>
  <div class="relationship-management">
    <el-card class="relationship-card">
      <template #header>
        <div class="card-header">
          <span>关系管理</span>
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
                <el-button :icon="Refresh" circle @click="fetchRelationships" />
              </el-tooltip>
              <el-button type="primary" @click="openAddDialog">创建关系</el-button>
            </div>
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
              
              <!-- 时态属性展示区域 -->
              <div v-if="props.row.temporalProperties && props.row.temporalProperties.length > 0" class="temporal-properties-section">
                <el-divider content-position="left">时态属性</el-divider>
                
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
                </div>
              </div>
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
          :page-sizes="[50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalRelationships"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 关系表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑关系' : '创建关系'"
      width="800px"
      destroy-on-close
    >
      <el-form :model="relationForm" :rules="rules" ref="relationFormRef" label-width="100px">
        <el-form-item v-if="!isEdit" label="起始节点" prop="sourceId">
          <el-select 
            v-model="relationForm.sourceId" 
            placeholder="请选择起始节点"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="node in nodes"
              :key="node.id"
              :label="getNodeLabel(node)"
              :value="node.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="!isEdit" label="目标节点" prop="targetId">
          <el-select 
            v-model="relationForm.targetId" 
            placeholder="请选择目标节点"
            filterable
            clearable
            style="width: 100%"
          >
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

    <!-- 设置时态属性值对话框 -->
    <el-dialog
      v-model="setTemporalPropertyDialogVisible"
      title="设置时态属性值"
      width="500px"
      @close="resetTemporalPropertyForm"
    >
      <el-form ref="temporalPropertyFormRef" :model="temporalPropertyForm" label-width="100px">
        <el-form-item label="关系ID">
          <el-input v-model="temporalPropertyForm.relationshipId" disabled />
        </el-form-item>
        <el-form-item label="属性名">
          <el-input v-model="temporalPropertyForm.propertyKey" disabled />
        </el-form-item>
        <el-form-item label="时间" prop="time" :rules="{ required: true, message: '请输入时间', trigger: 'blur' }">
          <el-input 
            v-model="temporalPropertyForm.time" 
            placeholder="请输入时间 (如: 5010105)"
          />
          <div class="form-hint">时间格式：7位数字，如 5010105 表示 2010年05月01日 01:05</div>
        </el-form-item>
        <el-form-item label="属性值" prop="value" :rules="{ required: true, message: '请输入属性值', trigger: 'blur' }">
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
      width="500px"
      @close="resetTemporalRangeForm"
    >
      <el-form ref="temporalRangeFormRef" :model="temporalRangeForm" label-width="100px">
        <el-form-item label="关系ID">
          <el-input v-model="temporalRangeForm.relationshipId" disabled />
        </el-form-item>
        <el-form-item label="属性名">
          <el-input v-model="temporalRangeForm.propertyKey" disabled />
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime" :rules="{ required: true, message: '请输入开始时间', trigger: 'blur' }">
          <el-input 
            v-model="temporalRangeForm.startTime" 
            placeholder="请输入开始时间 (如: 5010010)"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime" :rules="{ required: true, message: '请输入结束时间', trigger: 'blur' }">
          <el-input 
            v-model="temporalRangeForm.endTime" 
            placeholder="请输入结束时间 (如: 5010540)"
          />
        </el-form-item>
        <el-form-item label="属性值" prop="value" :rules="{ required: true, message: '请输入属性值', trigger: 'blur' }">
          <el-input v-model="temporalRangeForm.value" placeholder="请输入属性值" />
        </el-form-item>
        <div class="form-hint">时间格式：7位数字，如 5010010 表示 2010年05月01日 00:10</div>
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
      width="600px"
      @close="resetCreateTemporalPropertyForm"
    >
      <el-form ref="createTemporalPropertyFormRef" :model="createTemporalPropertyForm" label-width="100px">
        <el-form-item label="关系ID">
          <el-input v-model="createTemporalPropertyForm.relationshipId" disabled />
        </el-form-item>
        <el-form-item label="属性名" prop="propertyKey" :rules="{ required: true, message: '请输入属性名', trigger: 'blur' }">
          <el-input 
            v-model="createTemporalPropertyForm.propertyKey" 
            placeholder="请输入时态属性名 (如: temp_travelTime)"
          />
        </el-form-item>
        <el-form-item label="创建方式">
          <el-radio-group v-model="createTemporalPropertyForm.createMode">
            <el-radio value="single">单个时间点</el-radio>
            <el-radio value="range">时间范围</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 单个时间点模式 -->
        <template v-if="createTemporalPropertyForm.createMode === 'single'">
          <el-form-item label="时间" prop="time" :rules="{ required: true, message: '请输入时间', trigger: 'blur' }">
            <el-input 
              v-model="createTemporalPropertyForm.time" 
              placeholder="请输入时间 (如: 5010105)"
            />
          </el-form-item>
          <el-form-item label="属性值" prop="value" :rules="{ required: true, message: '请输入属性值', trigger: 'blur' }">
            <el-input v-model="createTemporalPropertyForm.value" placeholder="请输入属性值" />
          </el-form-item>
        </template>
        
        <!-- 时间范围模式 -->
        <template v-if="createTemporalPropertyForm.createMode === 'range'">
          <el-form-item label="开始时间" prop="startTime" :rules="{ required: true, message: '请输入开始时间', trigger: 'blur' }">
            <el-input 
              v-model="createTemporalPropertyForm.startTime" 
              placeholder="请输入开始时间 (如: 05010115)"
            />
          </el-form-item>
          <el-form-item label="结束时间" prop="endTime" :rules="{ required: true, message: '请输入结束时间', trigger: 'blur' }">
            <el-input 
              v-model="createTemporalPropertyForm.endTime" 
              placeholder="请输入结束时间 (如: 05010325)"
            />
          </el-form-item>
          <el-form-item label="属性值" prop="rangeValue" :rules="{ required: true, message: '请输入属性值', trigger: 'blur' }">
            <el-input v-model="createTemporalPropertyForm.rangeValue" placeholder="请输入属性值" />
          </el-form-item>
        </template>
        
        <div class="form-hint">
          <p>时间格式：7-8位数字</p>
          <p>• 单个时间点：如 5010105 表示 2010年05月01日 01:05</p>
          <p>• 时间范围：如 05010115 表示 2010年05月01日 01:15</p>
        </div>
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
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh, Edit, Delete, Plus, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nodeApi, relationshipApi } from '../api'
import * as echarts from 'echarts'

// 数据加载状态
const loading = ref(false)
const submitLoading = ref(false)

// 图表引用管理
const chartRefs = ref({})
const chartInstances = ref({})

// 设置图表引用
const setChartRef = (el, relationshipId, propertyName) => {
  const key = `${relationshipId}_${propertyName}`
  
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
const relationships = ref([])
const nodes = ref([])
const relationshipTypes = ref([])
const currentPage = ref(1)
const pageSize = ref(50)
const totalRelationships = ref(0)

// 搜索表单
const searchForm = reactive({
  type: ''
})

// 全局时间范围
const globalTimeRange = reactive({
  startTime: '',
  endTime: ''
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

// 时态属性管理对话框状态
const setTemporalPropertyDialogVisible = ref(false)
const setTemporalRangeDialogVisible = ref(false)
const createTemporalPropertyDialogVisible = ref(false)
const temporalPropertyLoading = ref(false)
const temporalRangeLoading = ref(false)
const createTemporalPropertyLoading = ref(false)

// 时态属性表单
const temporalPropertyForm = reactive({
  relationshipId: '',
  propertyKey: '',
  time: '',
  value: ''
})

const temporalRangeForm = reactive({
  relationshipId: '',
  propertyKey: '',
  startTime: '',
  endTime: '',
  value: ''
})

const createTemporalPropertyForm = reactive({
  relationshipId: '',
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
  
  // 构建基本的ID显示
  let baseLabel = `ID: ${id}`
  
  // 添加标签信息
  if (labels.length > 0) {
    baseLabel += ` [${labels.join(', ')}]`
  }
  
  // 尝试添加有意义的属性信息
  if (properties.name) {
    baseLabel += ` - ${properties.name}`
  } else if (properties.title) {
    baseLabel += ` - ${properties.title}`
  } else if (properties.label) {
    baseLabel += ` - ${properties.label}`
  } else {
    // 如果有其他属性，显示第一个非空属性
    const propKeys = Object.keys(properties)
    if (propKeys.length > 0) {
      const firstKey = propKeys[0]
      const firstValue = properties[firstKey]
      if (firstValue && firstValue.toString().length < 50) { // 限制显示长度
        baseLabel += ` - ${firstKey}: ${firstValue}`
      }
    }
  }
  
  return baseLabel
}

// 获取所有关系数据
const fetchRelationships = async () => {
  loading.value = true
  try {
    // 获取关系类型
    const typesRes = await relationshipApi.getRelationshipTypes()
    relationshipTypes.value = typesRes.data || []
    
    // 获取关系总数
    const countRes = await relationshipApi.getRelationshipsCount()
    totalRelationships.value = parseInt(countRes.data) || 0
    
    // 使用分页API获取关系数据
    const relsRes = await relationshipApi.getRelationshipsPaginated(currentPage.value, pageSize.value)
    const rawRelationships = relsRes.data || []
    
    // 处理关系数据格式，提取节点ID和准备查询节点标签
    const processedRelationships = []
    const nodeIds = new Set()
    
    for (const rel of rawRelationships) {
      // 从URL中提取节点ID
      const sourceId = rel.start.split('/').pop()
      const targetId = rel.end.split('/').pop()
      const relId = rel.self.split('/').pop()
      
      // 记录需要查询的节点ID
      nodeIds.add(sourceId)
      nodeIds.add(targetId)
      
      // 构建关系对象
      processedRelationships.push({
        id: relId,
        type: rel.type,
        sourceId: sourceId,
        targetId: targetId,
        sourceLabels: [], // 暂时为空，后续会填充
        targetLabels: [], // 暂时为空，后续会填充
        properties: rel.data || {},
        self: rel.self,
        temporalProperties: [], // 时态属性列表
        temporalLoading: false, // 时态数据加载状态
        temporalCharts: [] // 时态图表数据
      })
    }
    
    // 如果有关系数据，查询相关节点的标签信息
    if (processedRelationships.length > 0) {
      // 获取节点数据以获取标签信息
      await fetchNodesForSelection()
      
      // 填充节点标签信息
      for (const rel of processedRelationships) {
        const sourceNode = nodes.value.find(node => node.id === rel.sourceId)
        const targetNode = nodes.value.find(node => node.id === rel.targetId)
        
        rel.sourceLabels = sourceNode?.labels || []
        rel.targetLabels = targetNode?.labels || []
        
        // 获取关系的时态属性
        try {
          const temporalRes = await relationshipApi.getRelationshipTemporalProperties(rel.id)
          rel.temporalProperties = temporalRes.data || []
        } catch (error) {
          console.warn(`获取关系 ${rel.id} 的时态属性失败:`, error)
          rel.temporalProperties = []
        }
      }
    }
    
    relationships.value = processedRelationships
    
  } catch (error) {
    console.error('获取关系数据失败:', error)
    ElMessage.error('获取关系数据失败，请检查后端服务是否正常运行')
  } finally {
    loading.value = false
  }
}

// 仅在需要创建关系时获取节点列表
const fetchNodesForSelection = async () => {
  if (nodes.value.length > 0) return // 如果已经有节点数据，不再重新获取
  
  try {
    // 使用分页API获取节点数据
    const nodesRes = await nodeApi.getNodesPaginated(1, 1000) // 获取前1000个节点用于选择
    const rawNodes = nodesRes.data || []
    
    // 处理节点数据，确保每个节点都有正确的ID
    const processedNodes = rawNodes.map(node => {
      let nodeId = node.id
      
      // 如果节点数据中包含完整URL，提取ID
      if (node.self) {
        nodeId = node.self.split('/').pop()
      }
      
      // 确保ID是字符串类型
      nodeId = String(nodeId)
      
      return {
        id: nodeId,
        labels: node.labels || [],
        properties: node.data || node.properties || {},
        self: node.self
      }
    })
    
    nodes.value = processedNodes
    console.log('获取到节点数据:', processedNodes.length, '个节点')
    
  } catch (error) {
    console.error('获取节点数据失败:', error)
    ElMessage.error('获取节点数据失败，请检查后端服务是否正常运行')
  }
}

// 分页处理
const handleSizeChange = async (val) => {
  pageSize.value = val
  currentPage.value = 1
  await fetchRelationships()
}

const handleCurrentChange = async (val) => {
  currentPage.value = val
  await fetchRelationships()
}

// 关系类型过滤
const handleTypeChange = () => {
  currentPage.value = 1  // 重置到第一页
}

// 添加关系对话框
const openAddDialog = async () => {
  // 获取节点列表用于选择
  await fetchNodesForSelection()
  
  isEdit.value = false
  dialogVisible.value = true
  currentRelation.value = null
  
  // 重置表单
  Object.assign(relationForm, {
    sourceId: '',
    targetId: '',
    type: '',
    properties: [{ key: '', value: '' }]
  })
  
  // 如果有表单引用，清除验证
  if (relationFormRef.value) {
    relationFormRef.value.clearValidate()
  }
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
    
    // 构建普通属性对象
    const properties = {}
    relationForm.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    let relationIdToUpdate = currentRelation.value?.id;

    if (isEdit.value) {
      // 编辑关系：只更新属性
      await relationshipApi.setRelationshipProperties(relationIdToUpdate, properties)
      
    } else {
      // 创建关系
      // 确保ID是字符串类型
      const sourceId = String(relationForm.sourceId)
      const targetId = String(relationForm.targetId)
      
      if (!sourceId || sourceId === 'undefined' || sourceId === 'null') {
        throw new Error('起始节点ID无效')
      }
      
      if (!targetId || targetId === 'undefined' || targetId === 'null') {
        throw new Error('目标节点ID无效')
      }
      
      const relRes = await relationshipApi.createRelationship(sourceId, targetId, relationForm.type, properties)
      // 从返回的 self URL 中提取新关系的 ID
      relationIdToUpdate = relRes.data.self.split('/').pop()
    }

    if (isEdit.value) {
      ElMessage.success('关系更新成功')
    } else {
      const sourceNode = nodes.value.find(n => n.id === relationForm.sourceId)
      const targetNode = nodes.value.find(n => n.id === relationForm.targetId)
      const sourceLabel = sourceNode ? getNodeLabel(sourceNode) : `ID: ${relationForm.sourceId}`
      const targetLabel = targetNode ? getNodeLabel(targetNode) : `ID: ${relationForm.targetId}`
      
      ElMessage.success({
        message: `关系创建成功：${sourceLabel} -[${relationForm.type}]-> ${targetLabel}`,
        duration: 4000
      })
    }
    
    dialogVisible.value = false
    fetchRelationships()

  } catch (error) {
    console.error('保存关系失败:', error)
    ElMessage.error((isEdit.value ? '更新关系失败: ' : '创建关系失败: ') + (error.response?.data?.message || error.message || '未知错误'))
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

// 页面卸载时清理图表实例
onUnmounted(() => {
  Object.values(chartInstances.value).forEach(chart => {
    if (chart && typeof chart.dispose === 'function') {
      // 清理resize事件监听器
      if (chart._resizeHandler) {
        window.removeEventListener('resize', chart._resizeHandler)
      }
      chart.dispose()
    }
  })
  chartInstances.value = {}
})

// 清理特定关系的图表实例
const cleanupRelationshipCharts = (relationshipId) => {
  console.log(`清理关系 ${relationshipId} 的图表实例`)
  
  // 查找并清理该关系的所有图表实例
  Object.keys(chartInstances.value).forEach(key => {
    if (key.startsWith(`${relationshipId}_`)) {
      const chart = chartInstances.value[key]
      if (chart && typeof chart.dispose === 'function') {
        console.log(`销毁图表实例: ${key}`)
        // 清理resize事件监听器
        if (chart._resizeHandler) {
          window.removeEventListener('resize', chart._resizeHandler)
        }
        chart.dispose()
      }
      delete chartInstances.value[key]
      delete chartRefs.value[key]
    }
  })
}

// 查询时态数据
const queryTemporalData = async (relationship) => {
  if (!globalTimeRange.startTime || !globalTimeRange.endTime) {
    ElMessage.warning('请在页面右上角输入时间范围')
    return
  }
  
  console.log('开始查询时态数据，关系ID:', relationship.id)
  console.log('时间范围:', globalTimeRange.startTime, '到', globalTimeRange.endTime)
  console.log('时态属性列表:', relationship.temporalProperties)
  
  // 清理该关系之前的图表实例和引用
  cleanupRelationshipCharts(relationship.id)
  
  relationship.temporalLoading = true
  relationship.temporalCharts = []
  
  try {
    const startTime = globalTimeRange.startTime
    const endTime = globalTimeRange.endTime
    
    // 为每个时态属性查询数据
    const chartPromises = relationship.temporalProperties.map(async (property) => {
      try {
        console.log(`查询时态属性: ${property}`)
        const response = await relationshipApi.getRelationshipTemporalPropertyRange(
          relationship.id,
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
    
    relationship.temporalCharts = chartsData.filter(chart => chart.data.length > 0)
    console.log('过滤后的图表数据:', relationship.temporalCharts)
    
    // 等待DOM更新后绘制图表
    await nextTick()
    console.log('DOM更新完成，开始渲染图表')
    
    // 添加延迟确保DOM完全渲染
    setTimeout(() => {
      relationship.temporalCharts.forEach((chart, index) => {
        console.log(`渲染第 ${index + 1} 个图表:`, chart.propertyName)
        renderChart(relationship.id, chart)
      })
    }, 100)
    
    if (relationship.temporalCharts.length === 0) {
      ElMessage.info('在指定时间范围内没有找到时态属性数据')
    } else {
      ElMessage.success(`成功生成 ${relationship.temporalCharts.length} 个时态属性图表`)
    }
    
  } catch (error) {
    console.error('查询时态数据失败:', error)
    ElMessage.error('查询时态数据失败: ' + (error.message || '未知错误'))
  } finally {
    relationship.temporalLoading = false
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
const renderChart = (relationshipId, chartData) => {
  const key = `${relationshipId}_${chartData.propertyName}`
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
          doRender(retryElement, relationshipId, chartData)
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
    setTimeout(() => renderChart(relationshipId, chartData), 200)
    return
  }
  
  // 立即渲染
  doRender(chartElement, relationshipId, chartData)
}

// 实际渲染图表的函数
const doRender = (chartElement, relationshipId, chartData) => {
  const key = `${relationshipId}_${chartData.propertyName}`
  
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
    chart.setOption(option, true)  // 第二个参数true表示不合并，完全替换
    
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
const openSetTemporalPropertyDialog = (relationshipId, propertyKey) => {
  console.log('打开设置时态属性对话框:', relationshipId, propertyKey)
  temporalPropertyForm.relationshipId = relationshipId
  temporalPropertyForm.propertyKey = propertyKey
  temporalPropertyForm.time = ''
  temporalPropertyForm.value = ''
  setTemporalPropertyDialogVisible.value = true
}

const openSetTemporalRangeDialog = (relationshipId, propertyKey) => {
  console.log('打开设置时态属性范围对话框:', relationshipId, propertyKey)
  temporalRangeForm.relationshipId = relationshipId
  temporalRangeForm.propertyKey = propertyKey
  temporalRangeForm.startTime = ''
  temporalRangeForm.endTime = ''
  temporalRangeForm.value = ''
  setTemporalRangeDialogVisible.value = true
}

const resetTemporalPropertyForm = () => {
  temporalPropertyForm.relationshipId = ''
  temporalPropertyForm.propertyKey = ''
  temporalPropertyForm.time = ''
  temporalPropertyForm.value = ''
}

const resetTemporalRangeForm = () => {
  temporalRangeForm.relationshipId = ''
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
      id: temporalPropertyForm.relationshipId,
      key: temporalPropertyForm.propertyKey,
      time: temporalPropertyForm.time,
      value: temporalPropertyForm.value
    })
    
    await relationshipApi.setTemporalProperty(
      temporalPropertyForm.relationshipId,
      temporalPropertyForm.propertyKey,
      temporalPropertyForm.time,
      temporalPropertyForm.value
    )
    
    ElMessage.success('时态属性设置成功')
    setTemporalPropertyDialogVisible.value = false
    
    // 刷新关系列表
    await fetchRelationships()
    
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
    
    await relationshipApi.setTemporalPropertyRange(
      temporalRangeForm.relationshipId,
      temporalRangeForm.propertyKey,
      temporalRangeForm.startTime,
      temporalRangeForm.endTime,
      temporalRangeForm.value
    )
    
    ElMessage.success('时态属性范围设置成功')
    setTemporalRangeDialogVisible.value = false
    
    // 刷新关系列表
    await fetchRelationships()
    
  } catch (error) {
    console.error('设置时态属性范围失败:', error)
    ElMessage.error('设置时态属性范围失败: ' + (error.response?.data?.message || error.message))
  } finally {
    temporalRangeLoading.value = false
  }
}

const deleteTemporalProperty = async (relationshipId, propertyKey) => {
  console.log('删除时态属性:', relationshipId, propertyKey)
  try {
    await ElMessageBox.confirm(
      `确认删除关系 ${relationshipId} 的时态属性 "${propertyKey}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    console.log('调用API - deleteTemporalProperty:', { id: relationshipId, key: propertyKey })
    await relationshipApi.deleteTemporalProperty(relationshipId, propertyKey)
    ElMessage.success('时态属性删除成功')
    
    // 刷新关系列表
    await fetchRelationships()
    
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
const openCreateTemporalPropertyDialog = (relationshipId) => {
  console.log('打开新建时态属性对话框:', relationshipId)
  createTemporalPropertyForm.relationshipId = relationshipId
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
  createTemporalPropertyForm.relationshipId = ''
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
        id: createTemporalPropertyForm.relationshipId,
        key: createTemporalPropertyForm.propertyKey,
        time: createTemporalPropertyForm.time,
        value: createTemporalPropertyForm.value
      })
      
      await relationshipApi.setTemporalProperty(
        createTemporalPropertyForm.relationshipId,
        createTemporalPropertyForm.propertyKey,
        createTemporalPropertyForm.time,
        createTemporalPropertyForm.value
      )
      
      ElMessage.success('单个时间点时态属性创建成功')
    } else {
      // 创建时间范围的时态属性
      console.log('调用API - setTemporalPropertyRange (时间范围):', {
        id: createTemporalPropertyForm.relationshipId,
        key: createTemporalPropertyForm.propertyKey,
        startTime: createTemporalPropertyForm.startTime,
        endTime: createTemporalPropertyForm.endTime,
        value: createTemporalPropertyForm.rangeValue
      })
      
      await relationshipApi.setTemporalPropertyRange(
        createTemporalPropertyForm.relationshipId,
        createTemporalPropertyForm.propertyKey,
        createTemporalPropertyForm.startTime,
        createTemporalPropertyForm.endTime,
        createTemporalPropertyForm.rangeValue
      )
      
      ElMessage.success('时间范围时态属性创建成功')
    }
    
    createTemporalPropertyDialogVisible.value = false
    
    // 刷新关系列表
    await fetchRelationships()
    
  } catch (error) {
    console.error('创建时态属性失败:', error)
    ElMessage.error('创建时态属性失败: ' + (error.response?.data?.message || error.message))
  } finally {
    createTemporalPropertyLoading.value = false
  }
}
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

.time-form :deep(.el-form-item) {
  margin: 0;
}

.time-form :deep(.el-form-item__label) {
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
}

.time-input {
  font-size: 12px;
}

.time-separator {
  margin: 0 8px;
  color: #909399;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
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
  margin-bottom: 18px;
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

.temporal-property-item {
  margin-bottom: 25px;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
}

.temporal-property-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
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

/* 时态属性相关样式 */
.temporal-properties-section {
  margin-top: 20px;
}

.temporal-controls {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.time-hint {
  color: #909399;
  font-size: 12px;
  font-style: italic;
}

.temporal-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.temporal-charts {
  margin-bottom: 20px;
}

.chart-container {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fff;
}

.chart-container h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.chart {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  width: 100% !important;
  height: 150px !important;
  min-height: 150px !important;
}

.temporal-properties-list {
  padding: 15px;
  background-color: #f0f9ff;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.temporal-properties-list h4 {
  margin: 0 0 10px 0;
  color: #409eff;
  font-size: 14px;
  font-weight: 600;
}

.temporal-property-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.temporal-property-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.temporal-property-item:last-child {
  border-bottom: none;
}

.temporal-property-actions {
  display: flex;
  gap: 8px;
}

.temporal-property-actions .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.temporal-properties-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.temporal-properties-header h4 {
  margin: 0;
}

.form-hint p {
  margin: 2px 0;
  font-size: 12px;
  color: #909399;
}
</style> 