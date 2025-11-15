<template>
  <div class="cif-analysis-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>CIF解析与材料分析</span>
          <div>
            <el-button type="success" @click="analyzeMaterial" :disabled="!cifData.atoms.length">
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
            <div class="analysis-section">
              <h3>晶体结构参数</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="晶胞体积">{{ analysisResult.data.cellVolume.toFixed(3) }} Å³</el-descriptions-item>
                <el-descriptions-item label="密度">{{ analysisResult.data.density.toFixed(3) }} g/cm³</el-descriptions-item>
                <el-descriptions-item label="化学式">{{ analysisResult.data.formula }}</el-descriptions-item>
                <el-descriptions-item label="晶系">{{ analysisResult.data.symmetry.crystalSystem }}</el-descriptions-item>
                <el-descriptions-item label="空间群">{{ analysisResult.data.symmetry.spaceGroup }}</el-descriptions-item>
                <el-descriptions-item label="点群">{{ analysisResult.data.symmetry.pointGroup }}</el-descriptions-item>
              </el-descriptions>

              <h3>配位数</h3>
              <el-table :data="coordinationData" style="width: 100%" max-height="200">
                <el-table-column prop="element" label="元素" width="100">
                  <template #default="scope">
                    <el-tag :color="CifParser.getElementColor(scope.row.element)" effect="dark">
                      {{ scope.row.element }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="coordination" label="配位数" />
              </el-table>

              <h3>键长分析</h3>
              <el-table :data="analysisResult.data.bondLengths" style="width: 100%" max-height="200">
                <el-table-column prop="element1" label="原子1" width="80" />
                <el-table-column prop="element2" label="原子2" width="80" />
                <el-table-column prop="length" label="键长 (Å)" />
                <el-table-column prop="count" label="数量" />
              </el-table>

              <h3>键角分析</h3>
              <el-table :data="analysisResult.data.angles" style="width: 100%" max-height="200">
                <el-table-column prop="element1" label="原子1" width="80" />
                <el-table-column prop="element2" label="原子2" width="80" />
                <el-table-column prop="element3" label="原子3" width="80" />
                <el-table-column prop="angle" label="键角 (°)" />
                <el-table-column prop="count" label="数量" />
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="组成分析" name="composition">
            <div class="analysis-section">
              <h3>元素组成</h3>
              <el-table :data="compositionData" style="width: 100%">
                <el-table-column prop="element" label="元素" width="100">
                  <template #default="scope">
                    <el-tag :color="CifParser.getElementColor(scope.row.element)" effect="dark">
                      {{ scope.row.element }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="count" label="原子数" />
                <el-table-column prop="percentage" label="百分比 (%)" />
                <el-table-column prop="atomicWeight" label="原子量 (g/mol)" />
                <el-table-column prop="massContribution" label="质量贡献 (%)" />
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="相分析" name="phase" v-if="phaseAnalysisResult">
            <div class="analysis-section">
              <h3>相信息</h3>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="温度">{{ phaseAnalysisResult.data.stability.temperature }} K</el-descriptions-item>
                <el-descriptions-item label="压力">{{ phaseAnalysisResult.data.stability.pressure }} atm</el-descriptions-item>
                <el-descriptions-item label="吉布斯自由能">{{ phaseAnalysisResult.data.stability.gibbsEnergy.toFixed(3) }} kJ/mol</el-descriptions-item>
              </el-descriptions>

              <h3>识别的相</h3>
              <el-table :data="phaseAnalysisResult.data.phases" style="width: 100%">
                <el-table-column prop="name" label="相名称" />
                <el-table-column prop="fraction" label="相分数">
                  <template #default="scope">
                    {{ (scope.row.fraction * 100).toFixed(1) }}%
                  </template>
                </el-table-column>
                <el-table-column prop="spaceGroup" label="空间群" />
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- 原始CIF信息 -->
        <el-tabs v-model="activeTab" v-else>
          <el-tab-pane label="晶体结构信息" name="structure">
            <div class="cif-info">
              <h3>晶体结构信息</h3>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="文件名">{{ currentFile.name }}</el-descriptions-item>
                <el-descriptions-item label="化学式">{{ cifData.chemical_formula_sum || cifData.chemical_formula_moiety || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="晶体名称">{{ cifData.chemical_name || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="晶系">{{ cifData.crystal_system || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="空间群">{{ cifData.symmetry?.space_group_name_hm || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="晶胞参数">
                  <div v-if="cifData.cell_parameters">
                    a = {{ cifData.cell_parameters.a }} Å<br>
                    b = {{ cifData.cell_parameters.b }} Å<br>
                    c = {{ cifData.cell_parameters.c }} Å<br>
                    α = {{ cifData.cell_parameters.alpha }}°<br>
                    β = {{ cifData.cell_parameters.beta }}°<br>
                    γ = {{ cifData.cell_parameters.gamma }}°<br>
                    V = {{ cifData.cell_parameters.volume }} Å³
                  </div>
                  <span v-else>解析中...</span>
                </el-descriptions-item>
                <el-descriptions-item label="原子数量">{{ cifData.atoms.length }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="原子位置" name="atoms">
            <div class="atomic-positions">
              <h3>原子位置</h3>
              <el-table :data="cifData.atoms" style="width: 100%" max-height="400">
                <el-table-column prop="label" label="标签" width="100" />
                <el-table-column prop="element" label="元素" width="80">
                  <template #default="scope">
                    <el-tag :color="CifParser.getElementColor(scope.row.element)" effect="dark">
                      {{ scope.row.element }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="x" label="X" width="80" />
                <el-table-column prop="y" label="Y" width="80" />
                <el-table-column prop="z" label="Z" width="80" />
                <el-table-column prop="occupancy" label="占位率" width="80" />
                <el-table-column prop="thermal_factor" label="温度因子" width="100" />
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="action-buttons">
          <el-button @click="visualizeStructure">
            <el-icon><View /></el-icon>
            3D可视化
          </el-button>
          <el-button type="success" @click="saveToDatabase" :disabled="!analysisResult">
            <el-icon><FolderAdd /></el-icon>
            保存到数据库
          </el-button>
          <el-button type="primary" @click="saveAnalysis">
            <el-icon><Download /></el-icon>
            导出分析结果
          </el-button>
        </div>

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
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { CifParser, CifData } from '@/utils/cifParser'
import { materialAnalyzer, AnalysisResult } from '@/utils/materialAnalyzer'

const router = useRouter()
const appStore = useAppStore()

const currentFile = ref(appStore.currentFile)
const cifData = ref<CifData>({ atoms: [] })
const analysisResult = ref<AnalysisResult | null>(null)
const phaseAnalysisResult = ref<AnalysisResult | null>(null)
const activeTab = ref('structure')

// 计算配位数数据
const coordinationData = computed(() => {
  if (!analysisResult.value) return []
  
  const coordination = analysisResult.value.data.coordinationNumbers
  return Array.from(coordination.entries()).map(([element, coordination]) => ({
    element,
    coordination
  }))
})

// 计算组成数据
const compositionData = computed(() => {
  if (!analysisResult.value) return []
  
  const composition = analysisResult.value.data.composition
  const totalAtoms = Array.from(composition.values()).reduce((sum, count) => sum + count, 0)
  
  return Array.from(composition.entries()).map(([element, count]) => {
    const atomicWeight = materialAnalyzer['atomicWeights'].get(element) || 0
    const massContribution = (count * atomicWeight) / Array.from(composition.entries()).reduce((sum, [elem, cnt]) => 
      sum + cnt * (materialAnalyzer['atomicWeights'].get(elem) || 0), 0) * 100
    
    return {
      element,
      count,
      percentage: ((count / totalAtoms) * 100).toFixed(1),
      atomicWeight: atomicWeight.toFixed(3),
      massContribution: massContribution.toFixed(1)
    }
  })
})

const parseCif = async () => {
  if (!currentFile.value) return
  
  try {
    const result = await window.electronAPI.readFile(currentFile.value.path)
    if (result.success && result.data) {
      const cifText = new TextDecoder().decode(result.data)
      
      // 验证CIF文件
      const validation = CifParser.validateCifFile(cifText)
      if (!validation.valid) {
        ElMessage.error('CIF文件验证失败: ' + validation.errors.join(', '))
        return
      }
      
      // 解析CIF内容
      const parsed = CifParser.parse(cifText, currentFile.value.name)
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
    
    // 相分析
    phaseAnalysisResult.value = materialAnalyzer.analyzePhases(cifData.value)
    
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
    const result = await window.electronAPI.saveFile(fileName, new TextEncoder().encode(JSON.stringify(analysisData, null, 2)))
    
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

.cif-info, .atomic-positions, .analysis-section {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.cif-info h3, .atomic-positions h3, .analysis-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
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