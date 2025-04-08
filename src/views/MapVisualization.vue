<template>
  <div class="map-container">
    <el-card class="map-card">
      <template #header>
        <div class="card-header">
          <h2>地图可视化</h2>
          <div class="header-controls">
            <el-button 
              type="primary" 
              size="small" 
              :loading="loading"
              @click="loadMapData"
            >
              <el-icon><Refresh /></el-icon>
              加载数据
            </el-button>
          </div>
        </div>
      </template>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <div v-else class="map-wrapper">
        <div class="map-stats">
          <p>已加载节点: {{ nodes.length }}</p>
          <p>已加载边: {{ edges.length }}</p>
        </div>
        
        <div class="map">
          <svg :width="svgWidth" :height="svgHeight" @wheel="handleZoom" @mousedown="startPan" @mousemove="pan" @mouseup="endPan" @mouseleave="endPan">
            <!-- 背景 -->
            <rect x="0" y="0" :width="svgWidth" :height="svgHeight" fill="#F0F0F0" />
            
            <!-- 边/路径 -->
            <g v-for="(edge, index) in transformedEdges" :key="`edge-${index}`">
              <line
                :x1="edge.source.x"
                :y1="edge.source.y"
                :x2="edge.target.x"
                :y2="edge.target.y"
                :stroke="edge.color"
                stroke-width="2"
                @mouseover="activeEdge = edge"
                @mouseleave="activeEdge = null"
              />
            </g>
            
            <!-- 节点 -->
            <g v-for="node in transformedNodes" :key="`node-${node.id}`">
              <circle
                :cx="node.x"
                :cy="node.y"
                r="3"
                fill="#3388ff"
                @mouseover="activeNode = node"
                @mouseleave="activeNode = null"
              />
            </g>
            
            <!-- 悬停提示 -->
            <g v-if="activeNode" class="tooltip">
              <rect :x="activeNode.x + 10" :y="activeNode.y - 10" width="120" height="30" fill="white" stroke="#333" rx="3" />
              <text :x="activeNode.x + 15" :y="activeNode.y + 10" fill="#333">ID: {{ activeNode.id }}</text>
            </g>
            <g v-if="activeEdge" class="tooltip">
              <rect :x="(activeEdge.source.x + activeEdge.target.x) / 2 + 10" :y="(activeEdge.source.y + activeEdge.target.y) / 2 - 10" width="150" height="30" fill="white" stroke="#333" rx="3" />
              <text :x="(activeEdge.source.x + activeEdge.target.x) / 2 + 15" :y="(activeEdge.source.y + activeEdge.target.y) / 2 + 10" fill="#333">{{ activeEdge.label || '道路' }}</text>
            </g>
            
            <!-- 比例尺和控制面板 -->
            <g class="controls" transform="translate(20, 20)">
              <rect x="0" y="0" width="120" height="80" fill="white" stroke="#ccc" rx="3" />
              <text x="10" y="20" fill="#333">缩放: {{ zoomLevel.toFixed(1) }}x</text>
              <g transform="translate(10, 30)">
                <rect width="100" height="20" fill="#f0f0f0" stroke="#ccc" rx="3" @click="resetZoom" />
                <text x="20" y="14" fill="#333">重置视图</text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import Papa from 'papaparse'

// SVG地图配置
const svgWidth = ref(1200)
const svgHeight = ref(800)
const padding = 50 // 边缘留白

// 交互状态
const zoomLevel = ref(1)
const panOffset = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const startPanPos = ref({ x: 0, y: 0 })
const activeNode = ref(null)
const activeEdge = ref(null)

// 数据状态
const loading = ref(false)
const nodes = ref([])
const edges = ref([])
const nodeMap = ref({}) // 节点ID到节点对象的映射

// 计算转换后的节点和边（应用缩放和平移）
const transformedNodes = computed(() => {
  return nodes.value.map(node => ({
    ...node,
    x: (node.x * zoomLevel.value) + panOffset.value.x,
    y: (node.y * zoomLevel.value) + panOffset.value.y
  }))
})

const transformedEdges = computed(() => {
  return edges.value.map(edge => ({
    ...edge,
    source: {
      x: (edge.source.x * zoomLevel.value) + panOffset.value.x,
      y: (edge.source.y * zoomLevel.value) + panOffset.value.y
    },
    target: {
      x: (edge.target.x * zoomLevel.value) + panOffset.value.x,
      y: (edge.target.y * zoomLevel.value) + panOffset.value.y
    }
  }))
})

// 地图交互处理
const handleZoom = (event) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(0.5, Math.min(5, zoomLevel.value + delta))
  zoomLevel.value = newZoom
}

const startPan = (event) => {
  isPanning.value = true
  startPanPos.value = { x: event.clientX, y: event.clientY }
}

const pan = (event) => {
  if (!isPanning.value) return
  const dx = event.clientX - startPanPos.value.x
  const dy = event.clientY - startPanPos.value.y
  startPanPos.value = { x: event.clientX, y: event.clientY }
  panOffset.value = {
    x: panOffset.value.x + dx,
    y: panOffset.value.y + dy
  }
}

const endPan = () => {
  isPanning.value = false
}

const resetZoom = () => {
  zoomLevel.value = 1
  panOffset.value = { x: 0, y: 0 }
  fitMapToBounds()
}

