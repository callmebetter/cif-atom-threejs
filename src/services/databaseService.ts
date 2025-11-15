import { ProjectRecord, AnalysisRecord, SettingsRecord, DatabaseStats } from '../types/electron'

class DatabaseService {
  // Project operations
  async createProject(projectData: {
    name: string
    description?: string
    cif_file_path: string
    tif_file_path?: string
  }): Promise<ProjectRecord> {
    // Validate input
    if (!projectData.name || projectData.name.trim() === '') {
      throw new Error('项目名称不能为空')
    }
    if (!projectData.cif_file_path || projectData.cif_file_path.trim() === '') {
      throw new Error('CIF文件路径不能为空')
    }
    
    try {
      const result = await window.electronAPI.database.createProject(projectData)
      if (!result.success || !result.project) {
        const errorMessage = result.error || '创建项目失败'
        console.error('Create project failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.project
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目时发生未知错误'
      console.error('Create project error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async getProject(id: number): Promise<ProjectRecord | null> {
    // Validate input
    if (!id || id <= 0) {
      throw new Error('无效的项目ID')
    }
    
    try {
      const result = await window.electronAPI.database.getProject(id)
      if (!result.success) {
        const errorMessage = result.error || '获取项目失败'
        console.error(`Get project ${id} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
      return result.project || null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取项目时发生未知错误'
      console.error(`Get project ${id} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  async getAllProjects(): Promise<ProjectRecord[]> {
    try {
      const result = await window.electronAPI.database.getAllProjects()
      if (!result.success) {
        const errorMessage = result.error || '获取项目列表失败'
        console.error('Get all projects failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.projects || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取项目列表时发生未知错误'
      console.error('Get all projects error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async updateProject(id: number, updates: Partial<ProjectRecord>): Promise<ProjectRecord> {
    // Validate input
    if (!id || id <= 0) {
      throw new Error('无效的项目ID')
    }
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('更新数据不能为空')
    }
    
    try {
      const result = await window.electronAPI.database.updateProject(id, updates)
      if (!result.success || !result.project) {
        const errorMessage = result.error || '更新项目失败'
        console.error(`Update project ${id} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
      return result.project
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目时发生未知错误'
      console.error(`Update project ${id} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  async deleteProject(id: number): Promise<void> {
    // Validate input
    if (!id || id <= 0) {
      throw new Error('无效的项目ID')
    }
    
    try {
      const result = await window.electronAPI.database.deleteProject(id)
      if (!result.success) {
        const errorMessage = result.error || '删除项目失败'
        console.error(`Delete project ${id} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除项目时发生未知错误'
      console.error(`Delete project ${id} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Analysis record operations
  async createAnalysisRecord(analysisData: {
    project_id: number
    analysis_type: string
    parameters: string
    result_path?: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    error_message?: string
  }): Promise<AnalysisRecord> {
    // Validate input
    if (!analysisData.project_id || analysisData.project_id <= 0) {
      throw new Error('无效的项目ID')
    }
    if (!analysisData.analysis_type || analysisData.analysis_type.trim() === '') {
      throw new Error('分析类型不能为空')
    }
    if (!analysisData.status || !['pending', 'running', 'completed', 'failed'].includes(analysisData.status)) {
      throw new Error('无效的分析状态')
    }
    
    try {
      const result = await window.electronAPI.database.createAnalysisRecord(analysisData)
      if (!result.success || !result.analysis) {
        const errorMessage = result.error || '创建分析记录失败'
        console.error('Create analysis record failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.analysis
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建分析记录时发生未知错误'
      console.error('Create analysis record error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async getAnalysisRecords(projectId?: number, analysisType?: string): Promise<AnalysisRecord[]> {
    // Validate input
    if (projectId && projectId <= 0) {
      throw new Error('无效的项目ID')
    }
    
    try {
      const result = await window.electronAPI.database.getAnalysisRecords(projectId, analysisType)
      if (!result.success) {
        const errorMessage = result.error || '获取分析记录失败'
        console.error('Get analysis records failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.records || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取分析记录时发生未知错误'
      console.error('Get analysis records error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async deleteAnalysisRecord(id: number): Promise<void> {
    // Validate input
    if (!id || id <= 0) {
      throw new Error('无效的分析记录ID')
    }
    
    try {
      const result = await window.electronAPI.database.deleteAnalysisRecord(id)
      if (!result.success) {
        const errorMessage = result.error || '删除分析记录失败'
        console.error(`Delete analysis record ${id} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除分析记录时发生未知错误'
      console.error(`Delete analysis record ${id} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Settings operations
  async getSetting(key: string): Promise<string | null> {
    // Validate input
    if (!key || key.trim() === '') {
      throw new Error('设置键不能为空')
    }
    
    try {
      const result = await window.electronAPI.database.getSetting(key)
      if (!result.success) {
        const errorMessage = result.error || '获取设置失败'
        console.error(`Get setting ${key} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
      return result.value || null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取设置时发生未知错误'
      console.error(`Get setting ${key} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  async setSetting(key: string, value: string): Promise<void> {
    // Validate input
    if (!key || key.trim() === '') {
      throw new Error('设置键不能为空')
    }
    if (value === undefined || value === null) {
      throw new Error('设置值不能为空')
    }
    
    try {
      const result = await window.electronAPI.database.setSetting(key, value)
      if (!result.success) {
        const errorMessage = result.error || '保存设置失败'
        console.error(`Set setting ${key} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存设置时发生未知错误'
      console.error(`Set setting ${key} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  async getAllSettings(): Promise<SettingsRecord[]> {
    try {
      const result = await window.electronAPI.database.getAllSettings()
      if (!result.success) {
        const errorMessage = result.error || '获取所有设置失败'
        console.error('Get all settings failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.settings || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取所有设置时发生未知错误'
      console.error('Get all settings error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Database maintenance
  async getStats(): Promise<DatabaseStats> {
    try {
      const result = await window.electronAPI.database.getStats()
      if (!result.success || !result.stats) {
        const errorMessage = result.error || '获取数据库统计信息失败'
        console.error('Get database stats failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.stats
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取数据库统计信息时发生未知错误'
      console.error('Get database stats error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async backup(backupPath: string): Promise<void> {
    // Validate input
    if (!backupPath || backupPath.trim() === '') {
      throw new Error('备份路径不能为空')
    }
    
    try {
      const result = await window.electronAPI.database.backup(backupPath)
      if (!result.success) {
        const errorMessage = result.error || '备份数据库失败'
        console.error('Backup database failed:', errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '备份数据库时发生未知错误'
      console.error('Backup database error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async vacuum(): Promise<void> {
    try {
      const result = await window.electronAPI.database.vacuum()
      if (!result.success) {
        const errorMessage = result.error || '优化数据库失败'
        console.error('Vacuum database failed:', errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '优化数据库时发生未知错误'
      console.error('Vacuum database error:', errorMessage)
      throw new Error(errorMessage)
    }
  }
}

export const databaseService = new DatabaseService()
export default databaseService