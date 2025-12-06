// Backward compatibility layer - re-export everything from the new modular structure
export {
  // Types
  ProjectRecord,
  AnalysisRecord,
  SettingsRecord,
  CifRecord,
  DatabaseStats,
  AnalysisType,
  ParseStatus,
  CreateProjectData,
  CreateAnalysisData,
  CreateCifData,

  // Repository classes
  BaseRepository,
  ProjectsRepository,
  AnalysisRepository,
  SettingsRepository,
  CifRepository,

  // Schema
  DatabaseSchema,
  DEFAULT_SETTINGS,

  // Main database manager
  DatabaseManager,
  getDatabaseManager
} from './database/index'

// Default export for backward compatibility
export { default } from './database/index'