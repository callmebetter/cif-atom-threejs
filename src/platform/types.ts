// Import database types
import { ProjectRecord, AnalysisRecord, SettingsRecord, DatabaseStats } from '../types/electron';

// API response wrapper types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProjectResponse extends ApiResponse<ProjectRecord> {
  project?: ProjectRecord;
}

export interface ProjectsResponse extends ApiResponse<ProjectRecord[]> {
  projects?: ProjectRecord[];
}

export interface AnalysisResponse extends ApiResponse<AnalysisRecord> {
  analysis?: AnalysisRecord;
}

export interface AnalysesResponse extends ApiResponse<AnalysisRecord[]> {
  records?: AnalysisRecord[];
}

export interface SettingResponse extends ApiResponse<SettingsRecord> {
  setting?: SettingsRecord;
}

export interface SettingsResponse extends ApiResponse<SettingsRecord[]> {
  settings?: SettingsRecord[];
}

export interface StatsResponse extends ApiResponse<DatabaseStats> {
  stats?: DatabaseStats;
}

export type ChannelMap = {
  // File operations
  'select-file': { req: unknown; res: ApiResponse<string[]> };
  'read-file': { req: string; res: ApiResponse<ArrayBuffer> };
  'save-file': { req: [string, ArrayBuffer]; res: ApiResponse<string> };
  'init-app-data': { req: void; res: ApiResponse<unknown> };
  'get-platform-info': { req: void; res: ApiResponse<unknown> };

  // Database operations - Projects
  'db:create-project': {
    req: Omit<ProjectRecord, 'id' | 'created_at' | 'updated_at'>;
    res: ProjectResponse
  };
  'db:get-project': { req: number; res: ProjectResponse };
  'db:get-all-projects': { req: void; res: ProjectsResponse };
  'db:update-project': { req: [number, Partial<ProjectRecord>]; res: ProjectResponse };
  'db:delete-project': { req: number; res: ApiResponse<void> };

  // Database operations - Analysis Records
  'db:create-analysis-record': {
    req: Omit<AnalysisRecord, 'id' | 'created_at' | 'completed_at'>;
    res: AnalysisResponse
  };
  'db:get-analysis-records': {
    req: [number | undefined, string | undefined];
    res: AnalysesResponse
  };
  'db:delete-analysis-record': { req: number; res: ApiResponse<void> };

  // Database operations - Settings
  'db:get-setting': { req: string; res: ApiResponse<string> };
  'db:set-setting': { req: [string, string]; res: SettingResponse };
  'db:get-all-settings': { req: void; res: SettingsResponse };

  // Database operations - Maintenance
  'db:get-stats': { req: void; res: StatsResponse };
  'db:backup': { req: string; res: ApiResponse<void> };
  'db:vacuum': { req: void; res: ApiResponse<void> };
};

export type Channel = keyof ChannelMap;

export interface IPlatformStrategy {
  invoke<C extends Channel>(
    channel: C,
    payload: ChannelMap[C]['req']
  ): Promise<ChannelMap[C]['res']>;
}