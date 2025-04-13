<template>
  <div class="system-info">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="system-card">
          <template #header>
            <div class="card-header">
              <span>系统资源监控</span>
              <div>
                <el-tooltip content="刷新" placement="top">
                  <el-button :icon="Refresh" circle @click="fetchSystemInfo" />
                </el-tooltip>
                <el-tooltip content="自动刷新" placement="top">
                  <el-switch
                    v-model="autoRefresh"
                    active-text="自动刷新"
                    @change="handleAutoRefreshChange"
                  />
                </el-tooltip>
              </div>
            </div>
          </template>
          
          <el-row :gutter="20" class="stat-cards">
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <el-icon><Monitor /></el-icon>
                    <span>CPU使用率</span>
                  </div>
                </template>
                <div class="chart-container">
                  <div ref="cpuChart" class="chart"></div>
                  <div class="stat-number">{{ cpuUsage }}%</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <el-icon><Cloudy /></el-icon>
                    <span>内存使用率</span>
                  </div>
                </template>
                <div class="chart-container">
                  <div ref="memoryChart" class="chart"></div>
                  <div class="stat-number">{{ memoryUsage }}%</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <el-icon><SwitchButton /></el-icon>
                    <span>线程数</span>
                  </div>
                </template>
                <div class="chart-container">
                  <div ref="threadChart" class="chart"></div>
                  <div class="stat-number">{{ threadCount }}</div>
                </div>
              </el-card>
            </el-col>
          </el-row>
          
          <el-row :gutter="20" class="details-row">
            <el-col :span="8">
              <el-card shadow="hover" class="detail-card">
                <template #header>
                  <div class="card-header">
                    <span>内存详情</span>
                  </div>
                </template>
                <el-descriptions border :column="1">
                  <el-descriptions-item label="总内存">
                    {{ formatMemorySize(memoryDetails.total) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="已使用">
                    {{ formatMemorySize(memoryDetails.used) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="空闲内存">
                    {{ formatMemorySize(memoryDetails.free) }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover" class="detail-card">
                <template #header>
                  <div class="card-header">
                    <span>线程状态</span>
                  </div>
                </template>
                <el-table 
                  :data="threadDetails" 
                  style="width: 100%" 
                  height="216px"
                  :header-cell-style="{ background: '#f5f7fa' }"
                >
                  <el-table-column prop="name" label="线程状态" />
                  <el-table-column prop="count" label="数量">
                    <template #default="scope">
                      <el-tag :type="getStateType(scope.row.state)">{{ scope.row.count }}</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover" class="detail-card">
                <template #header>
                  <div class="card-header">
                    <el-icon><FolderOpened /></el-icon>
                    <span>数据库空间 ({{ currentDatabase }})</span>
                  </div>
                </template>
                <p v-if="dbPath" class="db-path">
                  <span class="label">路径:</span> {{ dbPath }}
                </p>
                <el-table 
                  :data="dbSpaceDetails" 
                  style="width: 100%" 
                  height="180px"
                  :header-cell-style="{ background: '#f5f7fa' }"
                >
                  <el-table-column prop="name" label="数据类型" />
                  <el-table-column prop="size" label="大小" />
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Refresh, Monitor, Cloudy, SwitchButton, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '../api'
import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5/+esm'

// 系统资源使用情况
const cpuUsage = ref(0)
const memoryUsage = ref(0)
const threadCount = ref(0)

// 自动刷新
const autoRefresh = ref(false)
let refreshInterval = null

// 图表实例
const cpuChart = ref(null)
const memoryChart = ref(null)
const threadChart = ref(null)
let cpuChartInstance = null
let memoryChartInstance = null
let threadChartInstance = null

// 当前数据库
const currentDatabase = ref(localStorage.getItem('currentDatabase') || 'test')

// 数据库空间详情
const dbSpaceDetails = ref([])
const dbPath = ref('')

// 详细信息
const memoryDetails = reactive({
  total: 0,
  used: 0,
  free: 0,
  heap: 0,
  nonHeap: 0
})

const threadDetails = ref([])

// 获取系统信息
const fetchSystemInfo = async () => {
  try {
    // 获取系统资源
    const resourcesRes = await systemApi.getSystemResources()
    const resources = resourcesRes.data || {}
    
    // 根据后端API返回格式解析数据
    // 内存信息
    const usedMemory = parseMemorySize(resources.usedMemory || '0 MB')
    const totalMemory = parseMemorySize(resources.totalMemory || '0 MB')
    const freeMemory = parseMemorySize(resources.freeMemory || '0 MB')
    
    // 计算内存使用百分比
    const memPercent = totalMemory > 0 ? (usedMemory / totalMemory * 100) : 0
    
    // 更新CPU使用率
    cpuUsage.value = parseFloat(resources.processCpuLoad?.replace('%', '') || resources.systemCpuLoad?.replace('%', '') || 0)
    
    // 更新内存使用率和详情
    memoryUsage.value = memPercent.toFixed(2)
    memoryDetails.total = totalMemory
    memoryDetails.used = usedMemory
    memoryDetails.free = freeMemory
    
    // 获取线程信息
    const threadsRes = await systemApi.getSystemThreads()
    const threads = threadsRes.data || {}
    
    // 更新线程数和状态
    threadCount.value = threads.qtpThreadCount || 0
    
    // 更新线程详情
    const threadStatesList = []
    if (threads.qtpThreadStates) {
      Object.entries(threads.qtpThreadStates).forEach(([state, count]) => {
        threadStatesList.push({
          name: `${state} 线程`,
          state: state,
          count: count
        })
      })
    }
    threadDetails.value = threadStatesList
    
    // 如果有选定的数据库，获取数据库空间信息
    if (currentDatabase.value) {
      try {
        const spaceRes = await systemApi.getDatabaseSpace(currentDatabase.value)
        const spaceData = spaceRes.data || {}
        
        if (spaceData.space_statistics) {
          dbSpaceDetails.value = Object.entries(spaceData.space_statistics).map(([key, value]) => ({
            name: formatDbSpaceName(key),
            size: value
          }))
        }
        
        if (spaceData.db_path) {
          dbPath.value = spaceData.db_path
        }
      } catch (error) {
        console.error('获取数据库空间信息失败:', error)
      }
    }
    
    // 更新图表
    updateCharts()
  } catch (error) {
    console.error('获取系统信息失败:', error)
    ElMessage.error('获取系统信息失败')
  }
}

// 解析内存大小字符串，返回字节数
const parseMemorySize = (sizeStr) => {
  if (!sizeStr) return 0
  
  const regex = /(\d+\.?\d*)\s*([KMGT]?B)/i
  const match = sizeStr.match(regex)
  
  if (!match) return 0
  
  const size = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  
  const units = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024, 'TB': 1024 * 1024 * 1024 * 1024 }
  
  return size * (units[unit] || 1)
}

// 格式化数据库空间名称
const formatDbSpaceName = (key) => {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

// 更新图表
const updateCharts = () => {
  // 更新CPU图表
  if (cpuChartInstance) {
    cpuChartInstance.setOption({
      series: [{
        data: [{
          value: cpuUsage.value,
          name: 'CPU使用率'
        }]
      }]
    })
  }
  
  // 更新内存图表
  if (memoryChartInstance) {
    memoryChartInstance.setOption({
      series: [{
        data: [{
          value: memoryUsage.value,
          name: '内存使用率'
        }]
      }]
    })
  }
  
  // 更新线程图表
  if (threadChartInstance) {
    // 更新历史数据
    const now = new Date()
    threadHistoryData.push([
      now.getTime(),
      threadCount.value
    ])
    
    // 只保留最近10分钟的数据
    const tenMinutesAgo = now.getTime() - 10 * 60 * 1000
    while (threadHistoryData.length > 0 && threadHistoryData[0][0] < tenMinutesAgo) {
      threadHistoryData.shift()
    }
    
    threadChartInstance.setOption({
      series: [{
        data: threadHistoryData
      }]
    })
  }
}

// 线程历史数据
const threadHistoryData = []

// 初始化图表
const initCharts = () => {
  // 初始化CPU使用率图表
  cpuChartInstance = echarts.init(cpuChart.value)
  cpuChartInstance.setOption({
    series: [{
      type: 'gauge',
      startAngle: 90,
      endAngle: -270,
      pointer: {
        show: false
      },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#1a237e' },
              { offset: 1, color: '#5c6bc0' }
            ]
          }
        }
      },
      axisLine: {
        lineStyle: {
          width: 15
        }
      },
      splitLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        show: false
      },
      data: [{
        value: cpuUsage.value,
        name: 'CPU使用率',
        title: {
          offsetCenter: ['0%', '0%']
        },
        detail: {
          valueAnimation: true,
          offsetCenter: ['0%', '0%']
        }
      }]
    }]
  })
  
  // 初始化内存使用率图表
  memoryChartInstance = echarts.init(memoryChart.value)
  memoryChartInstance.setOption({
    series: [{
      type: 'gauge',
      startAngle: 90,
      endAngle: -270,
      pointer: {
        show: false
      },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#00695c' },
              { offset: 1, color: '#4db6ac' }
            ]
          }
        }
      },
      axisLine: {
        lineStyle: {
          width: 15
        }
      },
      splitLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        show: false
      },
      data: [{
        value: memoryUsage.value,
        name: '内存使用率',
        title: {
          offsetCenter: ['0%', '0%']
        },
        detail: {
          valueAnimation: true,
          offsetCenter: ['0%', '0%']
        }
      }]
    }]
  })
  
  // 初始化线程数图表
  threadChartInstance = echarts.init(threadChart.value)
  
  // 添加当前时间的数据点
  const now = new Date()
  threadHistoryData.push([
    now.getTime(),
    threadCount.value
  ])
  
  threadChartInstance.setOption({
    grid: {
      left: '5%',
      right: '5%',
      top: '5%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      splitLine: {
        show: false
      },
      axisLabel: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        show: false
      },
      axisLabel: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLine: {
        show: false
      }
    },
    series: [{
      data: threadHistoryData,
      type: 'line',
      smooth: true,
      symbol: 'none',
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(128, 0, 128, 0.5)' },
            { offset: 1, color: 'rgba(128, 0, 128, 0.1)' }
          ]
        }
      },
      lineStyle: {
        color: 'purple'
      }
    }]
  })
  
  // 处理窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 处理窗口大小变化
