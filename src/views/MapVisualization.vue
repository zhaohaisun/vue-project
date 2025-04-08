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
        <l-map ref="map" v-model:zoom="zoom" :center="center" class="map">
          <l-tile-layer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            layer-type="base"
            name="OpenStreetMap"
          ></l-tile-layer>
          
          <!-- 显示节点 -->
          <l-marker 
            v-for="node in nodes.slice(0, maxDisplayedNodes)" 
            :key="node.id" 
            :lat-lng="[node.latitude, node.longitude]"
          >
            <l-tooltip>{{ node.id }}</l-tooltip>
          </l-marker>
          
          <!-- 显示边/道路 -->
          <l-polyline 
            v-for="(edge, index) in edges.slice(0, maxDisplayedEdges)" 
            :key="index"
            :lat-lngs="edge.points"
            :color="edge.color || '#3388ff'"
            :weight="2"
          >
            <l-tooltip>{{ edge.label || 'Road' }}</l-tooltip>
          </l-polyline>
        </l-map>
        
        <div class="map-stats">
          <p>已加载节点: {{ nodes.length }} (显示: {{ Math.min(nodes.length, maxDisplayedNodes) }})</p>
          <p>已加载边: {{ edges.length }} (显示: {{ Math.min(edges.length, maxDisplayedEdges) }})</p>
          <el-slider 
            v-model="maxDisplayedNodes" 
            :min="100" 
            :max="2000" 
            :step="100"
            show-stops
            show-input
            :marks="{100: '100', 1000: '1000', 2000: '2000'}"
          >
            <template #label>
              <div>节点显示数量: {{ maxDisplayedNodes }}</div>
            </template>
          </el-slider>
          <el-slider 
            v-model="maxDisplayedEdges" 
            :min="100" 
            :max="2000" 
            :step="100"
            show-stops
            show-input
            :marks="{100: '100', 1000: '1000', 2000: '2000'}"
          >
            <template #label>
              <div>边显示数量: {{ maxDisplayedEdges }}</div>
            </template>
          </el-slider>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import Papa from 'papaparse'
import { 
  LMap, 
  LTileLayer, 
  LMarker, 
  LPolyline, 
  LTooltip 
} from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import '../utils/leaflet-icon-fix.js'  // 引入图标修复

// 地图配置
const zoom = ref(13)
const center = ref([39.9042, 116.4074]) // 北京中心位置
const map = ref(null)

// 数据状态
const loading = ref(false)
const nodes = ref([])
const edges = ref([])
const nodeMap = ref({}) // 节点ID到节点对象的映射
const maxDisplayedNodes = ref(500)
const maxDisplayedEdges = ref(500)

// 路况类型对应颜色
const roadTypeColors = {
  'primary': '#ff4500',    // 主干道 - 红色
  'secondary': '#ffa500',  // 次干道 - 橙色
  'tertiary': '#32cd32',   // 支路 - 绿色
  'residential': '#4169e1', // 居民区道路 - 蓝色
  'service': '#808080',    // 服务道路 - 灰色
  'default': '#3388ff'     // 默认颜色
}

// 加载CSV数据
const loadMapData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadNodeData(),
      loadEdgeData()
    ])
    
    // 数据加载完成后，自动适应地图范围
    if (nodes.value.length > 0) {
      fitMapToBounds()
    }
    
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
        // 处理并保存节点数据
        nodes.value = results.data.map(row => {
          const node = {
            id: row.Id || row.id,
            latitude: row.latitude,
            longitude: row.longitude
          }
          nodeMap.value[node.id] = node
          return node
        })
        resolve()
      },
      error: (error) => {
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
        // 处理并保存边数据
        edges.value = results.data.reduce((validEdges, row) => {
          const sourceId = row.Source || row.source
          const targetId = row.Target || row.target
          
          // 只有当源节点和目标节点都在节点映射中时，才添加边
          if (nodeMap.value[sourceId] && nodeMap.value[targetId]) {
            const source = nodeMap.value[sourceId]
            const target = nodeMap.value[targetId]
            
            validEdges.push({
              source: sourceId,
              target: targetId,
              points: [
                [source.latitude, source.longitude],
                [target.latitude, target.longitude]
              ],
              label: row.road_type || 'Road',
              color: roadTypeColors[row.road_type] || roadTypeColors.default
            })
          }
          
          return validEdges
        }, [])
        
        resolve()
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

// 调整地图显示范围以适应所有节点
const fitMapToBounds = () => {
  if (!map.value || nodes.value.length === 0) return
  
  // 计算节点的经纬度范围
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
  
  // 设置地图中心和缩放级别
  center.value = [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
  
  // 使用Leaflet的方法调整地图范围
  const instance = map.value.leafletObject
  if (instance && instance.fitBounds) {
    instance.fitBounds([
      [minLat, minLng],
      [maxLat, maxLng]
    ])
  }
}

// 组件加载完成后自动加载地图数据
onMounted(() => {
  // 页面加载完成后等待一会儿再加载数据，确保地图组件已渲染
  setTimeout(() => {
    loadMapData()
  }, 500)
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
  height: 600px;
  z-index: 0;
  border-radius: 4px;
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
</style> 