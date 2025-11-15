<template>
  <div class="image-mesh-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>图像网格化处理</span>
          <div>
            <el-button type="success" @click="processImage" :disabled="!currentFile || !meshConfig.isValid">
              <el-icon><Operation /></el-icon>
              生成网格
            </el-button>
            <el-button type="primary" @click="loadImage">
              <el-icon><Picture /></el-icon>
              加载图像
            </el-button>
          </div>
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
          <!-- 图像显示区域 -->
          <el-col :span="12">
            <div class="image-display">
              <h3>原始图像</h3>
              <div class="image-container">
                <canvas 
                  ref="originalCanvas" 
                  @load="onOriginalImageLoad"
                  @error="onImageError"
                ></canvas>
                <div v-if="!imageLoaded" class="image-placeholder">
                  <el-icon><Picture /></el-icon>
                  <span>点击"加载图像"按钮加载图像</span>
                </div>
              </div>
              
              <!-- 图像信息 -->
              <div class="image-info" v-if="imageLoaded">
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="文件名">{{ currentFile.name }}</el-descriptions-item>
                  <el-descriptions-item label="尺寸">{{ imageInfo.width }} × {{ imageInfo.height }}</el-descriptions-item>
                  <el-descriptions-item label="格式">{{ imageInfo.format }}</el-descriptions-item>
                  <el-descriptions-item label="大小">{{ formatFileSize(currentFile.size) }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-col>

          <!-- 网格化配置区域 -->
          <el-col :span="12">
            <div class="mesh-config">
              <h3>网格化配置</h3>
              
              <el-form :model="meshConfig" label-width="120px" size="default">
                <el-form-item label="网格类型">
                  <el-select v-model="meshConfig.type" @change="onMeshTypeChange">
                    <el-option label="三角网格" value="triangular" />
                    <el-option label="四边形网格" value="quadrilateral" />
                    <el-option label="混合网格" value="mixed" />
                  </el-select>
                </el-form-item>

                <el-form-item label="网格密度">
                  <el-slider 
                    v-model="meshConfig.density" 
                    :min="10" 
                    :max="200" 
                    :step="10"
                    show-input
                    @change="validateConfig"
                  />
                </el-form-item>

                <el-form-item label="自适应网格">
                  <el-switch 
                    v-model="meshConfig.adaptive" 
                    @change="onAdaptiveChange"
                  />
                </el-form-item>

                <el-form-item v-if="meshConfig.adaptive" label="自适应阈值">
                  <el-input-number 
                    v-model="meshConfig.adaptiveThreshold" 
                    :min="0.01" 
                    :max="1" 
                    :step="0.01"
                    @change="validateConfig"
                  />
                </el-form-item>

                <el-form-item label="边界检测">
                  <el-switch 
                    v-model="meshConfig.edgeDetection" 
                    @change="validateConfig"
                  />
                </el-form-item>

                <el-form-item v-if="meshConfig.edgeDetection" label="边缘敏感度">
                  <el-slider 
                    v-model="meshConfig.edgeSensitivity" 
                    :min="0.1" 
                    :max="2" 
                    :step="0.1"
                    @change="validateConfig"
                  />
                </el-form-item>

                <el-form-item label="平滑度">
                  <el-slider 
                    v-model="meshConfig.smoothing" 
                    :min="0" 
                    :max="10" 
                    :step="0.5"
                    @change="validateConfig"
                  />
                </el-form-item>

                <el-form-item label="质量优化">
                  <el-switch 
                    v-model="meshConfig.qualityOptimization" 
                    @change="validateConfig"
                  />
                </el-form-item>
              </el-form>

              <!-- 配置验证状态 -->
              <div class="config-status">
                <el-alert
                  v-if="meshConfig.isValid"
                  title="配置有效"
                  type="success"
                  :closable="false"
                  show-icon
                />
                <el-alert
                  v-else
                  title="配置无效"
                  type="error"
                  :closable="false"
                  show-icon
                >
                  {{ meshConfig.errorMessage }}
                </el-alert>
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 网格化结果区域 -->
        <div v-if="meshResult" class="mesh-result">
          <h3>网格化结果</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="mesh-visualization">
                <h4>网格可视化</h4>
                <canvas ref="meshCanvas"></canvas>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="mesh-statistics">
                <h4>网格统计</h4>
                <el-descriptions :column="1" size="small" border>
                  <el-descriptions-item label="总节点数">{{ meshResult.statistics.totalNodes }}</el-descriptions-item>
                  <el-descriptions-item label="总单元数">{{ meshResult.statistics.totalElements }}</el-descriptions-item>
                  <el-descriptions-item label="边界节点数">{{ meshResult.statistics.boundaryNodes }}</el-descriptions-item>
                  <el-descriptions-item label="处理时间">{{ meshResult.statistics.processingTime.toFixed(2) }} ms</el-descriptions-item>
                  <el-descriptions-item label="平均质量">{{ meshResult.statistics.averageQuality.toFixed(3) }}</el-descriptions-item>
                  <el-descriptions-item label="最小质量">{{ meshResult.statistics.minQuality.toFixed(3) }}</el-descriptions-item>
                  <el-descriptions-item label="最大质量">{{ meshResult.statistics.maxQuality.toFixed(3) }}</el-descriptions-item>
                </el-descriptions>

                <div class="quality-indicator">
                  <el-progress 
                    :percentage="meshResult.statistics.averageQuality * 100" 
                    :color="getQualityColor(meshResult.statistics.averageQuality)"
                    :stroke-width="8"
                  />
                  <span>网格质量评分</span>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button @click="resetConfig">
            <el-icon><RefreshLeft /></el-icon>
            重置配置
          </el-button>
          <el-button type="success" @click="saveToDatabase" :disabled="!meshResult">
            <el-icon><FolderAdd /></el-icon>
            保存到数据库
          </el-button>
          <el-button type="primary" @click="exportMesh" :disabled="!meshResult">
            <el-icon><Download /></el-icon>
            导出网格
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { imageMeshGenerator, type MeshResult, type MeshConfig } from '@/utils/imageMeshGenerator'

const router = useRouter()
const appStore = useAppStore()

const currentFile = ref(appStore.currentFile)
const originalCanvas = ref<HTMLCanvasElement>()
const meshCanvas = ref<HTMLCanvasElement>()
const imageLoaded = ref(false)
const meshResult = ref<MeshResult | null>(null)

// 图像信息
const imageInfo = reactive({
  width: 0,
  height: 0,
  format: ''
})

// 网格化配置
const meshConfig = reactive<MeshConfig & { isValid: boolean; errorMessage: string }>({
  type: 'triangular',
  density: 50,
  adaptive: false,
  adaptiveThreshold: 0.1,
  edgeDetection: true,
  edgeSensitivity: 1.0,
  smoothing: 2.0,
  qualityOptimization: true,
  isValid: true,
  errorMessage: ''
})

const loadImage = async () => {
  if (!currentFile.value) return
  
  try {
    const result = await window.electronAPI.readFile(currentFile.value.path)
    if (result.success && result.data) {
      const imageBlob = new Blob([result.data])
      const imageUrl = URL.createObjectURL(imageBlob)
      
      const img = new Image()
      img.onload = () => {
        // 绘制到canvas
        if (originalCanvas.value) {
          const ctx = originalCanvas.value.getContext('2d')!
          originalCanvas.value.width = img.width
          originalCanvas.value.height = img.height
          ctx.drawImage(img, 0, 0)
          
          // 更新图像信息
          imageInfo.width = img.width
          imageInfo.height = img.height
          imageInfo.format = currentFile.value.name.split('.').pop()?.toUpperCase() || 'Unknown'
          imageLoaded.value = true
          
          appStore.updateFileStatus(currentFile.value.id, true)
          ElMessage.success('图像加载成功')
        }
        URL.revokeObjectURL(imageUrl)
      }
      img.onerror = () => {
        ElMessage.error('图像加载失败')
        URL.revokeObjectURL(imageUrl)
      }
      img.src = imageUrl
    }
  } catch (error) {
    ElMessage.error('图像加载失败: ' + error)
  }
}

const processImage = () => {
  if (!originalCanvas.value || !imageLoaded.value) {
    ElMessage.warning('请先加载图像')
    return
  }

  try {
    const imageData = originalCanvas.value.getContext('2d')!.getImageData(
      0, 0, originalCanvas.value.width, originalCanvas.value.height
    )

    const config: MeshConfig = {
      type: meshConfig.type,
      density: meshConfig.density,
      adaptive: meshConfig.adaptive,
      adaptiveThreshold: meshConfig.adaptiveThreshold,
      edgeDetection: meshConfig.edgeDetection,
      edgeSensitivity: meshConfig.edgeSensitivity,
      smoothing: meshConfig.smoothing,
      qualityOptimization: meshConfig.qualityOptimization
    }

    meshResult.value = imageMeshGenerator.generateMesh(imageData, config)

    if (meshResult.value.success) {
      visualizeMesh()
      ElMessage.success('网格生成完成')
    } else {
      ElMessage.error('网格生成失败: ' + meshResult.value.error)
    }
  } catch (error) {
    ElMessage.error('网格生成失败: ' + error)
  }
}

const visualizeMesh = () => {
  if (!meshResult.value || !meshCanvas.value) return
  
  const ctx = meshCanvas.value.getContext('2d')!
  const width = 400
  const height = 300
  
  meshCanvas.value.width = width
  meshCanvas.value.height = height
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  // 绘制网格
  ctx.strokeStyle = '#409EFF'
  ctx.lineWidth = 1
  
  const nodes = meshResult.value.nodes
  const elements = meshResult.value.elements
  
  // 计算缩放比例
  const minX = Math.min(...nodes.map(n => n.x))
  const maxX = Math.max(...nodes.map(n => n.x))
  const minY = Math.min(...nodes.map(n => n.y))
  const maxY = Math.max(...nodes.map(n => n.y))
  
  const scaleX = (width - 40) / (maxX - minX)
  const scaleY = (height - 40) / (maxY - minY)
  const scale = Math.min(scaleX, scaleY)
  
  // 绘制单元
  elements.forEach(element => {
    ctx.beginPath()
    element.nodeIndices.forEach((nodeIndex, i) => {
      const node = nodes[nodeIndex]
      const x = 20 + (node.x - minX) * scale
      const y = 20 + (node.y - minY) * scale
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()
    ctx.stroke()
  })
  
  // 绘制节点
  ctx.fillStyle = '#F56C6C'
  nodes.forEach(node => {
    const x = 20 + (node.x - minX) * scale
    const y = 20 + (node.y - minY) * scale
    
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, 2 * Math.PI)
    ctx.fill()
  })
}

const onMeshTypeChange = () => {
  validateConfig()
}

const onAdaptiveChange = () => {
  if (!meshConfig.adaptive) {
    meshConfig.adaptiveThreshold = 0.1
  }
  validateConfig()
}

const validateConfig = () => {
  const errors: string[] = []
  
  if (meshConfig.density < 10 || meshConfig.density > 200) {
    errors.push('网格密度必须在10-200之间')
  }
  
  if (meshConfig.adaptive && (meshConfig.adaptiveThreshold < 0.01 || meshConfig.adaptiveThreshold > 1)) {
    errors.push('自适应阈值必须在0.01-1之间')
  }
  
  if (meshConfig.edgeSensitivity < 0.1 || meshConfig.edgeSensitivity > 2) {
    errors.push('边缘敏感度必须在0.1-2之间')
  }
  
  if (meshConfig.smoothing < 0 || meshConfig.smoothing > 10) {
    errors.push('平滑度必须在0-10之间')
  }
  
  meshConfig.isValid = errors.length === 0
  meshConfig.errorMessage = errors.join(', ')
}

const resetConfig = () => {
  meshConfig.type = 'triangular'
  meshConfig.density = 50
  meshConfig.adaptive = false
  meshConfig.adaptiveThreshold = 0.1
  meshConfig.edgeDetection = true
  meshConfig.edgeSensitivity = 1.0
  meshConfig.smoothing = 2.0
  meshConfig.qualityOptimization = true
  validateConfig()
}

const getQualityColor = (quality: number) => {
  if (quality >= 0.8) return '#67C23A'
  if (quality >= 0.6) return '#E6A23C'
  return '#F56C6C'
}

const formatFileSize = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const onOriginalImageLoad = () => {
  // 图像加载完成
}

const onImageError = () => {
  ElMessage.error('图像加载失败')
}

const saveToDatabase = async () => {
  if (!meshResult.value || !currentFile.value) return
  
  try {
    // 创建项目
    const project = await appStore.createProject({
      name: currentFile.value.name.replace('.tif', ''),
      description: `图像网格化项目 - ${currentFile.value.name}`,
      cif_file_path: currentFile.value.path
    })

    // 创建分析记录
    await appStore.createAnalysisRecord({
      project_id: project.id,
      analysis_type: 'image_mesh',
      parameters: JSON.stringify({
        meshType: meshConfig.type,
        density: meshConfig.density,
        nodes: meshResult.value.statistics.totalNodes,
        elements: meshResult.value.statistics.totalElements,
        quality: meshResult.value.statistics.averageQuality
      }),
      status: 'completed'
    })

    ElMessage.success('网格数据已保存到数据库')
  } catch (error) {
    ElMessage.error('保存到数据库失败: ' + error)
  }
}

const exportMesh = async () => {
  if (!meshResult.value || !currentFile.value) return
  
  try {
    const meshData = {
      fileName: currentFile.value.name,
      timestamp: new Date().toISOString(),
      config: meshConfig,
      result: meshResult.value
    }

    const fileName = `mesh_${currentFile.value.name.replace('.tif', '.json')}`
    const result = await window.electronAPI.saveFile(fileName, new TextEncoder().encode(JSON.stringify(meshData, null, 2)))

    if (result.success) {
      ElMessage.success('网格数据导出成功')
    } else {
      ElMessage.error('网格数据导出失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('网格数据导出失败: ' + error)
  }
}

watch(() => appStore.currentFile, (newFile) => {
  currentFile.value = newFile
  if (newFile && newFile.type === 'tif') {
    imageLoaded.value = false
    meshResult.value = null
  }
})

onMounted(() => {
  appStore.setStatus('图像网格化处理模块已就绪')
  validateConfig()
})
</script>

<style scoped>
.image-mesh-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header > div {
  display: flex;
  gap: 10px;
}

.no-file-selected {
  text-align: center;
  padding: 40px;
}

.image-workspace {
  min-height: 600px;
}

.image-display, .mesh-config, .mesh-visualization, .mesh-statistics {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.image-display h3, .mesh-config h3, .mesh-visualization h4, .mesh-statistics h4 {
  margin-bottom: 15px;
  color: #303133;
}

.image-container {
  position: relative;
  width: 100%;
  height: 300px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.image-container canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #909399;
}

.image-placeholder .el-icon {
  font-size: 48px;
}

.image-info {
  margin-top: 15px;
}

.config-status {
  margin-top: 15px;
}

.mesh-result {
  margin-top: 20px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
}

.mesh-result h3 {
  margin-bottom: 20px;
  color: #303133;
}

.quality-indicator {
  margin-top: 15px;
  text-align: center;
}

.quality-indicator span {
  display: block;
  margin-top: 10px;
  color: #606266;
  font-size: 14px;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-slider) {
  margin-top: 8px;
}
</style>