import { nodeApi, relationshipApi } from '../api'
import Papa from 'papaparse'

// 全局变量，用于存储节点ID到序号的映射
let nodeIdMap = {}

// localStorage 中存储映射的键名
const NODE_ID_MAP_KEY = 'graph_node_id_map'

/**
 * 保存节点ID映射到localStorage
 */
const saveNodeIdMapToStorage = () => {
  try {
    localStorage.setItem(NODE_ID_MAP_KEY, JSON.stringify(nodeIdMap))
    console.log('节点ID映射已保存到本地存储')
  } catch (error) {
    console.error('保存节点ID映射失败', error)
  }
}

/**
 * 从localStorage加载节点ID映射
 */
const loadNodeIdMapFromStorage = () => {
  try {
    const savedMap = localStorage.getItem(NODE_ID_MAP_KEY)
    if (savedMap) {
      nodeIdMap = JSON.parse(savedMap)
      console.log('从本地存储加载了节点ID映射')
      return true
    }
  } catch (error) {
    console.error('加载节点ID映射失败', error)
  }
  return false
}

/**
 * 清除localStorage中的节点ID映射
 */
export const clearNodeIdMap = () => {
  try {
    localStorage.removeItem(NODE_ID_MAP_KEY)
    nodeIdMap = {}
    console.log('节点ID映射已清除')
  } catch (error) {
    console.error('清除节点ID映射失败', error)
  }
}

/**
 * 获取节点ID映射
 * @returns {Object} 节点ID到创建序号的映射
 */
export const getNodeIdMap = () => {
  // 如果映射为空，尝试从localStorage加载
  if (Object.keys(nodeIdMap).length === 0) {
    loadNodeIdMapFromStorage()
  }
  return nodeIdMap
}

/**
 * 导入节点数据
 * @param {string} csvFilePath - CSV文件路径
 * @param {boolean} resetMap - 是否重置现有的节点映射
 * @returns {Promise<number>} - 创建的节点数量
 */
export const importNodes = async (csvFilePath, resetMap = true) => {
  try {
    // 如果resetMap为true，则清空节点映射
    // 否则尝试从localStorage加载已有的映射
    if (resetMap) {
      nodeIdMap = {}
    } else if (Object.keys(nodeIdMap).length === 0) {
      loadNodeIdMapFromStorage()
    }
    
    // 获取CSV文件
    const response = await fetch(csvFilePath)
    const csvText = await response.text()
    
    // 解析CSV
    const { data } = Papa.parse(csvText, { header: true })
    
    console.log(`开始导入节点，总计 ${data.length} 条数据`)
    let successCount = 0
    
    // 逐行处理数据
    for (const row of data) {
      if (!row.Id || row.Id === '') continue
      
      // 创建节点属性对象
      const nodeProperties = {
        Id: row.Id, 
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude)
      }
      
      try {
        // 调用API创建节点
        await nodeApi.createNode(nodeProperties)
        // 记录节点ID到序号的映射
        nodeIdMap[row.Id] = successCount
        successCount++
        
        // 只有每1000个节点才输出一次日志，减少控制台输出
        if(successCount % 1000 === 0) {
          console.log(`已创建 ${successCount} 个节点`)
        }
      } catch (error) {
        console.error(`创建节点失败: ${row.Id}`, error)
      }
    }
    
    // 保存映射到localStorage
    saveNodeIdMapToStorage()
    
    console.log(`导入完成! 成功创建 ${successCount} 个节点`)
    return successCount
  } catch (error) {
    console.error('导入节点数据失败', error)
    throw error
  }
}

/**
 * 导入边数据
 * @param {string} csvFilePath - CSV文件路径
 * @returns {Promise<number>} - 创建的边数量
 */
export const importRelationships = async (csvFilePath) => {
  try {
    // 如果映射为空，尝试从localStorage加载
    if (Object.keys(nodeIdMap).length === 0) {
      const loaded = loadNodeIdMapFromStorage()
      if (!loaded) {
        console.error('节点ID映射为空，请先导入节点数据')
        return 0
      }
    }
    
    // 获取CSV文件
    const response = await fetch(csvFilePath)
    const csvText = await response.text()
    
    // 解析CSV
    const { data } = Papa.parse(csvText, { header: true })
    
    console.log(`开始导入边，总计 ${data.length} 条数据`)
    let successCount = 0
    
    // 逐行处理数据
    for (const row of data) {
      if (!row.Source || !row.Target) continue
      
      // 检查源节点和目标节点是否存在于映射中
      const sourceNodeId = nodeIdMap[row.Source]
      const targetNodeId = nodeIdMap[row.Target]
      
      // 创建边属性对象
      const relationshipProperties = {
        Id: row.Id,
        Label: row.Label || '',
        highwayType: row.highwayType || ''
      }
      
      try {
        // 检查节点是否存在
        if (sourceNodeId === undefined || targetNodeId === undefined) {
          console.warn(`创建边 ${row.Id} 时发现节点映射缺失:`, 
            sourceNodeId === undefined ? `源节点 ${row.Source} 不在映射中` : '',
            targetNodeId === undefined ? `目标节点 ${row.Target} 不在映射中` : '')
          continue // 如果节点不存在，跳过此边的创建
        }
        
        // 调用API创建边，使用节点ID而不是布尔值
        await relationshipApi.createRelationship(
          sourceNodeId, 
          targetNodeId, 
          row.Type || 'Directed',
          relationshipProperties
        )
        successCount++
        
        // 只有每1000条边才输出一次日志，减少控制台输出
        if(successCount % 1000 === 0) {
          console.log(`已创建 ${successCount} 条边`)
        }
      } catch (error) {
        console.error(`创建边失败: ${row.Source} -> ${row.Target}`, error)
      }
    }
    
    console.log(`导入完成! 成功创建 ${successCount} 条边`)
    return successCount
  } catch (error) {
    console.error('导入边数据失败', error)
    throw error
  }
} 