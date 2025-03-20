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

    <el-card class="graph-card">
      <template #header>
        <div class="card-header">
          <span>图谱可视化</span>
          <div>
            <el-tooltip content="刷新图谱" placement="top">
              <el-button type="primary" :icon="Refresh" circle @click="loadGraphData" />
            </el-tooltip>
            <el-tooltip content="添加节点" placement="top">
              <el-button type="success" :icon="Plus" circle @click="openAddNodeDialog" />
            </el-tooltip>
          </div>
        </div>
      </template>
      <div class="graph-container" ref="graphContainer"></div>
    </el-card>

    <!-- 添加节点对话框 -->
    <el-dialog
      v-model="nodeDialogVisible"
      title="添加节点"
      width="500px"
    >
      <el-form :model="nodeForm" :rules="nodeRules" ref="nodeFormRef" label-width="100px">
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
          <el-button @click="nodeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitNodeForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 创建关系对话框 -->
    <el-dialog
      v-model="relationDialogVisible"
      title="创建关系"
      width="500px"
    >
      <el-form :model="relationForm" :rules="relationRules" ref="relationFormRef" label-width="100px">
        <el-form-item label="起始节点" prop="sourceId">
          <el-select v-model="relationForm.sourceId" placeholder="请选择起始节点">
            <el-option
              v-for="node in graphNodes"
              :key="node.id"
              :label="getNodeLabel(node)"
              :value="node.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="目标节点" prop="targetId">
          <el-select v-model="relationForm.targetId" placeholder="请选择目标节点">
            <el-option
              v-for="node in graphNodes"
              :key="node.id"
              :label="getNodeLabel(node)"
              :value="node.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="关系类型" prop="type">
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
              <el-button type="danger" :icon="Delete" circle @click="removeRelationProperty(index)" />
            </el-col>
          </el-row>
        </div>
        
        <el-form-item>
          <el-button type="primary" :icon="Plus" @click="addRelationProperty">添加属性</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="relationDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRelationForm">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { Connection, Link, Collection, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'
import { nodeApi, relationshipApi, labelApi } from '../api'

const graphContainer = ref(null)
const nodeDialogVisible = ref(false)
const relationDialogVisible = ref(false)
const nodeFormRef = ref(null)
const relationFormRef = ref(null)

// 存储节点和关系数据
const graphNodes = ref([])
const graphLinks = ref([])
const availableLabels = ref([])
const relationshipTypes = ref([])

// 图表统计
const stats = reactive({
  nodeCount: 0,
  relationshipCount: 0,
  labelCount: 0
})

// 节点表单
const nodeForm = reactive({
  labels: [],
  properties: [{ key: '', value: '' }]
})

// 关系表单
const relationForm = reactive({
  sourceId: '',
  targetId: '',
  type: '',
  properties: [{ key: '', value: '' }]
})

// 表单验证规则
const nodeRules = {
  labels: [
    { required: true, message: '请至少选择一个标签', trigger: 'change' }
  ]
}

const relationRules = {
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

// D3力导向图
let simulation = null

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
    
    // 获取所有标签的节点
    const nodes = []
    const links = []
    let nodeMap = new Map()
    
    for (const label of availableLabels.value) {
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
          
          // 获取节点的关系
          const relsRes = await relationshipApi.getAllRelationships(nodeId)
          const relationships = relsRes.data || []
          
          for (const rel of relationships) {
            const relId = rel.self.split('/').pop()
            const sourceId = rel.start.split('/').pop()
            const targetId = rel.end.split('/').pop()
            
            // 获取关系属性
            const relPropsRes = await relationshipApi.getRelationshipProperties(relId)
            
            links.push({
              id: relId,
              source: sourceId,
              target: targetId,
              type: rel.type,
              properties: relPropsRes.data || {}
            })
          }
        }
      }
    }
    
    // 将Map转换为数组
    graphNodes.value = Array.from(nodeMap.values())
    graphLinks.value = links
    
    // 更新统计信息
    stats.nodeCount = graphNodes.value.length
    stats.relationshipCount = graphLinks.value.length
    
    // 渲染图表
    renderGraph()
  } catch (error) {
    console.error('加载图数据失败:', error)
    ElMessage.error('加载图数据失败，请检查后端服务是否正常运行')
  }
}

