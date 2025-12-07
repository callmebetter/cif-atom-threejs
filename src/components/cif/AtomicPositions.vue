<template>
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
</template>

<script setup lang="ts">
import { CifParser } from '@/utils/cifParser'

interface Props {
  cifData: {
    atoms: Array<{
      label: string
      element: string
      x: number
      y: number
      z: number
      occupancy: number
      thermal_factor: number
    }>
  }
}

const props = defineProps<Props>()
</script>

<style scoped>
.atomic-positions {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.atomic-positions h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>