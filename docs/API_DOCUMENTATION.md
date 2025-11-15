# Image-Mesh API 文档

## 概述

Image-Mesh 提供了一套完整的 API 用于晶体结构数据的解析、可视化和管理。本文档详细描述了所有可用的 API 接口、数据类型和使用方法。

## 目录
1. [IPC 通信 API](#ipc-通信-api)
2. [CIF 解析 API](#cif-解析-api)
3. [可视化 API](#可视化-api)
4. [数据库 API](#数据库-api)
5. [文件操作 API](#文件操作-api)
6. [类型定义](#类型定义)
7. [错误处理](#错误处理)
8. [使用示例](#使用示例)

## IPC 通信 API

### 文件操作 API

#### `window.electronAPI.file.read(filePath: string): Promise<string>`

读取文件内容

**参数:**
- `filePath`: 文件路径

**返回值:**
- `Promise<string>`: 文件内容

**示例:**
```typescript
try {
  const content = await window.electronAPI.file.read('/path/to/file.cif')
  console.log(content)
} catch (error) {
  console.error('读取文件失败:', error)
}
```

#### `window.electronAPI.file.write(filePath: string, content: string): Promise<boolean>`

写入文件内容

**参数:**
- `filePath`: 文件路径
- `content`: 文件内容

**返回值:**
- `Promise<boolean>`: 写入是否成功

**示例:**
```typescript
const success = await window.electronAPI.file.write('/path/to/file.txt', 'Hello World')
if (success) {
  console.log('文件写入成功')
}
```

#### `window.electronAPI.file.exists(filePath: string): Promise<boolean>`

检查文件是否存在

**参数:**
- `filePath`: 文件路径

**返回值:**
- `Promise<boolean>`: 文件是否存在

#### `window.electronAPI.file.getFileInfo(filePath: string): Promise<FileInfo>`

获取文件信息

**参数:**
- `filePath`: 文件路径

**返回值:**
- `Promise<FileInfo>`: 文件信息对象

### 对话框 API

#### `window.electronAPI.dialog.showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult>`

显示文件选择对话框

**参数:**
```typescript
interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: FileFilter[]
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'>
}
```

**返回值:**
```typescript
interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}
```

**示例:**
```typescript
const result = await window.electronAPI.dialog.showOpenDialog({
  title: '选择 CIF 文件',
  filters: [
    { name: 'CIF Files', extensions: ['cif'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  properties: ['openFile']
})

if (!result.canceled && result.filePaths.length > 0) {
  const filePath = result.filePaths[0]
  console.log('选择的文件:', filePath)
}
```

#### `window.electronAPI.dialog.showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult>`

显示文件保存对话框

**参数:**
```typescript
interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: FileFilter[]
}
```

**返回值:**
```typescript
interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}
```

### 数据库 API

#### 项目管理

##### `window.electronAPI.database.createProject(project: ProjectData): Promise<DatabaseResult<Project>>`

创建新项目

**参数:**
```typescript
interface ProjectData {
  name: string
  description?: string
  filePath?: string
  createdAt?: Date
  updatedAt?: Date
}
```

**返回值:**
```typescript
interface DatabaseResult<T> {
  success: boolean
  data?: T
  error?: string
}
```

**示例:**
```typescript
const result = await window.electronAPI.database.createProject({
  name: '我的晶体结构项目',
  description: '这是一个测试项目'
})

if (result.success && result.data) {
  console.log('项目创建成功，ID:', result.data.id)
} else {
  console.error('创建项目失败:', result.error)
}
```

##### `window.electronAPI.database.getProject(id: number): Promise<DatabaseResult<Project>>`

获取项目信息

**参数:**
- `id`: 项目 ID

##### `window.electronAPI.database.getAllProjects(): Promise<DatabaseResult<Project[]>>`

获取所有项目

##### `window.electronAPI.database.updateProject(id: number, updates: Partial<Project>): Promise<DatabaseResult<boolean>>`

更新项目信息

##### `window.electronAPI.database.deleteProject(id: number): Promise<DatabaseResult<boolean>>`

删除项目

#### 分析记录管理

##### `window.electronAPI.database.createAnalysisRecord(record: AnalysisData): Promise<DatabaseResult<AnalysisRecord>>`

创建分析记录

**参数:**
```typescript
interface AnalysisData {
  projectId: number
  type: string
  parameters: Record<string, any>
  results: Record<string, any>
  createdAt?: Date
}
```

##### `window.electronAPI.database.getAnalysisRecords(projectId?: number): Promise<DatabaseResult<AnalysisRecord[]>>`

获取分析记录

##### `window.electronAPI.database.deleteAnalysisRecord(id: number): Promise<DatabaseResult<boolean>>`

删除分析记录

## CIF 解析 API

### CifParser 类

#### `new CifParser()`

创建 CIF 解析器实例

#### `parse(content: string): CifData`

解析 CIF 内容

**参数:**
- `content`: CIF 文件内容

**返回值:**
- `CifData`: 解析后的晶体结构数据

**示例:**
```typescript
import { CifParser } from '@/utils/cifParser'

const parser = new CifParser()
const cifContent = `
data_test
_cell_length_a 5.43
_cell_length_b 5.43
_cell_length_c 5.43
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
_symmetry_space_group_name_H-M 'P 1'
_loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Si1 Si 0.0 0.0 0.0
Si2 Si 0.5 0.5 0.5
`

try {
  const cifData = parser.parse(cifContent)
  console.log('晶胞参数:', cifData.cell)
  console.log('原子数量:', cifData.atoms.length)
} catch (error) {
  console.error('CIF 解析失败:', error)
}
```

#### `validateCifFile(content: string): boolean`

验证 CIF 文件格式

**参数:**
- `content`: CIF 文件内容

**返回值:**
- `boolean`: 是否为有效的 CIF 文件

#### `extractValue(content: string, key: string): string | null`

从 CIF 内容中提取特定键的值

**参数:**
- `content`: CIF 文件内容
- `key`: 要提取的键名

**返回值:**
- `string | null`: 提取的值，如果未找到则返回 null

#### `parseAtomData(content: string): Atom[]`

解析原子数据

**参数:**
- `content`: CIF 文件内容

**返回值:**
- `Atom[]`: 原子数据数组

#### `calculateCellVolume(params: CellParameters): number`

计算晶胞体积

**参数:**
- `params`: 晶胞参数

**返回值:**
- `number`: 晶胞体积

## 可视化 API

### StructureVisualizer 类

#### `constructor(container: HTMLElement)`

创建结构可视化器实例

**参数:**
- `container`: 容器元素

**示例:**
```typescript
import { StructureVisualizer } from '@/utils/structureVisualizer'

const container = document.getElementById('visualization-container')
const visualizer = new StructureVisualizer(container)
```

#### `loadStructure(cifData: CifData, options?: VisualizationOptions): void`

加载晶体结构

**参数:**
- `cifData`: CIF 数据
- `options`: 可视化选项（可选）

**示例:**
```typescript
const options: VisualizationOptions = {
  atomSize: 0.5,
  bondRadius: 0.1,
  showAtoms: true,
  showBonds: true,
  showLabels: false,
  backgroundColor: '#ffffff',
  lightIntensity: 1.0
}

visualizer.loadStructure(cifData, options)
```

#### `updateOptions(options: Partial<VisualizationOptions>): void`

更新可视化选项

**参数:**
- `options`: 要更新的选项

#### `fitCameraToStructure(): void`

调整相机以适应结构大小

#### `resetView(): void`

重置视图

#### `exportImage(format: 'png' | 'jpg', quality?: number): string`

导出图像

**参数:**
- `format`: 图像格式
- `quality`: 图像质量（0-1，仅对 JPG 有效）

**返回值:**
- `string`: 图像的 Data URL

**示例:**
```typescript
const imageData = visualizer.exportImage('png', 0.9)
const link = document.createElement('a')
link.href = imageData
link.download = 'structure.png'
link.click()
```

#### `dispose(): void`

销毁可视化器，释放资源

## 数据库 API

### DatabaseService 类

#### 项目管理方法

##### `createProject(project: ProjectData): Promise<number>`

创建项目，返回项目 ID

##### `getProject(id: number): Promise<Project | null>`

获取单个项目

##### `getAllProjects(): Promise<Project[]>`

获取所有项目

##### `updateProject(id: number, updates: Partial<Project>): Promise<boolean>`

更新项目

##### `deleteProject(id: number): Promise<boolean>`

删除项目

#### 分析记录方法

##### `createAnalysisRecord(record: AnalysisData): Promise<number>`

创建分析记录

##### `getAnalysisRecords(projectId?: number): Promise<AnalysisRecord[]>`

获取分析记录

##### `deleteAnalysisRecord(id: number): Promise<boolean>`

删除分析记录

## 文件操作 API

### FileService 类

#### `readFile(filePath: string): Promise<string>`

读取文件内容

#### `writeFile(filePath: string, content: string): Promise<boolean>`

写入文件内容

#### `fileExists(filePath: string): Promise<boolean>`

检查文件是否存在

#### `getFileInfo(filePath: string): Promise<FileInfo>`

获取文件信息

#### `selectFile(filters?: FileFilter[]): Promise<string | null>`

选择文件

#### `selectDirectory(): Promise<string | null>`

选择目录

#### `saveFile(defaultPath?: string, filters?: FileFilter[]): Promise<string | null>`

保存文件

## 类型定义

### CIF 相关类型

#### `CifData`
```typescript
interface CifData {
  header?: string
  cell?: CellParameters
  symmetry?: SymmetryInfo
  atoms: Atom[]
  metadata?: Record<string, any>
  warnings?: string[]
}
```

#### `CellParameters`
```typescript
interface CellParameters {
  a: number
  b: number
  c: number
  alpha: number
  beta: number
  gamma: number
  volume?: number
}
```

#### `SymmetryInfo`
```typescript
interface SymmetryInfo {
  spaceGroup?: string
  spaceGroupNumber?: number
  pointGroup?: string
  crystalSystem?: string
}
```

#### `Atom`
```typescript
interface Atom {
  label: string
  element: string
  x: number
  y: number
  z: number
  occupancy?: number
  temperatureFactor?: number
  charge?: number
}
```

### 可视化相关类型

#### `VisualizationOptions`
```typescript
interface VisualizationOptions {
  atomSize: number
  bondRadius: number
  showAtoms: boolean
  showBonds: boolean
  showLabels: boolean
  atomColors: Record<string, string>
  backgroundColor: string
  lightIntensity: number
  cameraPosition?: [number, number, number]
  cameraTarget?: [number, number, number]
}
```

#### `AtomColor`
```typescript
interface AtomColor {
  element: string
  color: string
  radius: number
}
```

### 数据库相关类型

#### `Project`
```typescript
interface Project {
  id: number
  name: string
  description?: string
  filePath?: string
  createdAt: Date
  updatedAt: Date
}
```

#### `AnalysisRecord`
```typescript
interface AnalysisRecord {
  id: number
  projectId: number
  type: string
  parameters: Record<string, any>
  results: Record<string, any>
  createdAt: Date
}
```

### 文件相关类型

#### `FileInfo`
```typescript
interface FileInfo {
  path: string
  name: string
  extension: string
  size: number
  createdAt: Date
  modifiedAt: Date
  isDirectory: boolean
}
```

#### `FileFilter`
```typescript
interface FileFilter {
  name: string
  extensions: string[]
}
```

### 通用类型

#### `DatabaseResult`
```typescript
interface DatabaseResult<T> {
  success: boolean
  data?: T
  error?: string
}
```

#### `ApiResponse`
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

## 错误处理

### 错误类型

#### `AppError`
```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

#### 常见错误代码

| 错误代码 | 描述 |
|---------|------|
| `INVALID_CIF_FORMAT` | 无效的 CIF 文件格式 |
| `MISSING_REQUIRED_DATA` | 缺少必需的数据 |
| `FILE_NOT_FOUND` | 文件未找到 |
| `DATABASE_ERROR` | 数据库操作错误 |
| `VISUALIZATION_ERROR` | 可视化错误 |
| `INVALID_PARAMETERS` | 无效的参数 |

### 错误处理示例

```typescript
import { AppError, handleError } from '@/utils/errorHandler'

try {
  const result = await someApiCall()
  console.log(result)
} catch (error) {
  const appError = handleError(error)
  
  switch (appError.code) {
    case 'INVALID_CIF_FORMAT':
      ElMessage.error('CIF 文件格式无效')
      break
    case 'FILE_NOT_FOUND':
      ElMessage.error('文件未找到')
      break
    default:
      ElMessage.error(`操作失败: ${appError.message}`)
  }
  
  console.error('详细错误信息:', appError)
}
```

## 使用示例

### 完整的文件加载和可视化流程

```typescript
import { CifParser } from '@/utils/cifParser'
import { StructureVisualizer } from '@/utils/structureVisualizer'

async function loadAndVisualizeCifFile(filePath: string) {
  try {
    // 1. 选择文件
    const result = await window.electronAPI.dialog.showOpenDialog({
      title: '选择 CIF 文件',
      filters: [
        { name: 'CIF Files', extensions: ['cif'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return
    }

    const selectedFilePath = result.filePaths[0]

    // 2. 读取文件内容
    const content = await window.electronAPI.file.read(selectedFilePath)

    // 3. 解析 CIF 数据
    const parser = new CifParser()
    const cifData = parser.parse(content)

    // 4. 创建可视化器
    const container = document.getElementById('visualization-container')
    if (!container) {
      throw new Error('可视化容器未找到')
    }

    const visualizer = new StructureVisualizer(container)

    // 5. 加载结构
    const options = {
      atomSize: 0.5,
      bondRadius: 0.1,
      showAtoms: true,
      showBonds: true,
      showLabels: true,
      backgroundColor: '#f0f0f0'
    }

    visualizer.loadStructure(cifData, options)

    // 6. 创建项目记录
    const projectData = {
      name: cifData.header || '未命名项目',
      description: `从文件 ${selectedFilePath} 加载`,
      filePath: selectedFilePath
    }

    const projectResult = await window.electronAPI.database.createProject(projectData)
    
    if (projectResult.success && projectResult.data) {
      console.log('项目创建成功，ID:', projectResult.data.id)
    }

    // 7. 创建分析记录
    const analysisData = {
      projectId: projectResult.data!.id,
      type: 'structure_visualization',
      parameters: {
        atomCount: cifData.atoms.length,
        cellVolume: cifData.cell?.volume,
        spaceGroup: cifData.symmetry?.spaceGroup
      },
      results: {
        visualizationComplete: true,
        timestamp: new Date().toISOString()
      }
    }

    await window.electronAPI.database.createAnalysisRecord(analysisData)

    ElMessage.success('文件加载和可视化完成')

  } catch (error) {
    const appError = handleError(error)
    ElMessage.error(`操作失败: ${appError.message}`)
    console.error('详细错误:', appError)
  }
}
```

### 批量处理多个文件

```typescript
async function batchProcessCifFiles() {
  try {
    // 选择多个文件
    const result = await window.electronAPI.dialog.showOpenDialog({
      title: '选择 CIF 文件（可多选）',
      filters: [
        { name: 'CIF Files', extensions: ['cif'] }
      ],
      properties: ['openFile', 'multiSelections']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return
    }

    const parser = new CifParser()
    const results = []

    for (const filePath of result.filePaths) {
      try {
        // 读取文件
        const content = await window.electronAPI.file.read(filePath)
        
        // 解析 CIF
        const cifData = parser.parse(content)
        
        // 创建项目
        const projectData = {
          name: cifData.header || `项目_${Date.now()}`,
          description: `批量处理: ${filePath}`,
          filePath
        }

        const projectResult = await window.electronAPI.database.createProject(projectData)
        
        if (projectResult.success && projectResult.data) {
          results.push({
            filePath,
            projectId: projectResult.data.id,
            atomCount: cifData.atoms.length,
            success: true
          })
        }

      } catch (error) {
        results.push({
          filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    // 显示处理结果
    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    ElMessage.success(`批量处理完成: ${successCount} 成功, ${failCount} 失败`)

    return results

  } catch (error) {
    const appError = handleError(error)
    ElMessage.error(`批量处理失败: ${appError.message}`)
  }
}
```

---

**版本**: 1.0.0  
**最后更新**: 2024年  
**维护者**: Image-Mesh 开发团队