const handleResize = () => {
  cpuChartInstance?.resize()
  memoryChartInstance?.resize()
  threadChartInstance?.resize()
}

// 处理自动刷新变化
const handleAutoRefreshChange = (val) => {
  if (val) {
    // 开启自动刷新，每5秒刷新一次
    refreshInterval = setInterval(fetchSystemInfo, 5000)
  } else {
    // 关闭自动刷新
    clearInterval(refreshInterval)
  }
}

// 格式化内存大小
const formatMemorySize = (size) => {
  if (!size) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let formattedSize = size
  
  while (formattedSize >= 1024 && index < units.length - 1) {
    formattedSize /= 1024
    index++
  }
  
  return `${formattedSize.toFixed(2)} ${units[index]}`
}

// 格式化CPU时间
const formatCpuTime = (nanoseconds) => {
  if (!nanoseconds) return '0 ms'
  
  // 转换为毫秒
  const ms = nanoseconds / 1000000
  
  if (ms < 1000) {
    return `${ms.toFixed(2)} ms`
  }
  
  // 转换为秒
  const seconds = ms / 1000
  
  if (seconds < 60) {
    return `${seconds.toFixed(2)} s`
  }
  
  // 转换为分钟
  const minutes = seconds / 60
  return `${minutes.toFixed(2)} min`
}

