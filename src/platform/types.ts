// Import database types
import {
  ProjectRecord,
  AnalysisRecord,
  SettingsRecord,
  DatabaseStats,
} from "../types/electron";

// Core response wrapper - matches actual IPC handler responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  // Dynamic properties based on operation type
}

// Utility types for different response patterns
export type SuccessResponse<T> = ApiResponse<T> & T;
export type CreateResponse = ApiResponse & {
  projectId?: number;
  recordId?: number;
};
export type BooleanResponse = ApiResponse<boolean>;

// Dialog options for file selection
export interface FileDialogOptions {
  properties?: string[];
  filters?: Array<{ name: string; extensions: string[] }>;
}

// App data paths
export interface AppDataPaths {
  appData: string;
  uploads: string;
  processed: string;
  database: string;
}

// Platform info
export interface PlatformInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
}

// Define CIF record type (replace 'any')
export interface CifRecord {
  id: number;
  filename: string;
  content?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// Generic database operation patterns
type CreateOperation<T, K extends string = "projectId"> = {
  req: Omit<T, "id" | "created_at" | "updated_at">;
  res: CreateResponse;
};

type ReadOperation<T> = {
  req: number;
  res: SuccessResponse<{ [P in keyof T as P extends "id" ? never : P]: T[P] }>;
};

type ReadAllOperation<T> = {
  req: void;
  res: SuccessResponse<{ [K in keyof T]: T[K] }[]>;
};

type UpdateOperation<T> = {
  req: [number, Partial<T>];
  res: ApiResponse<boolean>;
};

type DeleteOperation = {
  req: number;
  res: ApiResponse<boolean>;
};

// Optimized ChannelMap matching actual IPC handler implementations
export type ChannelMap = {
  // File operations
  "select-file": {
    req: FileDialogOptions;
    res: ApiResponse & { files?: string[] };
  };
  "read-file": {
    req: string;
    res: SuccessResponse<{ data: ArrayBuffer }>;
  };
  "save-file": {
    req: [fileName: string, data: ArrayBuffer];
    res: SuccessResponse<{ filePath: string }>;
  };
  "init-app-data": {
    req: void;
    res: SuccessResponse<AppDataPaths>;
  };
  "get-platform-info": {
    req: void;
    res: PlatformInfo; // Direct response, no wrapper needed
  };

  // Database operations - Projects
  "db:create-project": CreateOperation<ProjectRecord, "projectId">;
  "db:get-project": ReadOperation<ProjectRecord>;
  "db:get-all-projects": ReadAllOperation<ProjectRecord>;
  "db:update-project": UpdateOperation<ProjectRecord>;
  "db:delete-project": DeleteOperation;

  // Database operations - Analysis Records
  "db:create-analysis-record": CreateOperation<AnalysisRecord, "recordId">;
  "db:get-analysis-records": {
    req: [projectId: number, analysisType?: number];
    res: SuccessResponse<{ records: AnalysisRecord[] }>;
  };
  "db:delete-analysis-record": DeleteOperation;

  // Database operations - Settings
  "db:get-setting": {
    req: string;
    res: SuccessResponse<{ value: string }>;
  };
  "db:set-setting": {
    req: [key: string, value: string];
    res: ApiResponse;
  };
  "db:get-all-settings": ReadAllOperation<SettingsRecord>;

  // Database operations - Maintenance
  "db:get-stats": {
    req: void;
    res: SuccessResponse<{ stats: DatabaseStats }>;
  };
  "db:backup": {
    req: string;
    res: ApiResponse;
  };
  "db:vacuum": {
    req: void;
    res: ApiResponse;
  };
  "db:get-database-path": {
    req: void;
    res: SuccessResponse<{ data: string }>;
  };
  "db:open-database-dir": {
    req: void;
    res: ApiResponse;
  };

  // CIF record operations - properly typed
  "db:create-cif-record": {
    req: Partial<CifRecord>;
    res: CreateResponse;
  };
  "db:get-cif-record": {
    req: number;
    res: SuccessResponse<{ cifRecord: CifRecord }>;
  };
  "db:get-cif-records": {
    req: void;
    res: SuccessResponse<{ cifRecords: CifRecord[] }>;
  };
  "db:update-cif-record": {
    req: [number, Partial<CifRecord>];
    res: ApiResponse<boolean>;
  };
  "db:delete-cif-record": {
    req: number;
    res: ApiResponse<boolean>;
  };
};

export type Channel = keyof ChannelMap;

export interface IPlatformStrategy {
  invoke<C extends Channel>(
    channel: C,
    payload: ChannelMap[C]["req"],
  ): Promise<ChannelMap[C]["res"]>;
}

// Helper type for inferring response data
export type ResponseData<C extends Channel> =
  Extract<ChannelMap[C], { res: any }>["res"] extends ApiResponse<infer T>
    ? T
    : ChannelMap[C]["res"];
