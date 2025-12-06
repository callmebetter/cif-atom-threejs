<template>
  <div class="settings-container">
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Setting /></el-icon>
          <span>应用设置</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions title="应用信息" border>
            <el-descriptions-item label="应用名称">晶体学与微观图像科研辅助工具</el-descriptions-item>
            <el-descriptions-item label="版本号">1.0.0</el-descriptions-item>
            <el-descriptions-item label="平台" :span="2">{{ platformInfo.platform }} ({{ platformInfo.arch }})</el-descriptions-item>
            <el-descriptions-item label="Electron版本">{{ platformInfo.electronVersion }}</el-descriptions-item>
            <el-descriptions-item label="Node版本">{{ platformInfo.nodeVersion }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 数据库设置 -->
        <el-tab-pane label="数据库" name="database">
          <el-descriptions title="数据库信息" border>
            <el-descriptions-item label="数据库类型">SQLite</el-descriptions-item>
            <el-descriptions-item label="数据库文件">
              <div class="database-path-container">
                <el-input 
                  v-model="databasePath" 
                  readonly 
                  placeholder="加载中..."
                  class="database-path-input"
                />
                <el-button 
                  type="primary" 
                  @click="copyDatabasePath"
                  :disabled="!databasePath"
                  class="copy-button"
                >
                  <el-icon><CopyDocument /></el-icon>
                  复制路径
                </el-button>
                <el-button 
                  type="success" 
                  @click="openDatabaseDir"
                  :disabled="!databasePath"
                  class="open-button"
                >
                  <el-icon><FolderOpened /></el-icon>
                  打开目录
                </el-button>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="数据库大小" :span="2">{{ formatFileSize(databaseStats.databaseSize) }}</el-descriptions-item>
            <el-descriptions-item label="项目数量">{{ databaseStats.projectsCount }}</el-descriptions-item>
            <el-descriptions-item label="分析记录数量">{{ databaseStats.analysisRecordsCount }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref, onMounted } from 'vue'
import { databaseOperations, fileOperations } from '@/platform/sdk'

// 平台信息
const platformInfo = ref({
  platform: 'Unknown',
  arch: 'Unknown',
  electronVersion: 'Unknown',
  nodeVersion: 'Unknown'
})

// 数据库信息
const databasePath = ref('')
const databaseStats = ref({
  projectsCount: 0,
  analysisRecordsCount: 0,
  databaseSize: 0
})

// 活跃标签页
const activeTab = ref('basic')

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 复制数据库路径到剪贴板
const copyDatabasePath = async () => {
  if (!databasePath.value) return
  
  try {
    await navigator.clipboard.writeText(databasePath.value)
    ElMessage.success('路径已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 打开数据库所在目录
const openDatabaseDir = async () => {
  if (!databasePath.value) return
  
  try {
    const result = await databaseOperations.openDatabaseDir()
    if (result.success) {
      ElMessage.success('已打开数据库目录')
    } else {
      throw new Error(result.error || '打开目录失败')
    }
  } catch (error) {
    console.error('打开目录失败:', error)
    ElMessage.error('打开目录失败: ' + (error instanceof Error ? error.message : String(error)))
  }
}

// 初始化数据
const initData = async () => {
  try {
    // 获取平台信息
    const platformResult = await fileOperations.getPlatformInfo()
    if (platformResult) {
      platformInfo.value = {
        platform: platformResult.platform,
        arch: platformResult.arch,
        electronVersion: platformResult.electronVersion,
        nodeVersion: platformResult.version
      }
    }
    
    // 获取数据库路径
    const dbPathResult = await databaseOperations.getDatabasePath()
    if (dbPathResult.success && dbPathResult.data) {
      databasePath.value = dbPathResult.data
    }
    
    // 获取数据库统计信息
    const statsResult = await databaseOperations.getStats()
    if (statsResult.success && statsResult.stats) {
      databaseStats.value = statsResult.stats
    }
  } catch (error) {
    console.error('初始化设置数据失败:', error)
    ElMessage.error('加载设置数据失败')
  }
}

// 组件挂载时初始化数据
onMounted(() => {
  initData()
})
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-card {
  max-width: 800px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.database-path-container {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.database-path-input {
  flex: 1;
}

.copy-button {
  white-space: nowrap;
}
</style>
