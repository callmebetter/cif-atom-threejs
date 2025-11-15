# Image-Mesh 开发者文档

## 目录
1. [项目架构](#项目架构)
2. [开发环境设置](#开发环境设置)
3. [代码结构](#代码结构)
4. [API 参考](#api-参考)
5. [开发指南](#开发指南)
6. [测试指南](#测试指南)
7. [部署指南](#部署指南)

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
# 终端 1: 启动 Vite 开发服务器
npm run dev:vite

# 终端 2: 启动 Electron 应用
npm run dev:electron
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
  // ... 其他数据库操作方法
}
```

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