import { getStrategy } from './strategy';
import { Channel, ChannelMap } from './types';

export const safeInvoke = async <C extends Channel>(
  channel: C,
  payload: ChannelMap[C]['req']
): Promise<ChannelMap[C]['res']> => {
  try {
    return await getStrategy().invoke(channel, payload);
  } catch (error) {
    console.error(`Error invoking channel ${channel}:`, error);
    throw error;
  }
};

// Convenience methods for common operations
export const fileOperations = {
  selectFile: (options: any) => safeInvoke('select-file', options),
  readFile: (filePath: string) => safeInvoke('read-file', filePath),
  saveFile: (fileName: string, data: any) => safeInvoke('save-file', [fileName, data]),
  initAppData: () => safeInvoke('init-app-data', void 0),
  getPlatformInfo: () => safeInvoke('get-platform-info', void 0),
};

export const databaseOperations = {
  // Project operations
  createProject: (project: any) => safeInvoke('db:create-project', project),
  getProject: (id: number) => safeInvoke('db:get-project', id),
  getAllProjects: () => safeInvoke('db:get-all-projects', void 0),
  updateProject: (id: number, updates: any) => safeInvoke('db:update-project', [id, updates]),
  deleteProject: (id: number) => safeInvoke('db:delete-project', id),
  
  // Analysis record operations
  createAnalysisRecord: (analysis: any) => safeInvoke('db:create-analysis-record', analysis),
  getAnalysisRecords: (projectId?: number, analysisType?: string) => 
    safeInvoke('db:get-analysis-records', [projectId, analysisType]),
  deleteAnalysisRecord: (id: number) => safeInvoke('db:delete-analysis-record', id),
  
  // Settings operations
  getSetting: (key: string) => safeInvoke('db:get-setting', key),
  setSetting: (key: string, value: string) => safeInvoke('db:set-setting', [key, value]),
  getAllSettings: () => safeInvoke('db:get-all-settings', void 0),
  
  // Database maintenance
  getStats: () => safeInvoke('db:get-stats', void 0),
  backup: (backupPath: string) => safeInvoke('db:backup', backupPath),
  vacuum: () => safeInvoke('db:vacuum', void 0),
};