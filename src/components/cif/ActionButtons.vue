<template>
  <div class="action-buttons">
    <el-button @click="onVisualize">
      <el-icon><View /></el-icon>
      3D可视化
    </el-button>
    <el-button type="success" @click="onSaveToDatabase" :disabled="!analysisResult">
      <el-icon><FolderAdd /></el-icon>
      保存到数据库
    </el-button>
    <el-button type="primary" @click="onSaveAnalysis">
      <el-icon><Download /></el-icon>
      导出分析结果
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { View, FolderAdd, Download } from '@element-plus/icons-vue'

interface Props {
  analysisResult: any
  currentFile: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  visualize: []
  saveToDatabase: []
  saveAnalysis: []
}>()

const onVisualize = () => {
  emit('visualize')
}

const onSaveToDatabase = () => {
  emit('saveToDatabase')
}

const onSaveAnalysis = () => {
  emit('saveAnalysis')
}
</script>

<style scoped>
.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
}
</style>