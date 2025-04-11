import { nodeApi, relationshipApi } from '../api'
import Papa from 'papaparse'

// 全局变量，用于存储节点ID到序号的映射
let nodeIdMap = {}

/**
 * 获取节点ID映射
 * @returns {Object} 节点ID到创建序号的映射
 */
export const getNodeIdMap = () => {
  return nodeIdMap
}

/**
 * 导入节点数据
 * @param {string} csvFilePath - CSV文件路径
 * @returns {Promise<number>} - 创建的节点数量
 */
export const importNodes = async (csvFilePath) => {
  try {
    // 清空节点映射
    nodeIdMap = {}
    
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