<template>
  <div class="image-processing-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>图像处理</span>
          <el-button type="primary" @click="selectImage" :disabled="!currentFile">
            <el-icon><Picture /></el-icon>
            选择图像
          </el-button>
        </div>
      </template>

      <div v-if="!currentFile" class="no-file-selected">
        <el-empty description="请先选择一个TIF图像文件">
          <el-button type="primary" @click="$router.push('/upload')">
            去上传文件
          </el-button>
        </el-empty>
      </div>

      <div v-else class="image-workspace">
        <el-row :gutter="20">
          <el-col :span="16">
            <div class="image-display">
              <canvas ref="imageCanvas" class="image-canvas"></canvas>
            </div>
          </el-col>
          
          <el-col :span="8">
            <div class="control-panel">
              <h4>图像调整</h4>
              
              <!-- TIF信息显示 -->
              <div v-if="tifInfo" class="tif-info">
                <h5>图像信息</h5>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="尺寸">{{ tifInfo.width }} × {{ tifInfo.height }}</el-descriptions-item>
                  <el-descriptions-item label="位深度">{{ tifInfo.bitsPerSample }} 位</el-descriptions-item>
                  <el-descriptions-item label="样本数">{{ tifInfo.samplesPerPixel }}</el-descriptions-item>
                  <el-descriptions-item label="压缩">{{ getCompressionName(tifInfo.compression) }}</el-descriptions-item>
                  <el-descriptions-item v-if="tifInfo.isCompressed" label="压缩比">
                    {{ compressionInfo?.compressionRatio?.toFixed(2) || 'N/A' }}:1
                  </el-descriptions-item>
                  <el-descriptions-item v-if="tifInfo.isCompressed" label="节省空间">
                    {{ compressionInfo?.spaceSaved || 'N/A' }}
                  </el-descriptions-item>
                  <el-descriptions-item v-if="tifInfo.originalSize" label="原始大小">
                    {{ formatFileSize(tifInfo.originalSize) }}
                  </el-descriptions-item>
                  <el-descriptions-item v-if="tifInfo.compressedSize" label="压缩后大小">
                    {{ formatFileSize(tifInfo.compressedSize) }}
                  </el-descriptions-item>
                </el-descriptions>
                
                <!-- 压缩操作按钮 -->
                <div v-if="tifInfo.isCompressed" class="compression-actions">
                  <el-button size="small" @click="showDecompressionInfo">
                    <el-icon><InfoFilled /></el-icon>
                    解压详情
                  </el-button>
                </div>
              </div>
              
              <el-form label-width="80px">
                <el-form-item label="亮度">
                  <el-slider
                    v-model="brightness"
                    :min="-100"
                    :max="100"
                    @change="applyImageAdjustments"
                  />
                </el-form-item>
                
                <el-form-item label="对比度">
                  <el-slider
                    v-model="contrast"
                    :min="-100"
                    :max="100"
                    @change="applyImageAdjustments"
                  />
                </el-form-item>
                
                <el-form-item label="缩放">
                  <el-slider
                    v-model="zoom"
                    :min="10"
                    :max="200"
                    @change="applyZoom"
                  />
                </el-form-item>
              </el-form>

              <div class="action-buttons">
                <el-button @click="resetAdjustments">重置</el-button>
                <el-button type="primary" @click="saveProcessedImage">保存</el-button>
                <el-button v-if="originalImageData" type="success" @click="compressCurrentImage">
                  <el-icon><FolderOpened /></el-icon>
                  压缩图像
                </el-button>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { TifParser, type TifImageInfo } from '@/utils/tifParser'
import { InfoFilled, FolderOpened } from '@element-plus/icons-vue'
import { fileOperations } from '@/platform/sdk'

const appStore = useAppStore()

const imageCanvas = ref<HTMLCanvasElement>()
const currentFile = ref(appStore.currentFile)
const brightness = ref(0)
const contrast = ref(0)
const zoom = ref(100)
const originalImageData = ref<ImageData | null>(null)
const tifInfo = ref<TifImageInfo | null>(null)
const compressionInfo = ref<{
  compressionRatio: number
  spaceSaved: string
  originalSize: number
  compressedSize: number
}>()

const selectImage = async () => {
  if (!currentFile.value) return
  
  try {
    const result = await fileOperations.readFile(currentFile.value.path)
    if (result.success && result.data) {
      loadImageToCanvas(result.data)
    }
  } catch (error) {
    ElMessage.error('图像加载失败: ' + error)
  }
}

