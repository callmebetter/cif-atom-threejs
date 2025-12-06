// Re-export types for backward compatibility
export type {
  ProjectRecord,
  AnalysisRecord,
  SettingsRecord,
  CifRecord,
  DatabaseStats,
  AnalysisType,
  ParseStatus,
  CreateProjectData,
  CreateAnalysisData,
  CreateCifData
} from './types'

// Re-export repositories
export {
  BaseRepository,
  ProjectsRepository,
  AnalysisRepository,
  SettingsRepository,
  CifRepository
} from './repositories'

// Export schema and database manager
export { DatabaseSchema, DEFAULT_SETTINGS } from './schema'
export { DatabaseManager, getDatabaseManager } from './database-manager'
import { DatabaseManager } from './database-manager'
export default DatabaseManager