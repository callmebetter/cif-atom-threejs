<template>
  <div class="component-analysis-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>成分分析</span>
          <el-button type="primary" @click="startAnalysis" :loading="isAnalyzing">
            <el-icon><PieChart /></el-icon>
            开始分析
          </el-button>
        </div>
      </template>

      <div v-if="!hasImageData" class="no-data">
        <el-empty description="没有可分析的图像数据">
          <el-button type="primary" @click="$router.push('/image-processing')">
            去处理图像
          </el-button>
        </el-empty>
      </div>

      <div v-else class="analysis-workspace">
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="analysis-results">
              <h3>成分分析结果</h3>
              
              <el-tabs v-model="activeTab">
                <el-tab-pane label="元素组成" name="elements">
                  <div class="chart-container">
                    <canvas ref="elementChart" width="400" height="300"></canvas>
                  </div>
                  <el-table :data="elementData" style="width: 100%; margin-top: 20px;">
                    <el-table-column prop="element" label="元素" width="80" />
                    <el-table-column prop="percentage" label="百分比" width="100">
                      <template #default="{ row }">
                        {{ row.percentage.toFixed(2) }}%
                      </template>
                    </el-table-column>
                    <el-table-column prop="weight" label="重量" width="100" />
                    <el-table-column prop="atomicNumber" label="原子序数" width="100" />
                  </el-table>
                </el-tab-pane>
                
                <el-tab-pane label="相组成" name="phases">
                  <div class="chart-container">
                    <canvas ref="phaseChart" width="400" height="300"></canvas>
                  </div>
                  <el-table :data="phaseData" style="width: 100%; margin-top: 20px;">
                    <el-table-column prop="phase" label="相" width="120" />
                    <el-table-column prop="percentage" label="百分比" width="100">
                      <template #default="{ row }">
                        {{ row.percentage.toFixed(2) }}%
                      </template>
                    </el-table-column>
                    <el-table-column prop="crystalSystem" label="晶系" width="100" />
                  </el-table>
                </el-tab-pane>
                
                <el-tab-pane label="统计信息" name="statistics">
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="总像素数">{{ statistics.totalPixels }}</el-descriptions-item>
                    <el-descriptions-item label="有效像素数">{{ statistics.validPixels }}</el-descriptions-item>
                    <el-descriptions-item label="平均灰度值">{{ statistics.meanGrayValue }}</el-descriptions-item>
                    <el-descriptions-item label="标准差">{{ statistics.standardDeviation }}</el-descriptions-item>
                    <el-descriptions-item label="最小值">{{ statistics.minValue }}</el-descriptions-item>
                    <el-descriptions-item label="最大值">{{ statistics.maxValue }}</el-descriptions-item>
                  </el-descriptions>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-col>
          
          <el-col :span="12">
            <div class="analysis-settings">
              <h3>分析设置</h3>
              
              <el-form label-width="100px">
                <el-form-item label="分析方法">
                  <el-select v-model="analysisMethod" @change="updateAnalysis">
                    <el-option label="EDS能谱分析" value="eds" />
                    <el-option label="XRD衍射分析" value="xrd" />
                    <el-option label="图像分割" value="segmentation" />
                    <el-option label="机器学习" value="ml" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="阈值范围">
                  <el-row :gutter="10">
                    <el-col :span="12">
                      <el-input-number v-model="thresholdMin" :min="0" :max="255" />
                    </el-col>
                    <el-col :span="12">
                      <el-input-number v-model="thresholdMax" :min="0" :max="255" />
                    </el-col>
                  </el-row>
                </el-form-item>
                
                <el-form-item label="区域选择">
                  <el-button @click="selectRegion" :disabled="!hasImageData">
                    <el-icon><Crop /></el-icon>
                    选择分析区域
                  </el-button>
                </el-form-item>
                
                <el-form-item label="校准设置">
                  <el-switch v-model="enableCalibration" />
                  <div v-if="enableCalibration" style="margin-top: 10px;">
                    <el-input v-model="calibrationFactor" placeholder="校准系数" />
                  </div>
                </el-form-item>
                
                <el-form-item label="高级选项">
                  <el-checkbox-group v-model="advancedOptions">
                    <el-checkbox label="noise-reduction">降噪处理</el-checkbox>
                    <el-checkbox label="edge-enhancement">边缘增强</el-checkbox>
                    <el-checkbox label="background-subtraction">背景扣除</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-form>

              <div class="action-buttons">
                <el-button @click="resetSettings">重置设置</el-button>
                <el-button type="primary" @click="exportResults">导出结果</el-button>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'

const appStore = useAppStore()

const elementChart = ref<HTMLCanvasElement>()
const phaseChart = ref<HTMLCanvasElement>()
const hasImageData = ref(false)
const isAnalyzing = ref(false)
const activeTab = ref('elements')

// 分析设置
const analysisMethod = ref('eds')
const thresholdMin = ref(0)
const thresholdMax = ref(255)
const enableCalibration = ref(false)
const calibrationFactor = ref('')
const advancedOptions = ref<string[]>([])

// 分析结果
const elementData = ref([
  { element: 'Fe', percentage: 65.5, weight: 55.85, atomicNumber: 26 },
  { element: 'C', percentage: 12.3, weight: 12.01, atomicNumber: 6 },
  { element: 'Si', percentage: 8.7, weight: 28.09, atomicNumber: 14 },
  { element: 'Mn', percentage: 5.2, weight: 54.94, atomicNumber: 25 },
  { element: 'Cr', percentage: 4.8, weight: 52.00, atomicNumber: 24 },
  { element: 'Ni', percentage: 3.5, weight: 58.69, atomicNumber: 28 }
])

