<template>
  <div class="analysis-section">
    <h3>元素组成</h3>
    <el-table :data="compositionData" style="width: 100%">
      <el-table-column prop="element" label="元素" width="100">
        <template #default="scope">
          <el-tag :color="getElementColor(scope.row.element)" effect="dark">
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CifParser } from '@/utils/cifParser'

interface Props {
  analysisResult: {
    data: {
      composition: Map<string, number>
    }
  }
  materialAnalyzer: any
}

const props = defineProps<Props>()

const compositionData = computed(() => {
  const composition = props.analysisResult.data.composition
  const totalAtoms = Array.from(composition.values()).reduce((sum, count) => sum + count, 0)
  
  return Array.from(composition.entries()).map(([element, count]) => {
    const atomicWeight = props.materialAnalyzer['atomicWeights'].get(element) || 0
    const massContribution = (count * atomicWeight) / Array.from(composition.entries()).reduce((sum, [elem, cnt]) => 
      sum + cnt * (props.materialAnalyzer['atomicWeights'].get(elem) || 0), 0) * 100
    
    return {
      element,
      count,
      percentage: ((count / totalAtoms) * 100).toFixed(1),
      atomicWeight: atomicWeight.toFixed(3),
      massContribution: massContribution.toFixed(1)
    }
  })
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