// 渲染力导向图
const renderGraph = () => {
  if (!graphContainer.value) return
  
  // 清除旧图表
  d3.select(graphContainer.value).selectAll('*').remove()
  
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight || 600
  
  // 创建SVG
  const svg = d3.select(graphContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .call(d3.zoom().on('zoom', (event) => {
      g.attr('transform', event.transform)
    }))
  
  // 添加箭头标记
  svg.append('defs').selectAll('marker')
    .data(relationshipTypes.value)
    .join('marker')
    .attr('id', d => `arrow-${d}`)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('fill', '#999')
    .attr('d', 'M0,-5L10,0L0,5')
  
  const g = svg.append('g')
  
  // 创建连线
  const link = g.append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(graphLinks.value)
    .join('line')
    .attr('stroke-width', 1.5)
    .attr('marker-end', d => `url(#arrow-${d.type})`)
  
  // 创建节点
  const node = g.append('g')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .selectAll('circle')
    .data(graphNodes.value)
    .join('circle')
    .attr('r', 10)
    .attr('fill', d => {
      // 根据标签类型设置不同颜色
      const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
      const labelIndex = availableLabels.value.indexOf(d.labels[0]) % colors.length
      return colors[labelIndex]
    })
    .call(drag(simulation))
    .on('click', handleNodeClick)
    .on('dblclick', handleNodeDoubleClick)
  
  // 添加节点文本标签
  const labels = g.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(graphNodes.value)
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('dy', 20)
    .text(d => {
      const displayLabels = d.labels.join(', ')
      return displayLabels.length > 15 ? displayLabels.substring(0, 15) + '...' : displayLabels
    })
    .style('font-size', '8px')
    .style('pointer-events', 'none')
  
  // 添加关系标签
  const linkLabels = g.append('g')
    .attr('class', 'link-labels')
    .selectAll('text')
    .data(graphLinks.value)
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('dy', -5)
    .text(d => d.type)
    .style('font-size', '8px')
    .style('pointer-events', 'none')
  
  // 创建力导向图模拟
  simulation = d3.forceSimulation(graphNodes.value)
    .force('link', d3.forceLink(graphLinks.value)
      .id(d => d.id)
      .distance(100))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
      
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
      
      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y)
      
      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2)
    })
}

// 拖拽函数
function drag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }
  
  function dragged(event) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }
  
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }
  
  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
}

// 节点点击事件
const handleNodeClick = (event, node) => {
  console.log('节点点击:', node)
  // 可以显示节点详情或其他操作
}

// 节点双击事件 - 创建关系
const handleNodeDoubleClick = (event, node) => {
  relationForm.sourceId = node.id
  relationDialogVisible.value = true
}

// 添加节点对话框
const openAddNodeDialog = () => {
  // 重置表单
  nodeForm.labels = []
  nodeForm.properties = [{ key: '', value: '' }]
  nodeDialogVisible.value = true
}

// 添加节点属性
const addProperty = () => {
  nodeForm.properties.push({ key: '', value: '' })
}

// 移除节点属性
const removeProperty = (index) => {
  nodeForm.properties.splice(index, 1)
}

// 添加关系属性
const addRelationProperty = () => {
  relationForm.properties.push({ key: '', value: '' })
}

// 移除关系属性
const removeRelationProperty = (index) => {
  relationForm.properties.splice(index, 1)
}

// 提交节点表单
const submitNodeForm = async () => {
  if (!nodeFormRef.value) return
  
  try {
    await nodeFormRef.value.validate()
    
    // 创建节点
    const nodeRes = await nodeApi.createNode()
    const nodeId = nodeRes.data.metadata.id
    
    // 添加标签
    await nodeApi.addNodeLabels(nodeId, nodeForm.labels)
    
    // 构建属性对象
    const properties = {}
    nodeForm.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    // 设置属性
    if (Object.keys(properties).length > 0) {
      await nodeApi.updateNodeProperties(nodeId, properties)
    }
    
    ElMessage.success('节点创建成功')
    nodeDialogVisible.value = false
    
    // 重新加载图数据
    loadGraphData()
  } catch (error) {
    console.error('创建节点失败:', error)
    ElMessage.error('创建节点失败，请稍后再试')
  }
}

// 提交关系表单
const submitRelationForm = async () => {
  if (!relationFormRef.value) return
  
  try {
    await relationFormRef.value.validate()
    
    // 构建属性对象
    const properties = {}
    relationForm.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    // 创建关系
    const payload = {
      to: `http://localhost:7474/db/data/node/${relationForm.targetId}`,
      type: relationForm.type,
      data: properties
    }
    
    await relationshipApi.createRelationship(relationForm.sourceId, payload)
    
    ElMessage.success('关系创建成功')
    relationDialogVisible.value = false
    
    // 重新加载图数据
    loadGraphData()
  } catch (error) {
    console.error('创建关系失败:', error)
    ElMessage.error('创建关系失败，请稍后再试')
  }
}

// 生命周期钩子
onMounted(() => {
  loadGraphData()
  
  // 窗口大小变化时重新渲染图表
  window.addEventListener('resize', renderGraph)
})

onUnmounted(() => {
  // 清理资源
  if (simulation) {
    simulation.stop()
  }
  window.removeEventListener('resize', renderGraph)
})
</script>

<style scoped>
.graph-view-container {
  height: 100%;
}

.graph-header {
  margin-bottom: 20px;
}

.graph-card {
  height: calc(100vh - 230px);
}

.graph-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
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

.property-item {
  margin-bottom: 10px;
}
</style> 