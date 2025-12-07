import { ProjectRecord, AnalysisRecord, SettingsRecord, DatabaseStats } from '../types/electron'
import { databaseOperations } from '../platform/sdk'

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
      const result = await databaseOperations.createProject(projectData)
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
      const result = await databaseOperations.getProject(id)
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
      const result = await databaseOperations.getAllProjects()
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
      const result = await databaseOperations.updateProject(id, updates)
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
      const result = await databaseOperations.deleteProject(id)
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
      const result = await databaseOperations.createAnalysisRecord(analysisData)
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
      const result = await databaseOperations.getAnalysisRecords(projectId, analysisType)
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
      const result = await databaseOperations.deleteAnalysisRecord(id)
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
      const result = await databaseOperations.getSetting(key)
      if (!result.success) {
        const errorMessage = result.error || '获取设置失败'
        console.error(`Get setting ${key} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
      return result.data || null
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
      const result = await databaseOperations.setSetting(key, value)
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
      const result = await databaseOperations.getAllSettings()
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
      const result = await databaseOperations.getStats()
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
      const result = await databaseOperations.backup(backupPath)
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
      const result = await databaseOperations.vacuum()
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

  // CIF record operations
  async createCifRecord(recordData: {
    file_name: string;
    file_path: string;
    parsed_atoms: string;
    parsed_lattice: string;
    space_group?: string;
    parse_status: 'success' | 'failed' | 'partial';
    parse_error?: string;
  }): Promise<number> {
    // Validate input
    if (!recordData.file_name || recordData.file_name.trim() === '') {
      throw new Error('文件名不能为空')
    }
    if (!recordData.file_path || recordData.file_path.trim() === '') {
      throw new Error('文件路径不能为空')
    }
    if (!recordData.parsed_atoms) {
      throw new Error('解析后的原子数据不能为空')
    }
    if (!recordData.parsed_lattice) {
      throw new Error('解析后的晶胞参数不能为空')
    }
    if (!recordData.parse_status || !['success', 'failed', 'partial'].includes(recordData.parse_status)) {
      throw new Error('无效的解析状态')
    }
    
    try {
      const result = await databaseOperations.createCifRecord(recordData)
      if (!result.success) {
        const errorMessage = result.error || '创建CIF记录失败'
        console.error('Create CIF record failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.recordId as number
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建CIF记录时发生未知错误'
      console.error('Create CIF record error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async getCifRecord(id: number): Promise<any | null> {
    // Validate input
    if (!id || id <= 0) {
      throw new Error('无效的CIF记录ID')
    }
    
    try {
      const result = await databaseOperations.getCifRecord(id)
      if (!result.success) {
        const errorMessage = result.error || '获取CIF记录失败'
        console.error(`Get CIF record ${id} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
      return result.cifRecord || null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取CIF记录时发生未知错误'
      console.error(`Get CIF record ${id} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  async getCifRecords(): Promise<any[]> {
    try {
      const result = await databaseOperations.getCifRecords()
      if (!result.success) {
        const errorMessage = result.error || '获取CIF记录列表失败'
        console.error('Get CIF records failed:', errorMessage)
        throw new Error(errorMessage)
      }
      return result.cifRecords || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取CIF记录列表时发生未知错误'
      console.error('Get CIF records error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  async updateCifRecord(id: number, updates: Partial<{
    file_name?: string;
    file_path?: string;
    parsed_atoms?: string;
    parsed_lattice?: string;
    space_group?: string;
    parse_status?: 'success' | 'failed' | 'partial';
    parse_error?: string;
  }>): Promise<void> {
    // Validate input
    if (!id || id <= 0) {
      throw new Error('无效的CIF记录ID')
    }
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('更新数据不能为空')
    }
    
    try {
      const result = await databaseOperations.updateCifRecord(id, updates)
      if (!result.success) {
        const errorMessage = result.error || '更新CIF记录失败'
        console.error(`Update CIF record ${id} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新CIF记录时发生未知错误'
      console.error(`Update CIF record ${id} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }

  async deleteCifRecord(id: number): Promise<void> {
    // Validate input
    if (!id || id <= 0) {
      throw new Error('无效的CIF记录ID')
    }
    
    try {
      const result = await databaseOperations.deleteCifRecord(id)
      if (!result.success) {
        const errorMessage = result.error || '删除CIF记录失败'
        console.error(`Delete CIF record ${id} failed:`, errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除CIF记录时发生未知错误'
      console.error(`Delete CIF record ${id} error:`, errorMessage)
      throw new Error(errorMessage)
    }
  }
}

export const databaseService = new DatabaseService()
export default databaseService