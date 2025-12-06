# Database Module

This directory contains the modularized database layer for the Image Mesh application.

## Architecture Overview

The database module follows a layered architecture with clear separation of concerns:

```
database/
├── types.ts              # TypeScript interfaces and types
├── schema.ts             # Database schema and table initialization
├── database-manager.ts   # Main DatabaseManager class
├── repositories/         # Data access layer
│   ├── BaseRepository.ts # Base repository with common functionality
│   ├── ProjectsRepository.ts
│   ├── AnalysisRepository.ts
│   ├── SettingsRepository.ts
│   ├── CifRepository.ts
│   └── index.ts
├── index.ts              # Main export file
└── README.md             # This file
```

## Key Components

### Types (`types.ts`)
Defines all TypeScript interfaces and types used throughout the database layer:
- `ProjectRecord` - Project entity interface
- `AnalysisRecord` - Analysis entity interface
- `SettingsRecord` - Settings entity interface
- `CifRecord` - CIF file record interface
- Supporting types like `DatabaseStats`, `AnalysisType`, `ParseStatus`

### Schema (`schema.ts`)
Handles database schema initialization and management:
- Table creation with proper SQL schemas
- Index creation for performance optimization
- Default settings insertion
- Migration-ready structure

### Repository Pattern
Each data entity has its own repository class that encapsulates all CRUD operations:

#### BaseRepository
Provides common functionality for all repositories:
- Database connection validation
- Common query building utilities
- Standardized error handling

#### Entity Repositories
- **ProjectsRepository**: Manages project records and operations
- **AnalysisRepository**: Handles analysis records and queries
- **SettingsRepository**: Manages application settings
- **CifRepository**: Handles CIF file records and parsing status

### DatabaseManager
The main orchestrator that:
- Manages database connection lifecycle
- Provides access to all repositories
- Maintains backward compatibility with existing code
- Handles database maintenance operations (backup, vacuum, stats)

## Usage Examples

### Using the DatabaseManager (recommended)
```typescript
import { getDatabaseManager } from './database'

const db = getDatabaseManager()
db.connect()

// Create a project
const projectId = db.createProject({
  name: 'My Project',
  description: 'A sample project',
  cif_file_path: '/path/to/file.cif'
})

// Get all projects
const projects = db.getAllProjects()

// Access specific repositories directly
const settings = await db.settings.getSetting('theme')
```

### Using Individual Repositories
```typescript
import { ProjectsRepository } from './database/repositories'
import { getDatabaseManager } from './database'

const db = getDatabaseManager()
db.connect()

const projectsRepo = new ProjectsRepository(db.db)
const projects = projectsRepo.getAllProjects()
```

### Transaction Support
```typescript
const db = getDatabaseManager()
db.transaction(() => {
  const projectId = db.createProject(projectData)
  db.createAnalysisRecord({
    project_id: projectId,
    analysis_type: 'cif',
    analysis_data: JSON.stringify(data)
  })
  // All operations will be rolled back if any fails
})
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each repository handles one specific entity type
2. **Maintainability**: Easy to find and modify specific functionality
3. **Testability**: Individual repositories can be unit tested in isolation
4. **Extensibility**: Easy to add new entities or modify existing ones
5. **Backward Compatibility**: Existing code continues to work without changes
6. **Type Safety**: Strong TypeScript typing throughout the layer
7. **Performance**: Proper indexing and optimized queries

## Migration from Legacy Database

The new modular structure maintains full backward compatibility. Existing code using:

```typescript
import { getDatabaseManager } from './database'
const db = getDatabaseManager()
db.createProject(...)
```

Will continue to work exactly as before, while also providing access to the new modular features.

## Best Practices

1. **Use Repository Pattern**: Prefer using specific repositories when working with a single entity type
2. **Transactions**: Use database transactions for multi-step operations
3. **Error Handling**: Always wrap database operations in try-catch blocks
4. **Connection Management**: Ensure database is connected before operations
5. **Type Safety**: Use TypeScript interfaces for all data operations

## File Structure Details

### `types.ts`
- Contains all TypeScript interfaces
- Export types for use in other parts of the application
- Defines database record shapes and validation types

### `schema.ts`
- Static class `DatabaseSchema` with initialization methods
- Handles table creation, indexes, and default data
- Easy to modify schema without affecting business logic

### `database-manager.ts`
- Main `DatabaseManager` class
- Singleton pattern for database connection
- Repository instances as properties
- Backward compatibility methods

### `repositories/`
- Clean separation of data access logic
- Each repository extends `BaseRepository`
- Specific CRUD operations for each entity
- Easy to add new query methods as needed

This modular architecture provides a solid foundation for database operations while maintaining flexibility for future enhancements.