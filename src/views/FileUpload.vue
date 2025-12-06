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

      <!-- 提示信息 -->
      <div class="upload-info">
        <el-icon class="el-icon--info"><InfoFilled /></el-icon>
        <div class="upload-info-text">
          <h4>支持格式</h4>
          <p>CIF晶体结构文件、TIF显微图像文件、ZIP压缩包</p>
          <h4>操作说明</h4>
          <p>点击上方"选择文件"按钮，通过文件选择器选择要导入的文件</p>
        </div>
      </div>

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
import { Plus, Operation, Delete, InfoFilled } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import type { FileInfo } from '@/stores/app'
import { fileOperations } from '@/platform/sdk'

const appStore = useAppStore()
const router = useRouter()

const isLoading = ref(false)
const isProcessing = ref(false)
const showProgress = ref(false)
const progressPercentage = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | undefined>(undefined)
const progressText = ref('')
const processedCount = ref(0)
const totalCount = ref(0)
// Drag and drop state
const isDragging = ref(false)
const dragText = ref('拖拽文件到此处上传')

const uploadedFiles = computed(() => appStore.loadedFiles)

const selectFiles = async () => {
  try {
    const result = await fileOperations.selectFile({
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
    const errorMsg = error instanceof Error ? error.message : String(error)
    ElMessage.error('文件导入失败: ' + errorMsg)
  } finally {
    isLoading.value = false
    appStore.setLoading(false)
  }
}



const processSingleFile = async (filePath: string): Promise<FileInfo | null> => {
  try {
    const result = await fileOperations.readFile(filePath)
    if (!result.success) {
      throw new Error(result.error || '文件读取失败')
    }

    const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'unknown'
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
    const fileType = ['cif', 'tif', 'zip'].includes(fileExtension) ? fileExtension as 'cif' | 'tif' | 'zip' : 'unknown'

    if (fileType === 'unknown') {
      throw new Error('不支持的文件类型')
    }
    console.log(result)
    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      name: fileName,
      type: fileType,
      size: result.data ? (result.data as any).byteLength || 0 : 0,
      path: filePath,
      uploadTime: new Date(),
      processed: false
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('处理文件失败:', errorMsg)
    ElMessage.error(`处理文件 ${filePath} 失败: ${errorMsg}`)
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
  
  // For TIF files, continue to use the existing processing flow
  if (file.type === 'tif') {
    processFile(file)
  } else {
    // For CIF and ZIP files, redirect to the new file content page
    router.push(`/file-content/${file.id}`)
  }
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
    const errorMsg = error instanceof Error ? error.message : String(error)
    progressStatus.value = 'exception'
    progressText.value = '批量处理失败: ' + errorMsg
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

// Drag and drop event handlers
const handleDragOver = () => {
  isDragging.value = true
  dragText.value = '释放文件开始上传'
}

const handleDragEnter = () => {
  isDragging.value = true
  dragText.value = '释放文件开始上传'
}

const handleDragLeave = (event: DragEvent) => {
  // Check if the mouse is leaving the drop zone completely
  const target = event.currentTarget as HTMLElement
  const related = event.relatedTarget as HTMLElement | null
  if (target === related || (related && !target.contains(related))) {
    isDragging.value = false
    dragText.value = '拖拽文件到此处上传'
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  dragText.value = '拖拽文件到此处上传'
  
  // Get the dropped items
  const items = event.dataTransfer?.items
  if (!items || items.length === 0) {
    return
  }
  
  // Process dropped items
  const filePaths: string[] = []
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file') {
      // For Electron, we can get the file path from webkitGetAsEntry
      const entry = item.webkitGetAsEntry()
      if (entry && entry.isFile) {
        // In Electron, we can access the full path
        // Note: This works in Electron renderer with proper permissions
        const file = item.getAsFile()
        if (file) {
          // Get the full path from the file object (works in Electron)
          // @ts-ignore - Electron adds path property to File objects
          const fullPath = file.path
          if (fullPath) {
            filePaths.push(fullPath)
          }
        }
      }
    }
  }
  
  if (filePaths.length === 0) {
    ElMessage.warning('没有检测到有效的文件路径')
    return
  }
  
  // Filter supported files
  const supportedExtensions = ['.cif', '.tif', '.zip']
  const supportedFiles = filePaths.filter(filePath => {
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
    return supportedExtensions.includes(ext)
  })
  
  if (supportedFiles.length === 0) {
    ElMessage.error('没有支持的文件类型')
    return
  }
  
  // Process the supported files
  handleSelectedFiles(supportedFiles)
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

/* Drag and drop zone styles */
.upload-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
  padding: 40px 20px;
  background-color: #fafafa;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 200px;
}

.upload-drop-zone:hover {
  background-color: #f5f7fa;
  border-color: #c6e2ff;
}

.upload-drop-zone.drag-over {
  background-color: #ecf5ff;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.upload-drop-zone .upload-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
  transition: color 0.3s ease;
}

.upload-drop-zone:hover .upload-icon,
.upload-drop-zone.drag-over .upload-icon {
  color: #409eff;
}

.upload-drop-zone h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 18px;
  font-weight: 500;
}

.upload-drop-zone p {
  margin: 0;
  color: #909399;
  font-size: 14px;
  line-height: 1.5;
}

.upload-info {
  display: flex;
  align-items: flex-start;
  margin: 20px 0;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.upload-info .el-icon--info {
  font-size: 24px;
  color: #409eff;
  margin-right: 16px;
  margin-top: 4px;
}

.upload-info-text h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.upload-info-text p {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}

.upload-info-text p:last-child {
  margin-bottom: 0;
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
</style>