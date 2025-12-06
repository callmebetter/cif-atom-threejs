<template>
  <div class="file-content-container">
    <!-- Breadcrumbs -->
    <el-breadcrumb separator="/" class="breadcrumb">
      <el-breadcrumb-item :to="'/upload'">文件导入</el-breadcrumb-item>
      <el-breadcrumb-item>文件内容</el-breadcrumb-item>
      <el-breadcrumb-item>{{ currentFile?.name }}</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="file-content-header">
      <el-button @click="goBack" type="primary" plain>
        <el-icon><ArrowLeft /></el-icon>
        返回文件列表
      </el-button>
      <div class="file-content-title">
        <h2>{{ currentFile?.name }}</h2>
        <el-tag :type="getFileTypeTagType(currentFile?.type)" size="large">
          {{ currentFile?.type?.toUpperCase() }}
        </el-tag>
      </div>
      <el-button @click="downloadFile" type="success">
        <el-icon><Download /></el-icon>
        下载文件
      </el-button>
    </div>

    <!-- File Metadata -->
    <el-card class="file-metadata-card" shadow="hover">
      <h3>文件信息</h3>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="文件名">{{ currentFile?.name }}</el-descriptions-item>
        <el-descriptions-item label="文件类型">{{ currentFile?.type?.toUpperCase() }}</el-descriptions-item>
        <el-descriptions-item label="文件大小">{{ formatFileSize(currentFile?.size || 0) }}</el-descriptions-item>
        <el-descriptions-item label="上传时间">{{ formatDate(currentFile?.uploadTime) }}</el-descriptions-item>
        <el-descriptions-item label="处理状态">
          <el-tag :type="currentFile?.processed ? 'success' : 'warning'">
            {{ currentFile?.processed ? '已处理' : '待处理' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="文件路径">{{ currentFile?.path }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- File Content -->
    <el-card class="file-content-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3>文件内容</h3>
          <div v-if="isTextFile" class="content-actions">
            <el-button @click="copyContent" type="text" size="small">
              <el-icon><DocumentCopy /></el-icon>
              复制内容
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="isReadingFile" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>

      <div v-else-if="fileContentError" class="error-container">
        <el-alert
          title="读取文件失败"
          :description="fileContentError"
          type="error"
          show-icon
          :closable="false"
        />
      </div>

      <div v-else-if="isTextFile" class="text-content-container">
        <el-scrollbar height="600px">
          <pre class="file-content-pre"><code>{{ fileContent }}</code></pre>
        </el-scrollbar>
      </div>

      <div v-else class="binary-content-container">
        <el-empty
          description="
            <span style='color: #606266;'>
              二进制文件无法直接显示内容<br />
              您可以点击上方的下载按钮获取原始文件
            </span>
          "
        >
          <el-button type="primary" @click="downloadFile">下载文件</el-button>
        </el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Download, DocumentCopy } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import type { FileInfo } from '@/stores/app'
import { fileOperations } from '@/platform/sdk'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// State
const isReadingFile = ref(false)
const fileContent = ref('')
const fileContentError = ref('')
const binaryFileContent = ref<ArrayBuffer | null>(null)

// Computed properties
const currentFile = computed(() => {
  const fileId = route.params.id as string
  return appStore.loadedFiles.find(file => file.id === fileId) || null
})

const isTextFile = computed(() => {
  return currentFile.value?.type === 'cif' // Only CIF is text-based in supported types
})

// Methods
const goBack = () => {
  router.push('/upload')
  appStore.clearCurrentFileContent()
}

const downloadFile = async () => {
  if (!currentFile.value) return
  
  try {
    // For binary files, we can use the existing path
    // In a real app, we would implement proper download logic
    ElMessage.info('下载功能将在后续版本中实现')
  } catch (error) {
    ElMessage.error('下载文件失败: ' + (error as Error).message)
  }
}

const copyContent = () => {
  if (!fileContent.value) return
  
  navigator.clipboard.writeText(fileContent.value)
    .then(() => {
      ElMessage.success('内容已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制内容失败')
    })
}

const readFileContent = async () => {
  if (!currentFile.value) return
  
  isReadingFile.value = true
  fileContentError.value = ''
  
  try {
    const result = await fileOperations.readFile(currentFile.value.path)
    
    if (!result.success) {
      throw new Error(result.error || '读取文件失败')
    }
    
    if (result.data) {
      if (isTextFile.value) {
        // Convert ArrayBuffer to string for text files
        const decoder = new TextDecoder('utf-8')
        fileContent.value = decoder.decode(new Uint8Array(result.data as ArrayBuffer))
        appStore.setCurrentFileContent(fileContent.value)
      } else {
        // Store ArrayBuffer for binary files
        binaryFileContent.value = result.data as ArrayBuffer
        appStore.setCurrentFileContent(result.data)
      }
    }
  } catch (error) {
    fileContentError.value = (error as Error).message
    console.error('Error reading file:', error)
  } finally {
    isReadingFile.value = false
  }
}

const getFileTypeTagType = (type?: string) => {
  switch (type) {
    case 'cif': return 'primary'
    case 'tif': return 'success'
    case 'zip': return 'warning'
    default: return 'info'
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date?: Date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// Watch for route parameter changes
watch(() => route.params.id, () => {
  if (route.params.id) {
    readFileContent()
  }
})

// Lifecycle hooks
onMounted(() => {
  if (route.params.id) {
    readFileContent()
  }
})
</script>

<style scoped>
.file-content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.breadcrumb {
  margin-bottom: 20px;
  font-size: 14px;
}

.file-content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 20px;
  flex-wrap: wrap;
}

.file-content-title {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
  justify-content: center;
}

.file-content-title h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.file-metadata-card {
  margin-bottom: 20px;
}

.file-metadata-card h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
  font-size: 18px;
}

.file-content-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
}

.content-actions {
  display: flex;
  gap: 10px;
}

.loading-container {
  padding: 20px 0;
}

.error-container {
  padding: 20px 0;
}

.text-content-container {
  background-color: #fafafa;
  border-radius: 8px;
  overflow: hidden;
}

.file-content-pre {
  margin: 0;
  padding: 20px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  background-color: #fafafa;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.file-content-pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

.binary-content-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background-color: #fafafa;
  border-radius: 8px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .file-content-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-content-title {
    flex-direction: column;
    text-align: center;
  }
  
  .file-content-title h2 {
    font-size: 20px;
  }
}
</style>