// 路况类型对应颜色
const roadTypeColors = {
  'primary': '#ff4500',      // 主干道 - 红色
  'secondary': '#ffa500',    // 次干道 - 橙色
  'tertiary': '#32cd32',     // 支路 - 绿色
  'residential': '#4169e1',  // 居民区道路 - 蓝色
  'service': '#808080',      // 服务道路 - 灰色
  'unclassified': '#9370db', // 未分类道路 - 紫色
  'motorway': '#ff0000',     // 高速公路 - 亮红色
  'trunk': '#ff8c00',        // 城市快速路 - 深橙色
  'default': '#3388ff'       // 默认颜色
}

// 加载CSV数据
const loadMapData = async () => {
  loading.value = true
  try {
    // 首先加载节点数据
    await loadNodeData()
    // 然后加载边数据，因为边需要引用节点
    await loadEdgeData()
    
    // 数据加载完成后，计算布局并适应视图范围
    computeCoordinates()
    fitMapToBounds()
    
    ElMessage.success('地图数据加载成功')
  } catch (error) {
    console.error('加载地图数据失败：', error)
    ElMessage.error('加载地图数据失败')
  } finally {
    loading.value = false
  }
}

// 加载节点数据
const loadNodeData = () => {
  return new Promise((resolve, reject) => {
    Papa.parse('/data/node-with-latitude-longitude.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('节点数据样例:', results.data.slice(0, 5));
        console.log('节点数据列:', results.meta.fields);
        
        // 处理并保存节点数据
        nodes.value = results.data.filter(row => row.Id && row.latitude && row.longitude).map(row => {
          const node = {
            id: row.Id,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            // 初始不设置SVG坐标，后面会计算
            x: 0,
            y: 0
          }
          nodeMap.value[node.id] = node
          return node
        })
        console.log(`成功加载 ${nodes.value.length} 个节点`);
        resolve()
      },
      error: (error) => {
        console.error('加载节点数据失败:', error);
        reject(error)
      }
    })
  })
}

// 加载边数据
const loadEdgeData = () => {
  return new Promise((resolve, reject) => {
    Papa.parse('/data/edge-with-road-label.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('边数据样例:', results.data.slice(0, 5));
        console.log('边数据列:', results.meta.fields);
        
        // 处理并保存边数据
        edges.value = results.data.reduce((validEdges, row) => {
          const sourceId = row.Source;
          const targetId = row.Target;
          
          // 只有当源节点和目标节点都在节点映射中时，才添加边
          if (nodeMap.value[sourceId] && nodeMap.value[targetId]) {
            const source = nodeMap.value[sourceId];
            const target = nodeMap.value[targetId];
            
            // 使用highwayType作为道路类型
            const roadType = row.highwayType || 'default';
            
            validEdges.push({
              id: row.Id,
              source: source,
              target: target,
              label: row.Label || 'Road',
              type: row.Type,
              highwayType: roadType,
              color: roadTypeColors[roadType] || roadTypeColors.default
            });
          }
          
          return validEdges;
        }, []);
        
        console.log(`成功加载 ${edges.value.length} 条边`);
        resolve();
      },
      error: (error) => {
        console.error('加载边数据失败:', error);
        reject(error);
      }
    });
  });
}

// 将经纬度转换为SVG坐标
const computeCoordinates = () => {
  if (nodes.value.length === 0) return
  
  // 计算经纬度范围
  let minLat = Number.MAX_VALUE
  let maxLat = Number.MIN_VALUE
  let minLng = Number.MAX_VALUE
  let maxLng = Number.MIN_VALUE
  
  nodes.value.forEach(node => {
    minLat = Math.min(minLat, node.latitude)
    maxLat = Math.max(maxLat, node.latitude)
    minLng = Math.min(minLng, node.longitude)
    maxLng = Math.max(maxLng, node.longitude)
  })
  
  // 计算缩放比例，保持宽高比
  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng
  const mapWidth = svgWidth.value - padding * 2
  const mapHeight = svgHeight.value - padding * 2
  
  const scale = Math.min(
    mapWidth / lngRange,
    mapHeight / latRange
  )
  
  // 转换所有节点的坐标
  nodes.value.forEach(node => {
    // 经度在水平方向（X轴）
    node.x = padding + ((node.longitude - minLng) * scale)
    // 纬度在垂直方向（Y轴），注意纬度需要反转，因为SVG的Y轴向下
    node.y = mapHeight + padding - ((node.latitude - minLat) * scale)
  })
}

// 调整视图以显示所有节点
const fitMapToBounds = () => {
  // 重置缩放和平移
  zoomLevel.value = 1
  panOffset.value = { x: 0, y: 0 }
}

// 组件加载完成后自动加载地图数据
onMounted(() => {
  // 页面加载完成后等待一会儿再加载数据
  setTimeout(() => {
    loadMapData()
  }, 1000)
})
</script>

<style scoped>
.map-container {
  width: 100%;
  margin: 20px 0;
}

.map-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.loading-container {
  padding: 40px 0;
  text-align: center;
}

.map-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.map {
  width: 100%;
  height: 800px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e6e6e6;
  background-color: #f9f9f9;
}

.map svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.map svg:active {
  cursor: grabbing;
}

.map-stats {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.map-stats p {
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}

.tooltip text {
  font-size: 12px;
  dominant-baseline: middle;
}

.controls rect:hover {
  fill: #e0e0e0;
  cursor: pointer;
}
</style> 