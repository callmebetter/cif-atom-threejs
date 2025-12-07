<template>
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
          <el-tag :color="getElementColor(scope.row.element)" effect="dark">
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CifParser } from '@/utils/cifParser'

interface Props {
  analysisResult: {
    data: {
      cellVolume: number
      density: number
      formula: string
      symmetry: {
        crystalSystem: string
        spaceGroup: string
        pointGroup: string
      }
      bondLengths: Array<{
        element1: string
        element2: string
        length: number
        count: number
      }>
      angles: Array<{
        element1: string
        element2: string
        element3: string
        angle: number
        count: number
      }>
      composition: Map<string, number>
    }
  }
}

const props = defineProps<Props>()

const coordinationData = computed(() => {
  // This would be calculated from the analysis result
  // For now, we'll create a mock based on composition
  console.log(`props.analysisResult.data.composition, `, props.analysisResult)
  return Array.from(props.analysisResult.data.composition.entries()).map(([element]) => ({
    element,
    coordination: Math.floor(Math.random() * 8) + 2 // Mock coordination number
  }))
})

const getElementColor = (element: string) => {
  return CifParser.getElementColor(element)
}
</script>

<style scoped>
.analysis-section {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.analysis-section h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>