const phaseData = ref([
  { phase: 'Ferrite', percentage: 45.2, crystalSystem: 'BCC' },
  { phase: 'Austenite', percentage: 32.8, crystalSystem: 'FCC' },
  { phase: 'Carbide', percentage: 15.5, crystalSystem: 'Orthorhombic' },
  { phase: 'Martensite', percentage: 6.5, crystalSystem: 'BCT' }
])

const statistics = ref({
  totalPixels: 1024000,
  validPixels: 980500,
  meanGrayValue: 128.5,
  standardDeviation: 45.2,
  minValue: 12,
  maxValue: 245
})

const startAnalysis = async () => {
  if (!hasImageData.value) {
    ElMessage.warning('请先加载图像数据')
    return
  }

  isAnalyzing.value = true
  appStore.setStatus('正在进行成分分析...')

  try {
    // 模拟分析过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 生成模拟数据
    generateAnalysisData()
    
    // 绘制图表
    await nextTick()
    drawCharts()
    
    ElMessage.success('成分分析完成')
    appStore.setStatus('成分分析完成')
  } catch (error) {
    ElMessage.error('成分分析失败: ' + error)
    appStore.setStatus('成分分析失败')
  } finally {
    isAnalyzing.value = false
  }
}

const generateAnalysisData = () => {
  // 生成随机分析数据（实际项目中应该基于真实图像分析）
  const elements = ['Fe', 'C', 'Si', 'Mn', 'Cr', 'Ni', 'Mo', 'V', 'Ti', 'Al']
  const total = 100
  
  elementData.value = elements.map((element, index) => {
    const percentage = Math.random() * 20 + 5
    return {
      element,
      percentage: Math.min(percentage, total - elementData.value.reduce((sum, e) => sum + e.percentage, 0)),
      weight: 55.85 + Math.random() * 50,
      atomicNumber: 20 + index
    }
  }).slice(0, 6)

  // 标准化百分比
  const elementSum = elementData.value.reduce((sum, e) => sum + e.percentage, 0)
  elementData.value.forEach(e => {
    e.percentage = (e.percentage / elementSum) * 100
  })
}

const drawCharts = () => {
  if (elementChart.value) {
    drawPieChart(elementChart.value, elementData.value, '元素组成')
  }
  
  if (phaseChart.value) {
    drawPieChart(phaseChart.value, phaseData.value, '相组成')
  }
}

const drawPieChart = (canvas: HTMLCanvasElement, data: any[], title: string) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3

  // 清除画布
  ctx.clearRect(0, 0, width, height)

  // 绘制标题
  ctx.font = '16px Arial'
  ctx.fillStyle = '#333'
  ctx.textAlign = 'center'
  ctx.fillText(title, centerX, 20)

  // 颜色数组
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']

  // 绘制饼图
  let currentAngle = -Math.PI / 2
  const total = data.reduce((sum, item) => sum + item.percentage, 0)

  data.forEach((item, index) => {
    const sliceAngle = (item.percentage / total) * 2 * Math.PI
    
    // 绘制扇形
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
    ctx.lineTo(centerX, centerY)
    ctx.fillStyle = colors[index % colors.length]
    ctx.fill()
    
    // 绘制标签
    const labelAngle = currentAngle + sliceAngle / 2
    const labelX = centerX + Math.cos(labelAngle) * (radius + 20)
    const labelY = centerY + Math.sin(labelAngle) * (radius + 20)
    
    ctx.font = '12px Arial'
    ctx.fillStyle = '#333'
    ctx.textAlign = 'center'
    ctx.fillText(`${item.element || item.phase}`, labelX, labelY)
    ctx.fillText(`${item.percentage.toFixed(1)}%`, labelX, labelY + 15)
    
    currentAngle += sliceAngle
  })
}

const selectRegion = () => {
  ElMessage.info('区域选择功能开发中...')
}

const updateAnalysis = () => {
  // 根据分析方法更新界面
  ElMessage.info(`已切换到${analysisMethod.value}分析方法`)
}

const resetSettings = () => {
  analysisMethod.value = 'eds'
  thresholdMin.value = 0
  thresholdMax.value = 255
  enableCalibration.value = false
  calibrationFactor.value = ''
  advancedOptions.value = []
  ElMessage.success('设置已重置')
}

const exportResults = async () => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      method: analysisMethod.value,
      elements: elementData.value,
      phases: phaseData.value,
      statistics: statistics.value
    }
    
    const fileName = `component-analysis-${Date.now()}.json`
    const result = await window.electronAPI.saveFile(fileName, new TextEncoder().encode(JSON.stringify(results, null, 2)))
    
    if (result.success) {
      ElMessage.success('分析结果导出成功')
    } else {
      ElMessage.error('分析结果导出失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('分析结果导出失败: ' + error)
  }
}

onMounted(() => {
  appStore.setStatus('成分分析模块已就绪')
  hasImageData.value = true // 暂时设为true，实际应该检查是否有图像数据
  
  // 延迟绘制图表
  setTimeout(() => {
    drawCharts()
  }, 100)
})
</script>

<style scoped>
.component-analysis-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-data {
  text-align: center;
  padding: 40px;
}

.analysis-workspace {
  min-height: 600px;
}

.analysis-results, .analysis-settings {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.analysis-results h3, .analysis-settings h3 {
  margin-bottom: 15px;
  color: #303133;
}

.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
}

:deep(.el-tabs__content) {
  padding-top: 20px;
}

:deep(.el-descriptions) {
  margin-top: 20px;
}
</style>