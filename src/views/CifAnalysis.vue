<template>
  <div class="cif-analysis-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>CIF解析与材料分析</span>
          <div>
            <el-button type="success" @click="analyzeMaterial" :disabled="!cifAtoms.length">
              <el-icon><DataAnalysis /></el-icon>
              材料分析
            </el-button>
            <el-button type="primary" @click="parseCif" :disabled="!currentFile">
              <el-icon><Document /></el-icon>
              解析CIF
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="!currentFile" class="no-file-selected">
        <el-empty description="请先选择一个CIF文件">
          <el-button type="primary" @click="$router.push('/upload')">
            去上传文件
          </el-button>
        </el-empty>
      </div>

      <div v-else class="cif-workspace">
        <!-- 材料分析结果 -->
        <el-tabs v-model="activeTab" v-if="analysisResult">
          <el-tab-pane label="晶体结构分析" name="structure">
            <CrystalStructureAnalysis :analysis-result="analysisResult" />
          </el-tab-pane>

          <el-tab-pane label="组成分析" name="composition">
            <CompositionAnalysis 
              :analysis-result="analysisResult" 
              :material-analyzer="materialAnalyzer" 
            />
          </el-tab-pane>

          <el-tab-pane label="相分析" name="phase" v-if="phaseAnalysisResult">
            <PhaseAnalysis :phase-analysis-result="phaseAnalysisResult" />
          </el-tab-pane>
        </el-tabs>

        <!-- 原始CIF信息 -->
        <el-tabs v-model="activeTab" v-else>
          <el-tab-pane label="晶体结构信息" name="structure">
            <CifInfoPanel 
              :current-file="currentFile" 
              :cif-data="cifData" 
            />
          </el-tab-pane>
          
          <el-tab-pane label="原子位置" name="atoms">
            <AtomicPositions :cif-data="cifData" />
          </el-tab-pane>
        </el-tabs>

        <ActionButtons 
          :analysis-result="analysisResult" 
          :current-file="currentFile"
          @visualize="visualizeStructure"
          @save-to-database="saveToDatabase"
          @save-analysis="saveAnalysis"
        />

        <!-- 解析警告 -->
        <div v-if="cifData.metadata?.warnings.length > 0" class="warnings">
          <el-alert
            title="解析警告"
            type="warning"
            :closable="false"
            show-icon
          >
            <ul>
              <li v-for="warning in cifData.metadata.warnings" :key="warning">
                {{ warning }}
              </li>
            </ul>
          </el-alert>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CifParser, parseAll } from '@/utils/cifParser'
import { materialAnalyzer } from '@/utils/materialAnalyzer'
import { fileOperations } from '@/platform/sdk'

// Import components
import CifInfoPanel from '@/components/cif/CifInfoPanel.vue'
import AtomicPositions from '@/components/cif/AtomicPositions.vue'
import CrystalStructureAnalysis from '@/components/cif/CrystalStructureAnalysis.vue'
import CompositionAnalysis from '@/components/cif/CompositionAnalysis.vue'
import PhaseAnalysis from '@/components/cif/PhaseAnalysis.vue'
import ActionButtons from '@/components/cif/ActionButtons.vue'

const appStore = useAppStore()
const router = useRouter()

const cifData = ref({
  header: '',
  cell: null as unknown,
  symmetry: null as unknown,
  atoms: [] as unknown[],
  metadata: {
    warnings: [] as string[]
  }
})
const cifAtoms = computed(() => cifData.value.atoms)
const currentFile = ref(appStore.currentFile)
const analysisResult = ref<unknown>(null)
const phaseAnalysisResult = ref<unknown>(null)
const activeTab = ref('info')
const loading = ref(false)

