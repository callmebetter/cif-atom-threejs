<template>
  <div class="structure-visualization-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>3D结构可视化</span>
          <div class="header-actions">
            <el-button @click="resetView">
              <el-icon><Refresh /></el-icon>
              重置视图
            </el-button>
            <el-button type="primary" @click="exportImage">
              <el-icon><Camera /></el-icon>
              导出图像
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="!hasStructureData" class="no-data">
        <el-empty description="没有可显示的结构数据">
          <el-button type="primary" @click="$router.push('/cif-analysis')">
            去解析CIF文件
          </el-button>
        </el-empty>
      </div>

      <div v-else class="visualization-workspace">
        <el-row :gutter="20">
          <el-col :span="18">
            <div class="threejs-container">
              <div ref="threejsContainer" class="threejs-canvas"></div>
            </div>
          </el-col>
          
          <el-col :span="6">
            <div class="control-panel">
              <h4>显示控制</h4>
              
              <el-form label-width="80px" size="small">
                <el-form-item label="显示模式">
                  <el-radio-group v-model="displayMode" @change="updateDisplay">
                    <el-radio label="ball-stick">球棍模型</el-radio>
                    <el-radio label="space-filling">空间填充</el-radio>
                    <el-radio label="wireframe">线框模型</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <el-form-item label="原子大小">
                  <el-slider
                    v-model="atomSize"
                    :min="0.5"
                    :max="2"
                    :step="0.1"
                    @change="updateAtomSize"
                  />
                </el-form-item>
                
                <el-form-item label="键粗细">
                  <el-slider
                    v-model="bondThickness"
                    :min="0.1"
                    :max="1"
                    :step="0.1"
                    @change="updateBondThickness"
                  />
                </el-form-item>
                
                <el-form-item label="旋转速度">
                  <el-slider
                    v-model="rotationSpeed"
                    :min="0"
                    :max="0.05"
                    :step="0.005"
                    @change="updateRotationSpeed"
                  />
                </el-form-item>
                
                <el-form-item label="背景色">
                  <el-color-picker v-model="backgroundColor" @change="updateBackgroundColor" />
                </el-form-item>
              </el-form>

              <div class="element-filters">
                <h5>元素显示</h5>
                <el-checkbox-group v-model="visibleElements" @change="updateElementVisibility">
                  <el-checkbox v-for="element in availableElements" :key="element" :label="element">
                    {{ element }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { StructureVisualizer, VisualizationOptions } from '@/utils/structureVisualizer'
import { CifData } from '@/utils/cifParser'

const appStore = useAppStore()

const threejsContainer = ref<HTMLElement>()
const hasStructureData = ref(false)
const displayMode = ref<'ball-stick' | 'space-filling' | 'wireframe'>('ball-stick')
const atomSize = ref(1)
const bondThickness = ref(0.3)
const rotationSpeed = ref(0)
const backgroundColor = ref('#ffffff')
const visibleElements = ref<string[]>([])

let visualizer: StructureVisualizer | null = null
let currentCifData: CifData | null = null

const availableElements = ref(['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Fe', 'Cu', 'Zn'])

const initVisualizer = () => {
  if (!threejsContainer.value) return

  const options: VisualizationOptions = {
    displayMode: displayMode.value,
    atomSize: atomSize.value,
    bondThickness: bondThickness.value,
    rotationSpeed: rotationSpeed.value,
    backgroundColor: backgroundColor.value,
    visibleElements: visibleElements.value
  }

  visualizer = new StructureVisualizer(threejsContainer.value, options)
  
  // 如果有CIF数据，加载结构
  if (currentCifData) {
    visualizer.loadStructure(currentCifData)
  }
}

const loadCifData = () => {
  try {
    // 从appStore获取CIF数据
    const cifData = appStore.cifData
    
    if (!cifData) {
      throw new Error('CIF数据不存在')
    }
    
    if (!cifData.atoms || !Array.isArray(cifData.atoms)) {
      throw new Error('CIF数据中缺少原子信息')
    }
    
    if (cifData.atoms.length === 0) {
      throw new Error('CIF数据中没有原子')
    }
    
    currentCifData = cifData
    hasStructureData.value = true
    
    // 获取实际存在的元素
    const elements = [...new Set(cifData.atoms.map(atom => atom.element))]
    if (elements.length === 0) {
      throw new Error('无法从原子数据中提取元素信息')
    }
    
    availableElements.value = elements
    
    // 默认显示所有元素
    visibleElements.value = elements
    
    if (!visualizer) {
      throw new Error('可视化器未初始化')
    }
    
    try {
      visualizer.loadStructure(cifData)
      console.log(`成功加载 ${cifData.atoms.length} 个原子的结构`)
    } catch (vizError) {
      const vizErrorMessage = vizError instanceof Error ? vizError.message : '可视化加载失败'
      console.error('Visualization error:', vizErrorMessage)
      throw new Error(`可视化加载失败: ${vizErrorMessage}`)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '加载CIF数据时发生未知错误'
    console.error('Failed to load CIF data:', errorMessage)
    hasStructureData.value = false
    ElMessage.error(`加载CIF数据失败: ${errorMessage}`)
  }
}

const resetView = () => {
  if (visualizer) {
    visualizer.resetView()
    ElMessage.success('视图已重置')
  }
}

const updateDisplay = () => {
  if (visualizer) {
    visualizer.updateOptions({ displayMode: displayMode.value })
  }
}

const updateAtomSize = () => {
  if (visualizer) {
    visualizer.updateOptions({ atomSize: atomSize.value })
  }
}

const updateBondThickness = () => {
  if (visualizer) {
    visualizer.updateOptions({ bondThickness: bondThickness.value })
  }
}

const updateRotationSpeed = () => {
  if (visualizer) {
    visualizer.updateOptions({ rotationSpeed: rotationSpeed.value })
  }
}

const updateBackgroundColor = () => {
  if (visualizer) {
    visualizer.updateOptions({ backgroundColor: backgroundColor.value })
  }
}

const updateElementVisibility = () => {
  if (visualizer) {
    visualizer.updateOptions({ visibleElements: visibleElements.value })
  }
}

const exportImage = () => {
  if (!visualizer) {
    ElMessage.error('可视化器未初始化')
    return
  }
  
  try {
    const dataURL = visualizer.exportImage(1920, 1080)
    const link = document.createElement('a')
    link.download = 'crystal-structure.png'
    link.href = dataURL
    link.click()
    
    ElMessage.success('图像导出成功')
  } catch (error) {
    console.error('Export failed:', error)
    ElMessage.error('图像导出失败')
  }
}

onMounted(async () => {
  appStore.setStatus('3D结构可视化模块已就绪')
  
  // 加载CIF数据
  loadCifData()
  
  await nextTick()
  initVisualizer()
})

onUnmounted(() => {
  if (visualizer) {
    visualizer.dispose()
    visualizer = null
  }
})

// 监听appStore中的cifData变化
watch(() => appStore.cifData, (newData) => {
  if (newData) {
    loadCifData()
  }
}, { deep: true })
</script>

<style scoped>
.structure-visualization-container {
  max-width: 1600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.no-data {
  text-align: center;
  padding: 40px;
}

.visualization-workspace {
  min-height: 700px;
}

.threejs-container {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.threejs-canvas {
  width: 100%;
  height: 600px;
}

.control-panel {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  height: fit-content;
}

.control-panel h4 {
  margin-bottom: 15px;
  color: #303133;
}

.element-filters {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.element-filters h5 {
  margin-bottom: 10px;
  color: #606266;
  font-size: 14px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>