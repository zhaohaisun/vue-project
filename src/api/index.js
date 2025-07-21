import axios from 'axios'

const API_URL = 'http://localhost:7474'

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true
})

// 请求拦截器，添加认证信息
apiClient.interceptors.request.use(
  config => {
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // 清除本地存储的认证信息
      localStorage.removeItem('token')
      
      // 重定向到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 用户相关API
export const userApi = {
  // 登录
  login(data) {
    return apiClient.post('/user/login', data)
  },
  
  // 注册
  register(data) {
    return apiClient.post('/user/register', data)
  },
  
  // 登出
  logout() {
    return apiClient.post('/user/logout')
  },
  
  // 修改密码
  changePassword(username, data) {
    return apiClient.post(`/user/${username}/password`, data)
  },
  
  // 获取用户列表
  getUserList() {
    return apiClient.get('/user/list')
  },
  
  // 获取用户日志
  getUserLogs() {
    return apiClient.get('/user/logs')
  },
  
  // 获取用户状态
  getUserStatus(username) {
    return apiClient.get(`/user/${username}/status`)
  }
}

// 节点相关API
export const nodeApi = {
  // 创建节点
  createNode(properties) {
    // 如果提供了properties参数，则发送该数据创建带属性的节点
    // 否则创建空节点
    return apiClient.post('/db/data/node', properties)
  },
  
  // 获取节点总数
  getNodesCount() {
    return apiClient.get('/db/data/nodes/count')
  },
  
  // 获取所有节点
  getAllNodes() {
    return apiClient.get('/db/data/nodes')
  },
  
  // 获取分页节点数据
  getNodesPaginated(page = 1, size = 50) {
    return apiClient.get(`/db/data/nodes/paginated?page=${page}&size=${size}`)
  },
  
  // 获取节点
  getNode(id) {
    return apiClient.get(`/db/data/node/${id}`)
  },
  
  // 获取节点标签
  getNodeLabels(id) {
    return apiClient.get(`/db/data/node/${id}/labels`)
  },
  
  // 添加节点标签
  addNodeLabels(id, labels) {
    return apiClient.post(`/db/data/node/${id}/labels`, labels)
  },
  
  // 替换节点标签
  replaceNodeLabels(id, labels) {
    return apiClient.put(`/db/data/node/${id}/labels`, labels)
  },
  
  // 删除节点标签
  deleteNodeLabel(id, label) {
    return apiClient.delete(`/db/data/node/${id}/labels/${label}`)
  },
  
  // 获取节点属性
  getNodeProperties(id) {
    return apiClient.get(`/db/data/node/${id}/properties`)
  },
  
  // 更新节点属性
  updateNodeProperties(id, properties) {
    return apiClient.put(`/db/data/node/${id}/properties`, properties)
  },
  
  // 获取单个属性
  getNodeProperty(id, key) {
    return apiClient.get(`/db/data/node/${id}/properties/${key}`)
  },
  
  // 设置单个属性
  setNodeProperty(id, key, value) {
    return apiClient.put(`/db/data/node/${id}/properties/${key}`, value)
  },
  
  // 删除单个属性
  deleteNodeProperty(id, key) {
    return apiClient.delete(`/db/data/node/${id}/properties/${key}`)
  },
  
  // 删除所有属性
  deleteAllNodeProperties(id) {
    return apiClient.delete(`/db/data/node/${id}/properties`)
  },
  
  // 获取节点度数
  getNodeDegree(id) {
    return apiClient.get(`/db/data/node/${id}/degree/all`)
  },
  
  // 删除节点
  deleteNode(id) {
    return apiClient.delete(`/db/data/node/${id}`)
  },
  
  // 获取带特定标签的节点
  getNodesByLabel(label) {
    return apiClient.get(`/db/data/label/${label}/nodes`)
  },
  
  // 获取时态属性
  getTemporalProperty(id, key, time) {
    return apiClient.get(`/db/data/node/${id}/temporal/${key}/${time}`)
  },
  
  // 设置时态属性
  setTemporalProperty(id, key, time, value) {
    return apiClient.put(`/db/data/node/${id}/temporal/${key}/${time}`, value)
  },
  
  // 设置时态属性范围
  setTemporalPropertyRange(id, key, startTime, endTime, value) {
    return apiClient.put(`/db/data/node/${id}/temporal/${key}/${startTime}/${endTime}`, value)
  },
  
  // 删除时态属性
  deleteTemporalProperty(id, key) {
    return apiClient.delete(`/db/data/node/${id}/temporal/${key}`)
  }
}

// 关系相关API
export const relationshipApi = {
  // 创建关系
  createRelationship(sourceNodeId, targetNodeId, type, properties) {
    // 构建符合API要求的请求数据
    const relationshipData = {
      to: `${API_URL}/db/data/node/${targetNodeId}`,
      type: type
    }
    
    // 如果提供了属性，则添加到请求数据中
    if (properties) {
      relationshipData.data = properties
    }
    
    // 发送请求创建关系
    return apiClient.post(`/db/data/node/${sourceNodeId}/relationships`, relationshipData)
  },
  
  // 获取关系总数
  getRelationshipsCount() {
    return apiClient.get('/db/data/relationships/count')
  },
  
  // 获取分页关系数据
  getRelationshipsPaginated(page = 1, size = 50) {
    return apiClient.get(`/db/data/relationships/paginated?page=${page}&size=${size}`)
  },
  
  // 获取关系
  getRelationship(id) {
    return apiClient.get(`/db/data/relationship/${id}`)
  },
  
  // 删除关系
  deleteRelationship(id) {
    return apiClient.delete(`/db/data/relationship/${id}`)
  },
  
  // 获取关系属性
  getRelationshipProperties(id) {
    return apiClient.get(`/db/data/relationship/${id}/properties`)
  },
  
  // 设置关系属性
  setRelationshipProperties(id, properties) {
    return apiClient.put(`/db/data/relationship/${id}/properties`, properties)
  },
  
  // 获取单个关系属性
  getRelationshipProperty(id, key) {
    return apiClient.get(`/db/data/relationship/${id}/properties/${key}`)
  },
  
  // 设置单个关系属性
  setRelationshipProperty(id, key, value) {
    return apiClient.put(`/db/data/relationship/${id}/properties/${key}`, value)
  },
  
  // 删除单个关系属性
  deleteRelationshipProperty(id, key) {
    return apiClient.delete(`/db/data/relationship/${id}/properties/${key}`)
  },
  
  // 删除所有关系属性
  deleteAllRelationshipProperties(id) {
    return apiClient.delete(`/db/data/relationship/${id}/properties`)
  },
  
  // 获取所有关系
  getAllRelationships(nodeId) {
    return apiClient.get(`/db/data/node/${nodeId}/relationships/all`)
  },
  
  // 获取传入关系
  getIncomingRelationships(nodeId) {
    return apiClient.get(`/db/data/node/${nodeId}/relationships/in`)
  },
  
  // 获取传出关系
  getOutgoingRelationships(nodeId) {
    return apiClient.get(`/db/data/node/${nodeId}/relationships/out`)
  },
  
  // 获取指定类型的关系
  getRelationshipsByType(nodeId, type) {
    return apiClient.get(`/db/data/node/${nodeId}/relationships/all/${type}`)
  },
  
  // 获取关系类型
  getRelationshipTypes() {
    return apiClient.get('/db/data/relationship/types')
  },
  
  // 获取时态属性
  getTemporalProperty(id, key, time) {
    return apiClient.get(`/db/data/relationship/${id}/temporal/${key}/${time}`)
  },
  
  // 设置时态属性
  setTemporalProperty(id, key, time, value) {
    return apiClient.put(`/db/data/relationship/${id}/temporal/${key}/${time}`, value)
  },
  
  // 设置时态属性范围
  setTemporalPropertyRange(id, key, startTime, endTime, value) {
    return apiClient.put(`/db/data/relationship/${id}/temporal/${key}/${startTime}/${endTime}`, value)
  },
  
  // 删除时态属性
  deleteTemporalProperty(id, key) {
    return apiClient.delete(`/db/data/relationship/${id}/temporal/${key}`)
  }
}

// 标签相关API
export const labelApi = {
  // 获取所有标签
  getAllLabels() {
    return apiClient.get('/db/data/labels')
  }
}

// 数据库管理API
export const databaseApi = {
  // 获取用户的数据库列表
  getUserDatabases() {
    return apiClient.get('/db/data/databases')
  },
  
  // 创建数据库
  createDatabase(dbName) {
    return apiClient.post(`/db/data/database/${dbName}/create`)
  },
  
  // 启动数据库
  startDatabase(dbName) {
    return apiClient.post(`/db/data/database/${dbName}/start`)
  },
  
  // 关闭数据库
  stopDatabase() {
    return apiClient.post('/db/data/database')
  },
  
  // 备份数据库
  backupDatabase(dbName) {
    return apiClient.post(`/db/data/database/${dbName}/backup`)
  },
  
  // 获取数据库备份列表
  getBackupList() {
    return apiClient.get('/db/data/database/backup')
  },
  
  // 恢复数据库备份
  restoreDatabase(backupFileName) {
    return apiClient.post(`/db/data/database/${backupFileName}/restore`)
  },
  
  // 获取数据库状态
  getDatabaseStatus(dbName) {
    return apiClient.get(`/db/data/database/${dbName}/status`)
  },
  
  // 获取数据库空间大小
  getDatabaseSpace(dbName) {
    return apiClient.get(`/databases/${dbName}/space`)
  },
  
  // 获取数据库路径
  getDatabasePath(dbName) {
    return apiClient.get(`/db/data/database/${dbName}/path`)
  },
  
  // 删除数据库
  deleteDatabase(dbName) {
    return apiClient.delete(`/db/data/database/${dbName}`)
  }
}

// 系统信息API
export const systemApi = {
  // 获取系统资源信息（CPU和内存使用情况）
  getSystemResources() {
    return apiClient.get('/system/resources')
  },
  
  // 获取线程信息
  getSystemThreads() {
    return apiClient.get('/system/threads')
  },
  
  // 获取数据库空间使用情况
  getDatabaseSpace(dbName) {
    return apiClient.get(`/databases/${dbName}/space`)
  }
}

// 属性相关API
export const propertyApi = {
  // 获取所有属性键
  getAllPropertyKeys() {
    return apiClient.get('/db/data/propertykeys')
  }
} 