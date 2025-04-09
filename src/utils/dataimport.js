import Papa from 'papaparse'
import { createNode, createRelationship } from '../api/index'

/**
 * 导入节点数据
 * @param {File} file - CSV文件对象
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<Object>} 导入结果
 */
export const importNodes = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const nodeIdMapping = {}
    const results = {
      totalNodes: 0,
      importedCount: 0,
      errorCount: 0,
      errors: [],
      nodeIdMapping
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parseResults) => {
        try {
          const { data } = parseResults
          results.totalNodes = data.length

          // 创建所有节点
          for (let i = 0; i < data.length; i++) {
            const nodeData = data[i]
            
            try {
              // 确保节点有ID
              if (!nodeData.Id) {
                throw new Error('节点缺少Id字段')
              }

              // 准备节点属性
              const properties = {
                Id: nodeData.Id,
                latitude: parseFloat(nodeData.latitude) || 0,
                longitude: parseFloat(nodeData.longitude) || 0
              }

              // 添加其他可能的属性
              Object.keys(nodeData).forEach(key => {
                if (!['Id', 'latitude', 'longitude'].includes(key) && nodeData[key]) {
                  properties[key] = nodeData[key]
                }
              })

              // 创建节点
              const response = await createNode(properties)
              
              if (response && response.id) {
                // 保存原始ID到新节点ID的映射
                nodeIdMapping[nodeData.Id] = response.id
                results.importedCount++
              } else {
                throw new Error('创建节点失败')
              }
            } catch (error) {
              results.errorCount++
              results.errors.push({
                nodeData,
                error: error.message || '未知错误'
              })
            }

            // 更新进度
            if (onProgress && typeof onProgress === 'function') {
              onProgress({
                current: i + 1,
                total: data.length,
                complete: i + 1 >= data.length
              })
            }
          }

          resolve(results)
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 导入关系数据
 * @param {File} file - CSV文件对象
 * @param {Object} nodeIdMapping - 节点ID映射
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<Object>} 导入结果
 */
export const importRelationships = (file, nodeIdMapping, onProgress) => {
  return new Promise((resolve, reject) => {
    const results = {
      totalRelationships: 0,
      importedCount: 0,
      errorCount: 0,
      errors: []
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parseResults) => {
        try {
          const { data } = parseResults
          results.totalRelationships = data.length

          // 创建所有关系
          for (let i = 0; i < data.length; i++) {
            const edgeData = data[i]
            
            try {
              // 检查源节点和目标节点是否存在
              const sourceId = nodeIdMapping[edgeData.Source]
              const targetId = nodeIdMapping[edgeData.Target]

              if (!sourceId) {
                throw new Error(`源节点 ${edgeData.Source} 不存在`)
              }

              if (!targetId) {
                throw new Error(`目标节点 ${edgeData.Target} 不存在`)
              }

              // 准备关系属性
              const properties = {
                Id: edgeData.Id || `${edgeData.Source}_${edgeData.Target}`,
                Label: edgeData.Label || '',
                highwayType: edgeData.highwayType || ''
              }

              // 添加其他可能的属性
              Object.keys(edgeData).forEach(key => {
                if (!['Source', 'Target', 'Type', 'Id', 'Label', 'highwayType'].includes(key) && edgeData[key]) {
                  properties[key] = edgeData[key]
                }
              })

              // 创建关系
              const relType = edgeData.Type || 'CONNECTS'
              const response = await createRelationship(sourceId, targetId, relType, properties)
              
              if (response && response.id) {
                results.importedCount++
              } else {
                throw new Error('创建关系失败')
              }
            } catch (error) {
              results.errorCount++
              results.errors.push({
                edgeData,
                error: error.message || '未知错误'
              })
            }

            // 更新进度
            if (onProgress && typeof onProgress === 'function') {
              onProgress({
                current: i + 1,
                total: data.length,
                complete: i + 1 >= data.length
              })
            }
          }

          resolve(results)
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 导入图数据（节点和关系）
 * @param {File} nodesFile - 节点CSV文件
 * @param {File} relationshipsFile - 关系CSV文件
 * @param {Object} options - 选项
 * @returns {Promise<Object>} 导入结果
 */
export const importGraphData = async (nodesFile, relationshipsFile, options = {}) => {
  const result = {
    success: false,
    nodesResult: null,
    relationshipsResult: null,
    error: null
  }

  try {
    // 导入节点
    const nodesResult = await importNodes(nodesFile, (progress) => {
      if (options.onNodesProgress) {
        options.onNodesProgress(progress)
      }
    })
    
    result.nodesResult = nodesResult
    
    // 导入关系
    const relationshipsResult = await importRelationships(
      relationshipsFile, 
      nodesResult.nodeIdMapping,
      (progress) => {
        if (options.onRelationshipsProgress) {
          options.onRelationshipsProgress(progress)
        }
      }
    )
    
    result.relationshipsResult = relationshipsResult
    result.success = true
  } catch (error) {
    result.success = false
    result.error = error.message || '导入过程中发生未知错误'
  }
  
  return result
} 