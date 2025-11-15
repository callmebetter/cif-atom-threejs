<template>
  <div class="file-upload-container">
    <el-card class="upload-card">
      <template #header>
        <div class="card-header">
          <span>文件导入</span>
          <el-button type="primary" @click="selectFiles" :loading="isLoading">
            <el-icon><Plus /></el-icon>
            选择文件
          </el-button>
        </div>
      </template>

      <!-- 拖拽上传区域 -->
      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        :file-list="fileList"
        multiple
        accept=".cif,.tif,.zip"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击选择文件</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持格式：CIF晶体结构文件、TIF显微图像文件、ZIP压缩包
          </div>
        </template>
      </el-upload>

      <!-- 文件列表 -->
      <div v-if="uploadedFiles.length > 0" class="file-list-section">
        <h3>已上传文件</h3>
        <el-table :data="uploadedFiles" style="width: 100%">
          <el-table-column prop="name" label="文件名" min-width="200" />
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="getTypeTagType(row.type)">{{ row.type.toUpperCase() }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="size" label="大小" width="120">
            <template #default="{ row }">
              {{ formatFileSize(row.size) }}
            </template>
          </el-table-column>
          <el-table-column prop="uploadTime" label="上传时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.uploadTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="processed" label="处理状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.processed ? 'success' : 'warning'">
                {{ row.processed ? '已处理' : '待处理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="text" size="small" @click="processFile(row)">
                处理
              </el-button>
              <el-button type="text" size="small" @click="viewFile(row)">
                查看
              </el-button>
              <el-button type="text" size="small" @click="deleteFile(row)" style="color: #f56c6c;">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 批量操作 -->
      <div v-if="uploadedFiles.length > 0" class="batch-operations">
        <el-button @click="processAllFiles" :loading="isProcessing">
          <el-icon><Operation /></el-icon>
          批量处理
        </el-button>
        <el-button @click="clearAllFiles" type="danger" plain>
          <el-icon><Delete /></el-icon>
          清空文件
        </el-button>
      </div>
    </el-card>

    <!-- 处理进度对话框 -->
    <el-dialog v-model="showProgress" title="文件处理进度" width="50%">
      <el-progress :percentage="progressPercentage" :status="progressStatus" />
      <div class="progress-info">
        <p>{{ progressText }}</p>
        <p>已处理: {{ processedCount }} / {{ totalCount }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '@/stores/app'
import type { UploadFile, UploadFiles } from 'element-plus'
import type { FileInfo } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()

const uploadRef = ref()
const fileList = ref<UploadFiles>([])
const isLoading = ref(false)
const isProcessing = ref(false)
const showProgress = ref(false)
const progressPercentage = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | undefined>(undefined)
const progressText = ref('')
const processedCount = ref(0)
const totalCount = ref(0)

const uploadedFiles = computed(() => appStore.loadedFiles)

const selectFiles = async () => {
  try {
    const result = await window.electronAPI.selectFile({
      filters: [
        { name: '支持的文件', extensions: ['cif', 'tif', 'zip'] },
        { name: 'CIF文件', extensions: ['cif'] },
        { name: 'TIF文件', extensions: ['tif'] },
        { name: 'ZIP文件', extensions: ['zip'] }
      ],
      properties: ['openFile', 'multiSelections']
    })

    if (result.success && result.files && result.files.length > 0) {
      // Validate file paths
      const validPaths = result.files.filter(path => {
        if (!path || typeof path !== 'string') {
          console.warn('Invalid file path:', path)
          return false
        }
        return true
      })

      if (validPaths.length === 0) {
        ElMessage.warning('没有选择有效的文件')
        return
      }

      if (validPaths.length < result.files.length) {
        ElMessage.warning(`过滤了 ${result.files.length - validPaths.length} 个无效文件路径`)
      }

      // Check file types
      const supportedExtensions = ['.cif', '.tif', '.zip']
      const unsupportedFiles = validPaths.filter(path => {
        const ext = path.toLowerCase().substring(path.lastIndexOf('.'))
        return !supportedExtensions.includes(ext)
      })

      if (unsupportedFiles.length > 0) {
        ElMessage.warning(`跳过 ${unsupportedFiles.length} 个不支持的文件类型`)
      }

      const supportedFiles = validPaths.filter(path => {
        const ext = path.toLowerCase().substring(path.lastIndexOf('.'))
        return supportedExtensions.includes(ext)
      })

      if (supportedFiles.length === 0) {
        ElMessage.error('没有支持的文件类型')
        return
      }

      handleSelectedFiles(supportedFiles)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '选择文件时发生未知错误'
    console.error('File selection error:', errorMessage)
    ElMessage.error(`文件选择失败: ${errorMessage}`)
  }
}

const handleSelectedFiles = async (filePaths: string[]) => {
  isLoading.value = true
  appStore.setLoading(true)

  try {
    for (const filePath of filePaths) {
      const fileInfo = await processSingleFile(filePath)
      if (fileInfo) {
        appStore.addFile(fileInfo)
      }
    }
    
    ElMessage.success(`成功导入 ${filePaths.length} 个文件`)
  } catch (error) {
    ElMessage.error('文件导入失败: ' + error)
  } finally {
    isLoading.value = false
    appStore.setLoading(false)
  }
}

const handleFileChange = async (file: UploadFile) => {
  if (file.raw) {
    const fileInfo = await processSingleFile(file.raw.path)
    if (fileInfo) {
      appStore.addFile(fileInfo)
    }
  }
}

const handleFileRemove = (file: UploadFile) => {
  const fileInfo = uploadedFiles.value.find(f => f.name === file.name)
  if (fileInfo) {
    appStore.removeFile(fileInfo.id)
  }
}

const processSingleFile = async (filePath: string): Promise<FileInfo | null> => {
  try {
    const result = await window.electronAPI.readFile(filePath)
    if (!result.success) {
      throw new Error(result.error || '文件读取失败')
    }

    const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'unknown'
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
    const fileType = ['cif', 'tif', 'zip'].includes(fileExtension) ? fileExtension as 'cif' | 'tif' | 'zip' : 'unknown'

    if (fileType === 'unknown') {
      throw new Error('不支持的文件类型')
    }

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: fileName,
      type: fileType,
      size: result.data ? result.data.length : 0,
      path: filePath,
      uploadTime: new Date(),
      processed: false
    }
  } catch (error) {
    console.error('处理文件失败:', error)
    ElMessage.error(`处理文件 ${filePath} 失败: ${error}`)
    return null
  }
}

const processFile = async (file: FileInfo) => {
  appStore.setStatus(`正在处理文件: ${file.name}`)
  
  // 根据文件类型跳转到相应的处理页面
  switch (file.type) {
    case 'tif':
      router.push('/image-processing')
      break
    case 'cif':
      router.push('/cif-analysis')
      break
    case 'zip':
      // ZIP文件可能包含多种类型，先解压再处理
      router.push('/upload')
      break
  }
  
  appStore.setCurrentFile(file)
}

const viewFile = (file: FileInfo) => {
  appStore.setCurrentFile(file)
  processFile(file)
}

const deleteFile = async (file: FileInfo) => {
  try {
    await ElMessageBox.confirm(`确定要删除文件 "${file.name}" 吗？`, '确认删除', {
      type: 'warning'
    })
    
    appStore.removeFile(file.id)
    ElMessage.success('文件删除成功')
  } catch {
    // 用户取消删除
  }
}

const processAllFiles = async () => {
  if (uploadedFiles.value.length === 0) {
    ElMessage.warning('没有可处理的文件')
    return
  }

  isProcessing.value = true
  showProgress.value = true
  processedCount.value = 0
  totalCount.value = uploadedFiles.value.length
  progressPercentage.value = 0
  progressText.value = '开始批量处理...'

  try {
    for (let i = 0; i < uploadedFiles.value.length; i++) {
      const file = uploadedFiles.value[i]
      progressText.value = `正在处理: ${file.name}`
      
      // 模拟处理过程
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      appStore.updateFileStatus(file.id, true)
      processedCount.value++
      progressPercentage.value = Math.round((processedCount.value / totalCount.value) * 100)
    }

    progressStatus.value = 'success'
    progressText.value = '批量处理完成'
    ElMessage.success('所有文件处理完成')
  } catch (error) {
    progressStatus.value = 'exception'
    progressText.value = '批量处理失败: ' + error
    ElMessage.error('批量处理失败')
  } finally {
    isProcessing.value = false
    setTimeout(() => {
      showProgress.value = false
      progressStatus.value = undefined
    }, 2000)
  }
}

const clearAllFiles = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有文件吗？', '确认清空', {
      type: 'warning'
    })
    
    appStore.clearFiles()
    fileList.value = []
    ElMessage.success('文件清空成功')
  } catch {
    // 用户取消清空
  }
}

const getTypeTagType = (type: string) => {
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

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  appStore.setStatus('文件导入模块已就绪')
})
</script>

<style scoped>
.file-upload-container {
  max-width: 1200px;
  margin: 0 auto;
}

.upload-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-area {
  margin-bottom: 20px;
}

.file-list-section {
  margin-top: 30px;
}

.file-list-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.batch-operations {
  margin-top: 20px;
  text-align: center;
}

.batch-operations .el-button {
  margin: 0 10px;
}

.progress-info {
  margin-top: 20px;
  text-align: center;
}

.progress-info p {
  margin: 5px 0;
  color: #666;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
}

:deep(.el-upload__tip) {
  color: #909399;
  font-size: 12px;
}
</style>