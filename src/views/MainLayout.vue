<template>
  <el-container class="main-container">
    <!-- 顶部工具栏 -->
    <el-header class="app-header">
      <div class="header-left">
        <h1 class="app-title">晶体学与微观图像科研辅助工具</h1>
      </div>
      <div class="header-right">
        <el-button type="text" @click="toggleTheme">
          <el-icon><Moon v-if="!isDark" /><Sunny v-else /></el-icon>
        </el-button>
      </div>
    </el-header>

    <el-container>
      <!-- 左侧导航栏 -->
      <el-aside :width="sidebarWidth" class="sidebar">
        <el-menu
          :default-active="$route.path"
          class="sidebar-menu"
          :collapse="isCollapsed"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/upload">
            <el-icon><Upload /></el-icon>
            <template #title>文件导入</template>
          </el-menu-item>
          
          <el-menu-item index="/image-processing">
            <el-icon><Picture /></el-icon>
            <template #title>图像处理</template>
          </el-menu-item>
          
          <el-menu-item index="/cif-analysis">
            <el-icon><Document /></el-icon>
            <template #title>CIF解析</template>
          </el-menu-item>
          
          <el-menu-item index="/structure-visualization">
            <el-icon><View /></el-icon>
            <template #title>结构可视化</template>
          </el-menu-item>
          
          <el-menu-item index="/component-analysis">
            <el-icon><PieChart /></el-icon>
            <template #title>成分分析</template>
          </el-menu-item>
          
          <el-menu-item index="/image-mesh">
            <el-icon><Grid /></el-icon>
            <template #title>图像网格化</template>
          </el-menu-item>
          
          <el-menu-item index="/report-generator">
            <el-icon><Document /></el-icon>
            <template #title>报告生成</template>
          </el-menu-item>
        </el-menu>
        
        <div class="sidebar-toggle" @click="toggleSidebar">
          <el-icon>
            <Expand v-if="isCollapsed" />
            <Fold v-else />
          </el-icon>
        </div>
      </el-aside>

      <!-- 中央内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 底部状态栏 -->
    <el-footer class="app-footer">
      <div class="status-left">
        <span class="status-text">{{ statusText }}</span>
      </div>
      <div class="status-right">
        <span class="file-count">已加载文件: {{ fileCount }}</span>
      </div>
    </el-footer>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { fileOperations } from '@/platform/sdk'

const appStore = useAppStore()

const isCollapsed = ref(false)
const isDark = ref(false)

const sidebarWidth = computed(() => isCollapsed.value ? '64px' : '220px')
const statusText = computed(() => appStore.statusText)
const fileCount = computed(() => appStore.fileCount)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

onMounted(async () => {
  // Initialize app data directory
  try {
    const result = await fileOperations.initAppData()
    if (result.success) {
      appStore.setAppDataPaths(result.paths)
      appStore.setStatus('应用初始化完成')
    } else {
      appStore.setStatus('应用初始化失败: ' + result.error)
    }
  } catch (error) {
    // Fallback for development without electron
    appStore.setStatus('开发模式 - Electron API 不可用')
    console.warn('electronAPI is not available. Running in development mode.', error)
  }
})
</script>

<style scoped>
.main-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: #409EFF;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s ease;
  position: relative;
}

.sidebar-menu {
  border-right: none;
  height: calc(100vh - 80px);
}

.sidebar-toggle {
  position: absolute;
  bottom: 20px;
  right: 10px;
  cursor: pointer;
  color: #bfcbd9;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.sidebar-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.main-content {
  background-color: #f5f5f5;
  padding: 20px;
  overflow-y: auto;
}

.app-footer {
  background-color: #f0f0f0;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 40px;
  font-size: 12px;
}

.status-text {
  color: #666;
}

.file-count {
  color: #409EFF;
  font-weight: 500;
}

/* Dark theme support */
:global(.dark) .main-content {
  background-color: #1a1a1a;
}

:global(.dark) .app-footer {
  background-color: #2d2d2d;
  border-top-color: #404040;
}

:global(.dark) .status-text {
  color: #ccc;
}
</style>