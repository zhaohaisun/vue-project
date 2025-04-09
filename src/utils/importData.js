import { nodeApi, relationshipApi } from '../api'
import Papa from 'papaparse'

/**
 * 导入节点数据
 * @param {string} csvFilePath - CSV文件路径
 * @returns {Promise<Array>} - 创建的节点ID列表
 */
export const importNodes = async (csvFilePath) => {
  try {
    // 获取CSV文件
    const response = await fetch(csvFilePath)
    const csvText = await response.text()
    
    // 解析CSV
    const { data } = Papa.parse(csvText, { header: true })
    
    const createdNodes = []
    
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
        const result = await nodeApi.createNode(nodeProperties)
        console.log(`创建节点成功: ${row.Id}`)
        createdNodes.push(result.data)
      } catch (error) {
        console.error(`创建节点失败: ${row.Id}`, error)
      }
    }
    
    console.log(`导入完成! 成功创建 ${createdNodes.length} 个节点`)
    return createdNodes
  } catch (error) {
    console.error('导入节点数据失败', error)
    throw error
  }
}

/**
 * 导入边数据
 * @param {string} csvFilePath - CSV文件路径
 * @returns {Promise<Array>} - 创建的边ID列表
 */
export const importRelationships = async (csvFilePath) => {
  try {
    // 获取CSV文件
    const response = await fetch(csvFilePath)
    const csvText = await response.text()
    
    // 解析CSV
    const { data } = Papa.parse(csvText, { header: true })
    
    const createdRelationships = []
    
    // 逐行处理数据
    for (const row of data) {
      if (!row.Source || !row.Target) continue
      
      // 创建边属性对象
      const relationshipProperties = {
        Id: row.Id,
        Label: row.Label || '',
        highwayType: row.highwayType || ''
      }
      
      try {
        // 调用API创建边
        const result = await relationshipApi.createRelationship(
          row.Source, 
          row.Target, 
          row.Type || 'Directed',
          relationshipProperties
        )
        console.log(`创建边成功: ${row.Source} -> ${row.Target}`)
        createdRelationships.push(result.data)
      } catch (error) {
        console.error(`创建边失败: ${row.Source} -> ${row.Target}`, error)
      }
    }
    
    console.log(`导入完成! 成功创建 ${createdRelationships.length} 条边`)
    return createdRelationships
  } catch (error) {
    console.error('导入边数据失败', error)
    throw error
  }
} 