// 获取线程状态对应的标签类型
const getStateType = (state) => {
  const stateMap = {
    'RUNNABLE': 'success',
    'BLOCKED': 'danger',
    'WAITING': 'warning',
    'TIMED_WAITING': 'info',
    'NEW': 'primary',
    'TERMINATED': 'danger'
  }
  
  return stateMap[state] || ''
}

// 页面加载时获取数据并初始化图表
onMounted(() => {
  fetchSystemInfo()
  
  // 等待DOM渲染完成后初始化图表
  setTimeout(() => {
    initCharts()
  }, 100)
})

// 页面卸载时清理资源
onUnmounted(() => {
  // 清除自动刷新
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  
  // 清除窗口大小变化监听
  window.removeEventListener('resize', handleResize)
  
  // 销毁图表实例
  cpuChartInstance?.dispose()
  memoryChartInstance?.dispose()
  threadChartInstance?.dispose()
})
</script>

<style scoped>
.system-info {
  height: 100%;
}

.system-card {
  height: calc(100vh - 130px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header .el-icon {
  margin-right: 8px;
}

.stat-cards {
  margin-bottom: 20px;
}

.chart-container {
  position: relative;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.stat-number {
  position: relative;
  z-index: 1;
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.details-row {
  margin-top: 20px;
}

.detail-card {
  height: 100%;
}

.db-path {
  padding: 0 8px;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
  word-break: break-all;
}

.db-path .label {
  font-weight: bold;
  color: #333;
}
</style> 