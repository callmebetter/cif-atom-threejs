<template>
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
</template>

<script setup lang="ts">
interface Props {
  phaseAnalysisResult: {
    data: {
      stability: {
        temperature: number
        pressure: number
        gibbsEnergy: number
      }
      phases: Array<{
        name: string
        fraction: number
        spaceGroup: string
      }>
    }
  }
}

const props = defineProps<Props>()
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