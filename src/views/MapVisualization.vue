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
          <canvas 
            ref="mapCanvas"
            :width="canvasWidth"
            :height="canvasHeight"
            @wheel="handleZoom"
            @mousedown="startPan"
            @mousemove="pan"
            @mouseup="endPan"
            @mouseleave="endPan"
            style="cursor: grab;"
          ></canvas>
          
          <!-- 控制面板可以保持在Canvas之外 -->
          <div class="controls">
            <span>缩放: {{ zoomLevel.toFixed(1) }}x</span>
            <el-button size="small" @click="resetZoom">重置视图</el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import Papa from 'papaparse'

// Canvas地图配置
const canvasWidth = ref(1200)
const canvasHeight = ref(800)
const padding = 50 // 边缘留白，用于坐标计算
const mapCanvas = ref(null)
let ctx = null

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

// -----------------
// 坐标转换辅助函数 <--- 添加这里
// -----------------
const transformX = (x) => (x * zoomLevel.value) + panOffset.value.x
const transformY = (y) => (y * zoomLevel.value) + panOffset.value.y

// 绘图逻辑
const drawMap = () => {
  if (!ctx) return
  
  // 清除画布
  ctx.fillStyle = '#F0F0F0' // 背景色
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

  // 优化：只绘制视口内的元素
  const viewMinX = 0
  const viewMinY = 0
  const viewMaxX = canvasWidth.value
  const viewMaxY = canvasHeight.value

  // 绘制边
  // 边的宽度在缩小时变细，放大时保持适当粗细
  const edgeWidth = Math.min(2, Math.max(0.5, zoomLevel.value * 0.5));
  ctx.lineWidth = edgeWidth;
  
  for (const edge of edges.value) {
    const sourceNode = nodeMap.value[edge.source.id]
    const targetNode = nodeMap.value[edge.target.id]
    if (!sourceNode || !targetNode) continue // 跳过无效边

    const sourceX = transformX(sourceNode.x)
    const sourceY = transformY(sourceNode.y)
    const targetX = transformX(targetNode.x)
    const targetY = transformY(targetNode.y)
    
    // 简单的视口剔除 (检查线段的包围盒是否与视口相交)
    const minX = Math.min(sourceX, targetX)
    const maxX = Math.max(sourceX, targetX)
    const minY = Math.min(sourceY, targetY)
    const maxY = Math.max(sourceY, targetY)
    
    if (maxX >= viewMinX && minX <= viewMaxX && maxY >= viewMinY && minY <= viewMaxY) {
      ctx.strokeStyle = edge.color
      ctx.beginPath()
      ctx.moveTo(sourceX, sourceY)
      ctx.lineTo(targetX, targetY)
      ctx.stroke()
    }
  }

  // 绘制节点 - 节点大小在放大时变大，缩小时变小
  // 基础节点大小 - 减小为原来的一半
  const baseNodeRadius = 1; // 从2减小到1
  
  // 优化节点大小计算，使高缩放级别下节点保持合理大小
  // 使用对数函数使节点大小增长更加缓慢
  let nodeRadius;
  if (zoomLevel.value <= 1) {
    // 当缩放小于1时，线性缩放，但减小最小值
    nodeRadius = Math.max(0.25, zoomLevel.value * baseNodeRadius); // 最小值从0.5减小到0.25
  } else {
    // 当缩放大于1时，使用对数函数减缓增长，并降低最大值
    const logFactor = Math.log10(zoomLevel.value * 9 + 1) * 0.7; // 系数从0.8降低到0.7
    nodeRadius = Math.min(1.5, baseNodeRadius * logFactor); // 最大值从3降低到1.5
  }
  
  // 当缩放太小时（概览模式），不显示单个节点，只显示轮廓
  if (zoomLevel.value < 0.3) {
    // 绘制所有节点的轮廓，减小轮廓大小
    ctx.fillStyle = 'rgba(51, 136, 255, 0.2)';  // 半透明蓝色
    ctx.beginPath();
    for (const node of nodes.value) {
      const x = transformX(node.x);
      const y = transformY(node.y);
      if (x >= viewMinX && x <= viewMaxX && y >= viewMinY && y <= viewMaxY) {
        ctx.rect(x - 0.5, y - 0.5, 1, 1); // 从2x2减小到1x1
      }
    }
    ctx.fill();
  } else {
    // 正常绘制各个节点
    ctx.fillStyle = '#3388ff';
    for (const node of nodes.value) {
      const x = transformX(node.x);
      const y = transformY(node.y);
      
      // 视口剔除
      if (x + nodeRadius >= viewMinX && x - nodeRadius <= viewMaxX && 
          y + nodeRadius >= viewMinY && y - nodeRadius <= viewMaxY) {
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// 地图交互处理
const handleZoom = (event) => {
  event.preventDefault()
  
  const rect = mapCanvas.value.getBoundingClientRect();
  const mouseX = event.clientX - rect.left; // 鼠标在Canvas内的X坐标
  const mouseY = event.clientY - rect.top;  // 鼠标在Canvas内的Y坐标

  // 计算鼠标指向的地图坐标 (逆转换)
  const mapMouseX = (mouseX - panOffset.value.x) / zoomLevel.value;
  const mapMouseY = (mouseY - panOffset.value.y) / zoomLevel.value;

  // 计算缩放因子
  const scaleMultiplier = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  const newZoom = Math.max(0.1, Math.min(40, zoomLevel.value * scaleMultiplier));

  // 更新缩放级别
  zoomLevel.value = newZoom;

  // 更新平移量，使鼠标指向的点保持在原地
  panOffset.value.x = mouseX - mapMouseX * newZoom;
  panOffset.value.y = mouseY - mapMouseY * newZoom;

  // 使用 requestAnimationFrame 优化重绘
  requestAnimationFrame(drawMap);
}

const startPan = (event) => {
  isPanning.value = true
  mapCanvas.value.style.cursor = 'grabbing'
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
  // 使用 requestAnimationFrame 优化重绘
  requestAnimationFrame(drawMap);
}

const endPan = () => {
  if (isPanning.value) {
    isPanning.value = false
    mapCanvas.value.style.cursor = 'grab'
  }
}

const resetZoom = () => {
  zoomLevel.value = 1
  panOffset.value = { x: 0, y: 0 }
  fitMapToBounds()
  requestAnimationFrame(drawMap);
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
  nodes.value = []
  edges.value = []
  nodeMap.value = {}
  ctx = null // 重置上下文
  try {
    // 首先加载节点数据
    await loadNodeData()
    // 然后加载边数据，因为边需要引用节点
    await loadEdgeData()
    
    // 数据加载完成后，计算布局并适应视图范围
    computeCoordinates()
    fitMapToBounds() // 重置视图
    
    // 数据加载完毕，准备渲染
    loading.value = false // 先设置loading为false，让canvas渲染出来
    
    await nextTick() // 等待DOM更新，确保canvas元素已存在
    
    if (mapCanvas.value) {
       ctx = mapCanvas.value.getContext('2d')
       if (ctx) {
         console.log('Canvas 2D 上下文获取成功')
         drawMap() // 初始绘制
         ElMessage.success('地图数据加载成功')
       } else {
         throw new Error('无法获取Canvas 2D上下文')
       }
    } else {
       // 如果nextTick后仍然找不到canvas，则提示错误
      console.error('Canvas ref (mapCanvas) 在 nextTick 后仍然无效');
      throw new Error('Canvas元素未在DOM中找到，无法进行绘制')
    }
  } catch (error) {
    console.error('加载或绘制地图数据失败：', error)
    ElMessage.error(`加载地图数据失败: ${error.message}`)
    loading.value = false // 确保出错时也关闭loading状态
  }
  // loading 在成功获取上下文并绘制后保持false，出错时也设置为false
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
        
        nodes.value = results.data.filter(row => row.Id && row.latitude && row.longitude).map(row => {
          const node = {
            id: row.Id,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            x: 0, // 初始SVG坐标
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
        
        edges.value = results.data.reduce((validEdges, row) => {
          const sourceId = row.Source;
          const targetId = row.Target;
          
          if (nodeMap.value[sourceId] && nodeMap.value[targetId]) {
            const source = nodeMap.value[sourceId];
            const target = nodeMap.value[targetId];
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

// 将经纬度转换为初始Canvas坐标
const computeCoordinates = () => {
  if (nodes.value.length === 0) return
  
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
  
  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng
  const mapWidth = canvasWidth.value - padding * 2
  const mapHeight = canvasHeight.value - padding * 2
  
  // 计算初始缩放比例，以适应画布
  const scale = Math.min(
    mapWidth / (lngRange || 1), // 防止除以0
    mapHeight / (latRange || 1)
  )
  
  // 计算偏移量使地图居中
  const initialOffsetX = (canvasWidth.value - lngRange * scale) / 2;
  const initialOffsetY = (canvasHeight.value - latRange * scale) / 2;
  
  // 转换所有节点的初始坐标
  nodes.value.forEach(node => {
    node.x = initialOffsetX + ((node.longitude - minLng) * scale)
    node.y = initialOffsetY + (mapHeight - ((node.latitude - minLat) * scale)) // Y轴反转
  })
}

// 重置视图到初始状态
const fitMapToBounds = () => {
  zoomLevel.value = 1 // 重置缩放为1
  // 计算居中偏移量
  if (nodes.value.length > 0) {
    let minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE, minY = Number.MAX_VALUE, maxY = Number.MIN_VALUE;
    nodes.value.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    // 简单的居中偏移计算
    panOffset.value = {
       x: (canvasWidth.value - boundsWidth) / 2 - minX,
       y: (canvasHeight.value - boundsHeight) / 2 - minY
    }
  } else {
    panOffset.value = { x: 0, y: 0 };
  }
}

// 组件加载完成后自动加载地图数据
onMounted(() => {
  // 不再在onMounted中获取上下文，移至loadMapData内部
  // 延迟加载数据
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
  height: 800px; /* 或者根据需要调整 */
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e6e6e6;
  background-color: #f9f9f9;
  position: relative; /* 为控制面板定位 */
}

.map canvas {
  display: block; /* 移除canvas底部空白 */
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

/* 控制面板样式 */
.controls {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.controls span {
  font-size: 12px;
}
</style> 