const loadImageToCanvas = async (imageData: ArrayBuffer) => {
  if (!imageCanvas.value) return
  
  try {
    // Validate TIF file
    if (!TifParser.validateTifFile(imageData)) {
      throw new Error('Invalid TIF file format')
    }
    
    // Parse TIF and get image data
    const { info, imageData: parsedImageData } = await TifParser.parseTif(imageData)
    tifInfo.value = info
    
    // 提取压缩信息
    if (info.isCompressed) {
      compressionInfo.value = TifParser.getCompressionInfo(imageData)
    }
    
    // Set canvas dimensions
    imageCanvas.value.width = info.width
    imageCanvas.value.height = info.height
    
    // Get canvas context and draw image
    const ctx = imageCanvas.value.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    
    ctx.putImageData(parsedImageData, 0, 0)
    originalImageData.value = ctx.getImageData(0, 0, info.width, info.height)
    
    const compressionText = info.isCompressed ? ' (压缩)' : ''
    
    // Update app status
    appStore.updateFileStatus(currentFile.value.id, true)
    appStore.setStatus(`图像加载完成: ${info.width}x${info.height}, ${info.bitsPerSample}位, ${info.samplesPerPixel}通道${compressionText}`)
    
    ElMessage.success('图像加载成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`图像加载失败: ${errorMessage}`)
    console.error('Image loading error:', error)
  }
}

const applyImageAdjustments = () => {
  if (!imageCanvas.value || !originalImageData.value) return
  
  const ctx = imageCanvas.value.getContext('2d')
  if (!ctx) return
  
  const imageData = new ImageData(
    new Uint8ClampedArray(originalImageData.value.data),
    originalImageData.value.width,
    originalImageData.value.height
  )
  
  const data = imageData.data
  const brightnessValue = brightness.value * 2.55
  const contrastValue = (contrast.value + 100) / 100
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply brightness
    data[i] = Math.min(255, Math.max(0, data[i] + brightnessValue))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightnessValue))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightnessValue))
    
    // Apply contrast
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastValue + 128))
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastValue + 128))
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastValue + 128))
  }
  
  ctx.putImageData(imageData, 0, 0)
}

const applyZoom = () => {
  if (!imageCanvas.value) return
  
  const scale = zoom.value / 100
  imageCanvas.value.style.transform = `scale(${scale})`
  imageCanvas.value.style.transformOrigin = 'top left'
}

const resetAdjustments = () => {
  brightness.value = 0
  contrast.value = 0
  zoom.value = 100
  applyImageAdjustments()
  applyZoom()
}

const getCompressionName = (compression: number): string => {
  const compressionTypes: { [key: number]: string } = {
    1: '无压缩',
    2: 'CCITT 1D',
    3: 'Group 3 Fax',
    4: 'Group 4 Fax',
    5: 'LZW',
    6: 'JPEG',
    7: 'JPEG',
    8: 'Deflate',
    32773: 'PackBits'
  }
  return compressionTypes[compression] || `未知 (${compression})`
}

const saveProcessedImage = async () => {
  if (!imageCanvas.value || !currentFile.value) return
  
  try {
    const blob = await new Promise<Blob>((resolve) => {
      imageCanvas.value!.toBlob((blob) => {
        resolve(blob!)
      }, 'image/png')
    })
    
    const arrayBuffer = await blob.arrayBuffer()
    const fileName = `processed_${currentFile.value.name.replace('.tif', '.png')}`
    
    const result = await fileOperations.saveFile(fileName, arrayBuffer)
    if (result.success) {
      ElMessage.success('图像保存成功')
    } else {
      ElMessage.error('图像保存失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('图像保存失败: ' + error)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const showDecompressionInfo = () => {
  if (!compressionInfo.value) return
  
  ElMessage.info(
    `压缩比: ${compressionInfo.value.compressionRatio.toFixed(2)}:1\n` +
    `节省空间: ${compressionInfo.value.spaceSaved}\n` +
    `原始大小: ${formatFileSize(compressionInfo.value.originalSize)}\n` +
    `压缩后大小: ${formatFileSize(compressionInfo.value.compressedSize)}`
  )
}

const compressCurrentImage = async () => {
  if (!originalImageData.value || !tifInfo.value) return
  
  try {
    // 使用pako压缩当前图像数据
    const compressedData = TifParser.compressImageData(originalImageData.value.data)
    
    // 创建压缩后的TIF文件
    const compressedTif = TifParser.createCompressedTif(
      originalImageData.value,
      tifInfo.value,
      compressedData
    )
    
    const fileName = `compressed_${currentFile.value?.name || 'image.tif'}`
    const result = await fileOperations.saveFile(fileName, compressedTif)
    
    if (result.success) {
      ElMessage.success(`图像压缩完成，压缩比: ${(originalImageData.value.data.length / compressedData.length).toFixed(2)}:1`)
    } else {
      ElMessage.error('图像压缩失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('图像压缩失败: ' + error)
  }
}

watch(() => appStore.currentFile, (newFile) => {
  currentFile.value = newFile
  if (newFile && newFile.type === 'tif') {
    selectImage()
  }
})

onMounted(() => {
  appStore.setStatus('图像处理模块已就绪')
  if (currentFile.value && currentFile.value.type === 'tif') {
    selectImage()
  }
})
</script>

<style scoped>
.image-processing-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-file-selected {
  text-align: center;
  padding: 40px;
}

.image-workspace {
  min-height: 600px;
}

.image-display {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  overflow: auto;
}

.image-canvas {
  max-width: 100%;
  max-height: 500px;
  border: 1px solid #ccc;
  background: white;
}

.control-panel {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  height: fit-content;
}

.control-panel h4 {
  margin-bottom: 20px;
  color: #303133;
}

.tif-info {
  margin-bottom: 20px;
  padding: 15px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
}

.tif-info h5 {
  margin: 0 0 10px 0;
  color: #1e40af;
  font-size: 14px;
}

.compression-actions {
  margin-top: 15px;
  text-align: center;
}

.compression-actions .el-button {
  width: 100%;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 5px;
}
</style>