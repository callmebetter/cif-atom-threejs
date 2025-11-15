<template>
  <div class="cif-analysis-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>CIF解析</span>
          <el-button type="primary" @click="parseCif" :disabled="!currentFile">
            <el-icon><Document /></el-icon>
            解析CIF
          </el-button>
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
        <el-row :gutter="20">
          <el-col :span="12">
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
          </el-col>
          
          <el-col :span="12">
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
          </el-col>
        </el-row>

        <div class="action-buttons">
          <el-button @click="visualizeStructure">
            <el-icon><View /></el-icon>
            3D可视化
          </el-button>
          <el-button type="primary" @click="saveAnalysis">
            <el-icon><Download /></el-icon>
            保存分析结果
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
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { CifParser, CifData } from '@/utils/cifParser'

const router = useRouter()
const appStore = useAppStore()

const currentFile = ref(appStore.currentFile)
const cifData = ref<CifData>({ atoms: [] })

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

const visualizeStructure = () => {
  if (cifData.value.atoms.length > 0) {
    router.push('/structure-visualization')
  } else {
    ElMessage.warning('请先解析CIF文件')
  }
}

const saveAnalysis = async () => {
  if (!currentFile.value) return
  
  try {
    const analysisData = {
      fileName: currentFile.value.name,
      timestamp: new Date().toISOString(),
      cifData: cifData.value
    }
    
    const fileName = `analysis_${currentFile.value.name.replace('.cif', '.json')}`
    const result = await window.electronAPI.saveFile(fileName, new TextEncoder().encode(JSON.stringify(analysisData, null, 2)))
    
    if (result.success) {
      ElMessage.success('分析结果保存成功')
    } else {
      ElMessage.error('分析结果保存失败: ' + result.error)
    }
  } catch (error) {
    ElMessage.error('分析结果保存失败: ' + error)
  }
}

watch(() => appStore.currentFile, (newFile) => {
  currentFile.value = newFile
  if (newFile && newFile.type === 'cif') {
    parseCif()
  }
})

onMounted(() => {
  appStore.setStatus('CIF解析模块已就绪')
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

.no-file-selected {
  text-align: center;
  padding: 40px;
}

.cif-workspace {
  min-height: 600px;
}

.cif-info, .atomic-positions {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.cif-info h3, .atomic-positions h3 {
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
</style>