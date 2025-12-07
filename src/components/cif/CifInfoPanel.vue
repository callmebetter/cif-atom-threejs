<template>
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
</template>

<script setup lang="ts">
interface Props {
  currentFile: { name: string }
  cifData: {
    chemical_formula_sum?: string
    chemical_formula_moiety?: string
    chemical_name?: string
    crystal_system?: string
    symmetry?: { space_group_name_hm?: string }
    cell_parameters?: {
      a: number
      b: number
      c: number
      alpha: number
      beta: number
      gamma: number
      volume: number
    }
    atoms: any[]
  }
}

const props = defineProps<Props>()
</script>

<style scoped>
.cif-info {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.cif-info h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>