const parseCif = async () => {
  if (!currentFile.value) return
  
  try {
    const result = await fileOperations.readFile(currentFile.value.path)
    if (result.success && result.data) {
      const cifText = new TextDecoder().decode(result.data)
      console.log(`cifText, `,      CifParser.parseAll(cifText)
)
      // 验证CIF文件
      const validation = CifParser.validateCifFile(cifText)
      if (!validation.valid) {
        ElMessage.error('CIF文件验证失败: ' + validation.errors.join(', '))
        return
      }
      // 解析CIF内容
      const parsed = CifParser.parse(cifText, currentFile.value.name)
      console.log(`parsed, `, parsed)
      cifData.value = parsed
      appStore.updateFileStatus(currentFile.value.id, true)
      appStore.setCifData(parsed)
      
      // 显示解析信息
      const message = `解析成功: ${parsed.atoms.length} 个原子`
      if (parsed.metadata?.warnings.length > 0) {
        ElMessage.warning(`${message} (${parsed.metadata.warnings.length} 个警告)`)
      } else {
        ElMessage.success(message)
      }
    }
  } catch (error) {
    ElMessage.error('CIF文件解析失败: ' + error)
  }
}

const analyzeMaterial = () => {
  if (!cifData.value.atoms.length) {
    ElMessage.warning('请先解析CIF文件')
    return
  }

  try {
    // 晶体结构分析
    analysisResult.value = materialAnalyzer.analyzeCrystalStructure(cifData.value)
    console.log(`analysisResult.value, `,analysisResult.value)
    // 相分析
    phaseAnalysisResult.value = materialAnalyzer.analyzePhases(cifData.value)
    console.log(`analysisResult.value, `,phaseAnalysisResult.value)
    if (analysisResult.value.success && phaseAnalysisResult.value.success) {
      ElMessage.success('材料分析完成')
      activeTab.value = 'structure'
    } else {
      ElMessage.error('材料分析失败')
    }
  } catch (error) {
    ElMessage.error('材料分析失败: ' + error)
  }
}

const visualizeStructure = () => {
  if (cifData.value.atoms.length > 0) {
    router.push('/structure-visualization')
  } else {
    ElMessage.warning('请先解析CIF文件')
  }
}

const saveToDatabase = async () => {
  if (!analysisResult.value || !currentFile.value) return
  
  try {
    // 创建项目
    const project = await appStore.createProject({
      name: currentFile.value.name.replace('.cif', ''),
      description: `晶体结构分析项目 - ${currentFile.value.name}`,
      cif_file_path: currentFile.value.path
    })
    
    // 创建分析记录
    await appStore.createAnalysisRecord({
      project_id: project.id,
      analysis_type: 'crystal_structure',
      parameters: JSON.stringify({
        cellVolume: analysisResult.value.data.cellVolume,
        density: analysisResult.value.data.density,
        formula: analysisResult.value.data.formula
      }),
      status: 'completed'
    })
    
    ElMessage.success('分析结果已保存到数据库')
  } catch (error) {
    ElMessage.error('保存到数据库失败: ' + error)
  }
}

const saveAnalysis = async () => {
  if (!currentFile.value) return
  
  try {
    const analysisData = {
      fileName: currentFile.value.name,
      timestamp: new Date().toISOString(),
      cifData: cifData.value,
      analysisResult: analysisResult.value,
      phaseAnalysisResult: phaseAnalysisResult.value
    }
    
    const fileName = `analysis_${currentFile.value.name.replace('.cif', '.json')}`
    const result = await fileOperations.saveFile(fileName, new TextEncoder().encode(JSON.stringify(analysisData, null, 2)))
    
    if (result.success) {
      ElMessage.success('分析结果导出成功')
    } else {
      ElMessage.error('分析结果导出失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('分析结果导出失败: ' + error)
  }
}

watch(() => appStore.currentFile, (newFile) => {
  currentFile.value = newFile
  if (newFile && newFile.type === 'cif') {
    parseCif()
  }
})

onMounted(() => {
  appStore.setStatus('CIF解析与材料分析模块已就绪')
  if (currentFile.value && currentFile.value.type === 'cif') {
    parseCif()
  }
})
</script>

<style scoped>
.cif-analysis-container {
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

.cif-workspace {
  min-height: 600px;
}

.warnings {
  margin-top: 20px;
}

.warnings ul {
  margin: 0;
  padding-left: 20px;
}

.warnings li {
  margin-bottom: 5px;
}

:deep(.el-tabs__content) {
  padding-top: 20px;
}
</style>