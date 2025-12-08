# Image-Mesh 开发者文档

## 目录
1. [项目架构](#项目架构)
2. [开发环境设置](#开发环境设置)
3. [代码结构](#代码结构)
4. [API 参考](#api-参考)
5. [开发指南](#开发指南)
6. [测试指南](#测试指南)
7. [调试指南](#调试指南)
8. [部署指南](#部署指南)

## 项目架构

### 整体架构
```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │   Database      │  │   File System  │  │   IPC        ││
│  │   Service       │  │   Manager       │  │   Handler    ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
                              │
                              │ IPC Communication
                              │
┌─────────────────────────────────────────────────────────┐
│                  Electron Renderer Process             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │   Vue 3 App     │  │   Three.js      │  │   State      ││
│  │   (Frontend)     │  │   Visualization │  │   Management ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 技术栈

#### 前端 (Renderer Process)
- **Vue 3**: 响应式 UI 框架，Composition API
- **TypeScript**: 类型安全的 JavaScript 超集
- **Vite**: 快速的构建工具和开发服务器
- **Three.js**: 3D 图形渲染库
- **Element Plus**: Vue 3 UI 组件库
- **Pinia**: 轻量级状态管理
- **Vue Router**: 官方路由管理器

#### 后端 (Main Process)
- **Electron**: 跨平台桌面应用框架
- **SQLite**: 轻量级关系型数据库
- **better-sqlite3**: 高性能 SQLite Node.js 驱动
- **Node.js**: JavaScript 运行时

#### 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Electron Builder**: 应用打包和分发
- **Jest**: 单元测试框架
- **TypeScript**: 静态类型检查

## 开发环境设置

### 前置要求
- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0 或 **yarn**: >= 1.22.0
- **Git**: 版本控制
- **VS Code**: 推荐的开发环境

### 环境配置

#### 1. 克隆项目
```bash
git clone <repository-url>
cd image-mesh
```

#### 2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

#### 3. 开发环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
# .env 文件内容示例:
NODE_ENV=development
VITE_APP_TITLE=Image-Mesh Dev
VITE_API_BASE_URL=http://localhost:5173
```

#### 4. 启动开发服务器
```bash
# 启动标准开发服务器
npm run dev

# 或启动带源映射的调试服务器
npm run dev:debug
```

### VS Code 配置

#### 推荐扩展
```json
{
  "recommendations": [
    "vue.volar",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json"
  ]
}
```

#### 工作区设置
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.codeActions.enabled": true
}
```

## 代码结构

### 目录结构详解

```
src/
├── backend/                    # Electron 主进程代码
│   ├── database/               # 数据库相关
│   │   ├── migrations/         # 数据库迁移文件
│   │   └── models/            # 数据模型定义
│   ├── services/              # 后端服务
│   │   ├── databaseService.ts # 数据库服务
│   │   ├── fileService.ts     # 文件操作服务
│   │   └── ipcService.ts      # IPC 通信服务
│   ├── utils/                 # 后端工具函数
│   └── main.ts               # Electron 主进程入口
├── components/               # Vue 组件
│   ├── common/               # 通用组件
│   ├── forms/                # 表单组件
│   └── visualizers/          # 可视化组件
├── router/                   # Vue Router 配置
│   └── index.ts             # 路由定义
├── services/                 # 前端服务层
│   ├── api.ts               # API 客户端
│   ├── databaseService.ts    # 数据库服务客户端
│   └── fileService.ts       # 文件服务客户端
├── stores/                   # Pinia 状态管理
│   ├── app.ts               # 应用全局状态
│   ├── project.ts           # 项目状态管理
│   └── visualization.ts     # 可视化状态管理
├── types/                    # TypeScript 类型定义
│   ├── api.ts               # API 类型
│   ├── database.ts          # 数据库类型
│   └── cif.ts               # CIF 相关类型
├── utils/                    # 工具函数
│   ├── cifParser.ts         # CIF 解析器
│   ├── structureVisualizer.ts # 3D 可视化工具
│   ├── constants.ts         # 常量定义
│   └── helpers.ts           # 辅助函数
├── views/                    # 页面组件
│   ├── FileUpload.vue        # 文件上传页面
│   ├── StructureVisualization.vue # 结构可视化页面
│   └── ProjectManagement.vue # 项目管理页面
├── App.vue                   # 根组件
└── main.ts                   # Vue 应用入口
```

### 本地存储目录结构

**应用本地数据目录结构**：

```
your-app-appdata/          # 应用本地数据目录（根据操作系统自动定位）
├── data/                  # 核心数据存储
│   ├── uploads/           # 原始上传文件（CIF/TIF/ZIP）
│   │   ├── sample.cif     # 用户上传的原始 CIF 文件
│   │   └── sample_20240601_1200.cif # 重复上传的同名文件（带时间戳）
│   ├── processed/         # 处理后的中间文件（如 8-bit TIF、3D 模型缓存）
│   │   └── processed_8bit.tif
│   └── crystal_data.db    # SQLite 数据库（存储解析结果与文件路径关联）
└── logs/                  # 日志文件
    └── python_calls.log   # Python 调用日志
```

**文件命名规则**：保留原始文件名（如 `sample.cif`），若重复上传同名文件，则追加时间戳（如 `sample_20240601_1200.cif`）。

**关键操作**：
- **保存原始 CIF 文件**：用户上传的 CIF 文件首先被复制到 `uploads/` 目录
- **处理后的文件**：解析或处理后的文件存储到 `processed/` 目录
- **关联数据库记录**：解析完成后，将文件的本地路径与解析数据一起存入数据库

### 核心模块说明

#### CIF 解析器 (cifParser.ts)
```typescript
export class CifParser {
  parse(content: string): CifData
  validateCifFile(content: string): boolean
  extractValue(content: string, key: string): string | null
  parseAtomData(content: string): Atom[]
  calculateCellVolume(params: CellParameters): number
}
```

#### 结构可视化器 (structureVisualizer.ts)
```typescript
export class StructureVisualizer {
  constructor(container: HTMLElement)
  loadStructure(cifData: CifData, options?: VisualizationOptions): void
  updateOptions(options: Partial<VisualizationOptions>): void
  exportImage(format: 'png' | 'jpg', quality?: number): string
  dispose(): void
}
```

#### 数据库服务 (databaseService.ts)
```typescript
export class DatabaseService {
  createProject(project: ProjectData): Promise<number>
  getProject(id: number): Promise<Project | null>
  updateProject(id: number, updates: Partial<Project>): Promise<boolean>
  deleteProject(id: number): Promise<boolean>
  
  // CIF 相关操作
  createCifRecord(record: CifRecordData): Promise<number>
  getCifRecord(id: number): Promise<CifRecord | null>
  getCifRecords(projectId?: number): Promise<CifRecord[]>
  deleteCifRecord(id: number): Promise<boolean>
  // ... 其他数据库操作方法
}
```

#### 数据库表结构

**核心表结构**：

| 表名 | 字段 | 类型 | 描述 | 约束 |  
|------|------|------|------|------|  
| `cif_records` | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | 记录唯一标识 | NOT NULL |  
|  | `file_name` | TEXT | 原始 CIF 文件名（如 `sample.cif`） | NOT NULL |  
|  | `file_path` | TEXT | CIF 原始文件在应用本地目录的存储路径（如 `/data/uploads/sample.cif`） | NOT NULL |  
|  | `parsed_atoms` | TEXT | 解析后的原子数据（JSON 格式，包含元素、坐标等） | NOT NULL |  
|  | `parsed_lattice` | TEXT | 解析后的晶胞参数（JSON 格式，包含 a/b/c/α/β/γ） | NOT NULL |  
|  | `space_group` | TEXT | 空间群（可能为 NULL，若 CIF 未定义） | - |  
|  | `parse_status` | TEXT | 解析状态（`success`/`failed`/`partial`） | NOT NULL |  
|  | `parse_error` | TEXT | 解析失败时的错误信息（如字段缺失、格式错误） | - |  
|  | `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | 记录创建时间 | - |  
|  | `project_id` | INTEGER | 关联的项目 ID（外键） | - |

### CIF 数据工作流

#### 端到端处理流程

1. **文件上传**：用户通过界面上传 CIF 文件
2. **文件保存**：文件被复制到应用本地 `uploads/` 目录，避免直接操作原始文件
3. **CIF 解析**：使用 `CifParser` 解析文件内容，提取原子坐标、晶胞参数和空间群等信息
4. **数据序列化**：将解析后的结构化数据转换为 JSON 格式
5. **数据库存储**：将解析结果和文件信息存入 `cif_records` 表
6. **关联管理**：建立数据库记录与本地文件路径的关联

#### 代码示例：CIF 数据保存流程

```typescript
// 前端或主进程（解析完成后调用）
async function saveCifDataToDb(parsedData: ParsedCifData, originalFilePath: string) {
  const db = await openSqliteDb(); // 打开本地 SQLite 数据库
  const fileName = path.basename(originalFilePath);
  const targetPath = path.join(appDataDir, 'uploads', fileName); // 复制文件到本地目录

  // 1. 将原始 CIF 文件复制到本地 uploads 目录
  fs.copyFileSync(originalFilePath, targetPath);

  // 2. 构造 JSON 格式的原子与晶胞数据
  const parsedAtomsJson = JSON.stringify(parsedData.atoms);
  const parsedLatticeJson = JSON.stringify(parsedData.latticeParams);

  // 3. 插入数据库记录
  const query = `
    INSERT INTO cif_records 
    (file_name, file_path, parsed_atoms, parsed_lattice, space_group, parse_status) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await db.run(query, [
    fileName,
    targetPath,
    parsedAtomsJson,
    parsedLatticeJson,
    parsedData.spaceGroup || null,
    'success' // 假设解析成功
  ]);
}

// 示例：调用保存函数（在 CIF 解析完成后）
const parsedCifData = await parseCifWithSdk(cifFile); // 前端 SDK 解析
await saveCifDataToDb(parsedCifData, cifFile.path); // 存储到本地目录与数据库
```

#### 关键设计要点

- **数据完整性**：确保文件复制和数据库插入操作要么全部成功，要么全部失败（原子操作）
- **文件安全**：从不直接修改用户上传的原始文件，始终操作副本
- **可追溯性**：通过 `file_path` 字段可以快速定位原始文件
- **查询效率**：使用 JSON 格式存储结构化数据，平衡查询效率与开发便利性
- **状态管理**：通过 `parse_status` 字段区分成功/失败记录，支持后续统计或错误排查

## API 参考

### IPC 通信 API

#### 文件操作
```typescript
// 读取文件
window.electronAPI.file.read(filePath: string): Promise<string>

// 写入文件
window.electronAPI.file.write(filePath: string, content: string): Promise<boolean>

// 选择文件
window.electronAPI.dialog.showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult>

// 选择目录
window.electronAPI.dialog.showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult>
```

#### 数据库操作
```typescript
// 项目操作
window.electronAPI.database.createProject(project: ProjectData): Promise<DatabaseResult<Project>>
window.electronAPI.database.getProject(id: number): Promise<DatabaseResult<Project>>
window.electronAPI.database.getAllProjects(): Promise<DatabaseResult<Project[]>>

// 分析记录操作
window.electronAPI.database.createAnalysisRecord(record: AnalysisData): Promise<DatabaseResult<AnalysisRecord>>
window.electronAPI.database.getAnalysisRecords(projectId?: number): Promise<DatabaseResult<AnalysisRecord[]>>
```

## IPC 通信设置指南

### 概述
IPC (进程间通信) 用于 Electron 主进程和渲染进程之间的通信。本项目采用结构化方法，通过 SDK 层来处理 IPC 通信，确保一致性和可维护性。

### 添加新 IPC 通道的步骤

#### 1. 更新平台类型定义
在 `src/platform/types.ts` 中的 `ChannelMap` 接口添加新通道：

```typescript
export type ChannelMap = {
  // 现有通道...
  'new-channel': {
    req: RequestType;  // 请求参数类型
    res: ResponseType;  // 响应类型
  };
};
```

#### 2. 添加到 SDK 操作
在 `src/platform/sdk.ts` 中的相应操作对象添加新方法：

```typescript
export const newOperations = {
  newMethod: (params: RequestType) => safeInvoke('new-channel', params),
};
```

#### 3. 实现 IPC 处理器
在 `electron/ipc-handlers.ts` 中添加 IPC 处理器：

```typescript
ipcMain.handle('new-channel', async (_, params) => {
  try {
    // 实现业务逻辑
    const result = await someOperation(params);
    return { success: true, data: result };  // 注意使用 data 属性
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
```

#### 4. 更新预加载脚本（如有需要）
如果通道需要直接暴露（不通过 SDK），更新 `electron/preload.ts`：

```typescript
const electronAPI = {
  // 现有方法...
  newMethod: (params) => ipcRenderer.invoke('new-channel', params),
};
```

#### 5. 在组件中使用
在 Vue 组件中导入并使用 SDK 方法：

```typescript
import { newOperations } from '@/platform/sdk';

// 在组件逻辑中使用
const result = await newOperations.newMethod(params);
if (result.success) {
  // 处理成功结果
  console.log(result.data);
} else {
  // 处理错误
  console.error(result.error);
}
```

### 最佳实践

1. **始终使用 SDK 层**：避免直接调用 `window.electronAPI`，通过 SDK 层调用确保一致性和错误处理
2. **统一响应格式**：所有 IPC 响应必须遵循 `{ success: boolean, data?: T, error?: string }` 格式
3. **类型安全**：为所有 IPC 通信使用正确的 TypeScript 类型
4. **错误处理**：在 IPC 处理器中捕获并返回错误，在组件中处理错误
5. **重启开发服务器**：修改 IPC 处理器后，需要重启开发服务器才能生效
6. **命名规范**：
   - 通道名称使用 `kebab-case` 格式（如 `db:get-database-path`）
   - SDK 方法使用 `camelCase` 格式（如 `getDatabasePath`）

### 示例：添加数据库路径获取功能

以下是实现 `getDatabasePath` 功能的完整示例：

1. **更新类型定义** (`src/platform/types.ts`)
```typescript
export type ChannelMap = {
  // ... 现有通道
  'db:get-database-path': { req: void; res: ApiResponse<string> };
};
```

2. **添加 SDK 方法** (`src/platform/sdk.ts`)
```typescript
export const databaseOperations = {
  // ... 现有方法
  getDatabasePath: () => safeInvoke('db:get-database-path', void 0),
};
```

3. **实现 IPC 处理器** (`electron/ipc-handlers.ts`)
```typescript
ipcMain.handle('db:get-database-path', async () => {
  try {
    const dbPath = db.getDatabasePath();
    return { success: true, data: dbPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
```

4. **在组件中使用**
```typescript
import { databaseOperations } from '@/platform/sdk';

const initData = async () => {
  const dbPathResult = await databaseOperations.getDatabasePath();
  if (dbPathResult.success && dbPathResult.data) {
    databasePath.value = dbPathResult.data;
  }
};
```

### 现有 SDK 操作

#### 文件操作 (`fileOperations`)
- `selectFile(options: unknown)`: 选择文件
- `readFile(filePath: string)`: 读取文件
- `saveFile(fileName: string, data: ArrayBuffer)`: 保存文件
- `initAppData()`: 初始化应用数据目录
- `getPlatformInfo()`: 获取平台信息

#### 数据库操作 (`databaseOperations`)
- **项目操作**: `createProject`, `getProject`, `getAllProjects`, `updateProject`, `deleteProject`
- **分析记录操作**: `createAnalysisRecord`, `getAnalysisRecords`, `deleteAnalysisRecord`
- **设置操作**: `getSetting`, `setSetting`, `getAllSettings`
- **数据库维护**: `getStats`, `getDatabasePath`, `backup`, `vacuum`

### 类型定义

#### CIF 数据类型
```typescript
interface CifData {
  header?: string
  cell?: CellParameters
  symmetry?: SymmetryInfo
  atoms: Atom[]
  metadata?: Record<string, any>
  warnings?: string[]
}

interface Atom {
  label: string
  element: string
  x: number
  y: number
  z: number
  occupancy?: number
  temperatureFactor?: number
}

interface CellParameters {
  a: number
  b: number
  c: number
  alpha: number
  beta: number
  gamma: number
}
```

#### 可视化类型
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
}
```

## 开发指南

### 添加新功能

#### 1. 创建新的 Vue 组件
```typescript
// src/components/NewFeature.vue
<template>
  <div class="new-feature">
    <!-- 组件模板 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 组件逻辑
const props = defineProps<{
  // 属性定义
}>()

const emit = defineEmits<{
  // 事件定义
}>()
</script>

<style scoped>
.new-feature {
  /* 组件样式 */
}
</style>
```

#### 2. 添加路由
```typescript
// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import NewFeature from '@/views/NewFeature.vue'

const routes = [
  // 现有路由...
  {
    path: '/new-feature',
    name: 'NewFeature',
    component: NewFeature,
    meta: {
      title: '新功能'
    }
  }
]
```

#### 3. 创建 Pinia Store
```typescript
// src/stores/newFeature.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useNewFeatureStore = defineStore('newFeature', () => {
  // State
  const data = ref([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const processedData = computed(() => {
    return data.value.map(item => {
      // 数据处理逻辑
      return processedItem
    })
  })

  // Actions
  async function fetchData() {
    loading.value = true
    error.value = null
    
    try {
      const result = await api.fetchData()
      data.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    processedData,
    fetchData
  }
})
```

### 代码规范

#### TypeScript 规范
```typescript
// 使用接口定义类型
interface User {
  id: number
  name: string
  email: string
  createdAt: Date
}

// 使用泛型提高代码复用性
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// 使用枚举定义常量
enum FileType {
  CIF = 'cif',
  TIFF = 'tiff',
  PNG = 'png'
}
```

#### Vue 3 Composition API 规范
```typescript
// 使用 setup 语法糖
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Ref } from 'vue'

// Props 定义
interface Props {
  title: string
  items: string[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

// Emits 定义
interface Emits {
  update: [value: string]
  delete: [id: number]
}

const emit = defineEmits<Emits>()

// 响应式数据
const count = ref(0)
const selectedItem = ref<string | null>(null)

// 计算属性
const isValid = computed(() => {
  return props.items.length > 0 && count.value > 0
})

// 监听器
watch(() => props.items, (newItems) => {
  console.log('Items changed:', newItems)
}, { deep: true })

// 生命周期
onMounted(() => {
  console.log('Component mounted')
})

// 方法
function handleItemClick(item: string) {
  selectedItem.value = item
  emit('update', item)
}
</script>
```

### 错误处理

#### 统一错误处理
```typescript
// src/utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', error.stack)
  }
  
  return new AppError('Unknown error occurred', 'UNKNOWN_ERROR', error)
}

// 在组件中使用
try {
  await riskyOperation()
} catch (error) {
  const appError = handleError(error)
  console.error(appError)
  ElMessage.error(appError.message)
}
```

## 测试指南

### 单元测试

#### 组件测试
```typescript
// tests/components/MyComponent.spec.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: {
        title: 'Test Title'
      }
    })
    
    expect(wrapper.text()).toContain('Test Title')
  })

  it('emits event on button click', async () => {
    const wrapper = mount(MyComponent)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted()).toHaveProperty('click')
  })
})
```

#### 工具函数测试
```typescript
// tests/utils/cifParser.spec.ts
import { describe, it, expect } from 'vitest'
import { CifParser } from '@/utils/cifParser'

describe('CifParser', () => {
  it('parses valid CIF content', () => {
    const parser = new CifParser()
    const content = `
data_test
_cell_length_a 5.43
_cell_length_b 5.43
_cell_length_c 5.43
`
    
    const result = parser.parse(content)
    
    expect(result.cell?.a).toBe(5.43)
    expect(result.cell?.b).toBe(5.43)
    expect(result.cell?.c).toBe(5.43)
  })

  it('throws error for invalid content', () => {
    const parser = new CifParser()
    const invalidContent = 'invalid content'
    
    expect(() => parser.parse(invalidContent)).toThrow()
  })
})
```

### E2E 测试

#### 使用 Playwright
```typescript
// tests/e2e/file-upload.spec.ts
import { test, expect } from '@playwright/test'

test('file upload workflow', async ({ page }) => {
  await page.goto('/')
  
  // 导航到文件上传页面
  await page.click('[data-testid="file-upload-tab"]')
  
  // 上传文件
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('tests/fixtures/sample.cif')
  
  // 验证文件已上传
  await expect(page.locator('[data-testid="file-list"]')).toContainText('sample.cif')
  
  // 验证解析状态
  await expect(page.locator('[data-testid="parse-status"]')).toHaveText('解析成功')
})
```

### 测试配置

#### Vitest 配置
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

## 调试指南

### 源映射配置

为了更好地调试应用程序中的错误，我们已经启用了源映射功能。这允许您在浏览器开发者工具中看到原始的 TypeScript 和 Vue 代码，而不是编译后的 JavaScript。

#### 开发模式下的源映射

在开发过程中，以下配置已经启用以提供完整的源映射支持：

1. **Vite 配置** (`vite.config.ts`):
   ```typescript
   export default defineConfig({
     build: {
       sourcemap: true,
       // ...
     },
     esbuild: {
       sourcemap: true,
     },
     server: {
       sourcemapIgnoreList: false,
       // ...
     }
   })
   ```

2. **Electron-Vite 配置** (`electron.vite.config.ts`):
   ```typescript
   export default defineConfig({
     main: {
       build: {
         sourcemap: true,
         // ...
       }
     },
     preload: {
       build: {
         sourcemap: true,
         // ...
       }
     },
     renderer: {
       build: {
         sourcemap: true,
         // ...
       },
       server: {
         sourcemapIgnoreList: false,
         // ...
       },
       esbuild: {
         sourcemap: true,
       }
     }
   })
   ```

### 调试命令

我们提供了几种不同的调试方式来帮助您诊断和解决问题：

1. **标准开发模式**:
   ```bash
   npm run dev
   ```
   这是正常的开发模式，带有基本的源映射支持。

2. **增强调试模式**:
   ```bash
   npm run dev:debug
   ```
   此模式启用了额外的调试选项，包括：
   - Node.js 源映射支持
   - Electron 日志记录
   - 详细的堆栈跟踪

3. **Vue 错误扫描**:
   ```bash
   npm run debug:vue
   ```
   此工具专门扫描潜在的 Vue 错误，例如 "Cannot read properties of null" 错误，并提供修复建议。

### 调试 "Cannot read properties of null" 错误

这类错误通常发生在试图访问未定义或为空的对象属性时。以下是一些常见的解决方案：

1. **使用可选链操作符**:
   ```javascript
   // 错误的做法
   const value = object.property.subProperty
   
   // 正确的做法
   const value = object?.property?.subProperty
   ```

2. **检查元素存在性**:
   ```javascript
   // 错误的做法
   document.getElementById("myId").innerHTML = "text"
   
   // 正确的做法
   const el = document.getElementById("myId")
   if (el) el.innerHTML = "text"
   ```

3. **正确使用模板引用**:
   ```javascript
   // 错误的做法
   this.$refs.myComponent.method()
   
   // 正确的做法
   this.$refs.myComponent?.method()
   ```

### 使用浏览器开发者工具

1. **打开开发者工具**:
   - 在 Electron 应用中按 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (Mac)
   - 或通过菜单: View → Toggle Developer Tools

2. **查看源代码**:
   - 转到 "Sources" 标签页
   - 在左侧文件树中找到您的源文件（现在应该能看到 .vue 和 .ts 文件）
   - 设置断点并逐步执行代码

3. **检查控制台错误**:
   - 转到 "Console" 标签页
   - 查看详细的错误消息和堆栈跟踪
   - 点击堆栈跟踪中的文件链接可以直接跳转到对应源代码位置

### 性能监控

我们还提供了性能监控脚本，可以帮助识别性能瓶颈：

```bash
npm run dev:analyze-deep
```

此命令将启动深度性能分析，提供有关构建过程和运行时性能的详细报告。

## Python 集成

### 概述

本项目集成了 Python 脚本用于处理复杂的晶体学计算和图像处理任务。为确保 Python 调用的稳定性和健壮性，实现了环境检测、失败重试、超时控制等机制。

### Python 环境检测

在调用 Python 脚本之前，应用会检查 Python 环境是否可用：

```typescript
// 主进程（main.ts）：检查 Python 是否可用
function checkPythonEnvironment(): { hasPython: boolean; version?: string } {
  try {
    const { execSync } = require('child_process');
    const versionOutput = execSync('python --version').toString(); // 或 'python3 --version'
    const versionMatch = versionOutput.match(/Python (\d+\.\d+\.\d+)/);
    return { 
      hasPython: true, 
      version: versionMatch ? versionMatch[1] : 'unknown' 
    };
  } catch (error) {
    return { hasPython: false }; // Python 未安装或不在 PATH 中
  }
}

// 使用示例（应用启动时检查）
const pythonCheck = checkPythonEnvironment();
if (!pythonCheck.hasPython) {
  console.error('Python 环境未找到，请确保已安装 Python 3.8+ 并配置环境变量');
  // 可选：在前端提示用户“当前系统未检测到 Python，请联系管理员安装”
}
```

### Python 调用与失败重试逻辑

```typescript
// 主进程（main.ts）：调用 Python 脚本（带重试机制）
async function callPythonScriptWithRetry(
  scriptPath: string, 
  args: string[], 
  maxRetries: number = 3, 
  timeoutMs: number = 10000 // 单次调用超时 10 秒
): Promise<{ status: 'success' | 'error'; data?: any; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { spawn } = require('child_process');
      const pythonProcess = spawn('python', [scriptPath, ...args], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs // 设置超时
      });

      let resultData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => { resultData += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

      return new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const parsed = JSON.parse(resultData);
              resolve({ status: 'success', data: parsed });
            } catch (e) {
              resolve({ status: 'error', error: 'Python 输出不是有效的 JSON' });
            }
          } else {
            const errorMsg = errorData || `Python 进程退出码: ${code}`;
            lastError = errorMsg;
            if (attempt < maxRetries) {
              console.warn(`Python 调用失败（尝试 ${attempt}/${maxRetries}），重试中... 错误: ${errorMsg}`);
              setTimeout(() => {}, 1000 * attempt); // 指数退避（可选）
            } else {
              resolve({ status: 'error', error: `Python 调用最终失败: ${errorMsg}` });
            }
          }
        });

        pythonProcess.on('error', (err) => {
          lastError = `Python 进程启动错误: ${err.message}`;
          if (attempt < maxRetries) {
            console.warn(`Python 启动失败（尝试 ${attempt}/${maxRetries}），重试中... 错误: ${lastError}`);
            setTimeout(() => {}, 1000 * attempt);
          } else {
            resolve({ status: 'error', error: `Python 启动最终失败: ${lastError}` });
          }
        });
      });

    } catch (error) {
      lastError = `Python 调用异常: ${error instanceof Error ? error.message : String(error)}`;
      if (attempt < maxRetries) {
        console.warn(`Python 调用异常（尝试 ${attempt}/${maxRetries}），重试中... 错误: ${lastError}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 延迟后重试
      }
    }
  }

  return { status: 'error', error: lastError || '未知错误' };
}
```

### 关键健壮性设计点

- **超时控制**：单次 Python 调用设置超时（如 10 秒），避免因脚本死锁导致主进程阻塞。
- **指数退避重试**：重试间隔逐渐增加（如第 1 次 1 秒，第 2 次 2 秒），减少短时间内重复失败的概率。
- **错误分类**：区分"Python 未安装"（环境问题）、"脚本语法错误"（代码问题）、"参数传递错误"（调用问题），返回明确的错误类型给用户。
- **日志记录**：记录每次 Python 调用的详细日志（如参数、输出、错误），便于后续排查（可存储到本地日志文件）。

### 使用示例

```typescript
// 调用 TIF 处理脚本
const result = await callPythonScriptWithRetry(
  path.join(__dirname, 'python_scripts', 'process_tif.py'),
  [tifFilePath, JSON.stringify(tifParams)]
);

if (result.status === 'success') {
  console.log('处理成功，输出路径:', result.data.outputPath);
} else {
  console.error('处理失败:', result.error);
  // 前端提示用户"TIF 处理失败，请检查文件格式或联系支持"
}
```

## 部署指南

### 构建配置

#### Vite 配置
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'element-plus'],
          three: ['three']
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
```

#### Electron Builder 配置
```json
{
  "build": {
    "appId": "com.example.image-mesh",
    "productName": "Image-Mesh",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist-electron/**/*",
      "dist/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.science",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ]
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        }
      ]
    }
  }
}
```

### 打包脚本

#### package.json scripts
```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "dev:debug": "node scripts/debug-dev.cjs",
    "debug:vue": "node scripts/vue-error-debugger.js",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "vue-tsc --noEmit && vite build",
    "build:electron": "electron-builder",
    "build:all": "npm run build && npm run build:electron",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.vue",
    "lint:fix": "eslint src --ext .ts,.vue --fix",
    "format": "prettier --write src/**/*.{ts,vue}"
  }
}
```

### CI/CD 配置

#### GitHub Actions
```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build:all
      
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: ${{ matrix.os }}-build
        path: release/
```

---

**版本**: 1.0.0  
**最后更新**: 2024年  
**维护者**: Image-Mesh 开发团队