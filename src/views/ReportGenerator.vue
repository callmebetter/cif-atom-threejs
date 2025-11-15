<template>
  <div class="report-generator-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报告生成器</span>
          <div>
            <el-button type="success" @click="generateReport" :disabled="!selectedTemplate || !reportData.title">
              <el-icon><Document /></el-icon>
              生成报告
            </el-button>
            <el-button type="primary" @click="previewReport">
              <el-icon><View /></el-icon>
              预览报告
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20">
        <!-- 左侧：模板选择和配置 -->
        <el-col :span="8">
          <div class="template-selection">
            <h3>选择报告模板</h3>
            <el-radio-group v-model="selectedTemplateId" @change="onTemplateChange">
              <div v-for="template in templates" :key="template.id" class="template-option">
                <el-radio :label="template.id">
                  <div class="template-info">
                    <div class="template-name">{{ template.name }}</div>
                    <div class="template-description">{{ template.description }}</div>
                  </div>
                </el-radio>
              </div>
            </el-radio-group>
          </div>

          <div class="report-config" v-if="selectedTemplate">
            <h3>报告配置</h3>
            <el-form :model="reportData" label-width="80px" size="default">
              <el-form-item label="标题">
                <el-input v-model="reportData.title" placeholder="请输入报告标题" />
              </el-form-item>
              <el-form-item label="作者">
                <el-input v-model="reportData.author" placeholder="请输入作者名称" />
              </el-form-item>
              <el-form-item label="描述">
                <el-input 
                  v-model="reportData.description" 
                  type="textarea" 
                  :rows="3"
                  placeholder="请输入报告描述"
                />
              </el-form-item>
            </el-form>

            <h4>导出选项</h4>
            <el-form :model="exportOptions" label-width="80px" size="default">
              <el-form-item label="格式">
                <el-select v-model="exportOptions.format">
                  <el-option label="HTML" value="html" />
                  <el-option label="PDF" value="pdf" />
                  <el-option label="JSON" value="json" />
                  <el-option label="CSV" value="csv" />
                </el-select>
              </el-form-item>
              <el-form-item label="包含图像">
                <el-switch v-model="exportOptions.includeImages" />
              </el-form-item>
              <el-form-item label="包含图表">
                <el-switch v-model="exportOptions.includeCharts" />
              </el-form-item>
            </el-form>
          </div>
        </el-col>

        <!-- 右侧：内容编辑 -->
        <el-col :span="16">
          <div class="content-editor" v-if="selectedTemplate">
            <h3>报告内容</h3>
            <el-tabs v-model="activeSection" type="card">
              <el-tab-pane 
                v-for="(section, index) in selectedTemplate.sections" 
                :key="index"
                :label="section.title"
                :name="String(index)"
              >
                <div class="section-editor">
                  <div class="section-header">
                    <span class="section-title">{{ section.title }}</span>
                    <el-tag v-if="section.required" type="danger" size="small">必填</el-tag>
                  </div>

                  <!-- 文本内容编辑 -->
                  <div v-if="section.type === 'text'" class="text-editor">
                    <el-input
                      v-model="reportSections[index].content"
                      type="textarea"
                      :rows="8"
                      :placeholder="section.placeholder || '请输入文本内容...'"
                    />
                  </div>

                  <!-- 表格内容编辑 -->
                  <div v-else-if="section.type === 'table'" class="table-editor">
                    <div class="table-actions">
                      <el-button size="small" @click="addTableRow(index)">
                        <el-icon><Plus /></el-icon>
                        添加行
                      </el-button>
                      <el-button size="small" @click="loadTableData(index)">
                        <el-icon><Download /></el-icon>
                        加载数据
                      </el-button>
                    </div>
                    <el-table :data="reportSections[index].content" border style="width: 100%">
                      <el-table-column 
                        v-for="(column, colIndex) in getTableColumns(index)"
                        :key="colIndex"
                        :prop="column"
                        :label="column"
                      >
                        <template #default="scope">
                          <el-input 
                            v-model="scope.row[column]"
                            size="small"
                            placeholder="请输入"
                          />
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="80">
                        <template #default="scope">
                          <el-button 
                            size="small" 
                            type="danger" 
                            @click="removeTableRow(index, scope.$index)"
                          >
                            删除
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>

                  <!-- 图像内容编辑 -->
                  <div v-else-if="section.type === 'image'" class="image-editor">
                    <div class="image-upload">
                      <el-upload
                        class="upload-demo"
                        drag
                        :auto-upload="false"
                        :on-change="(file) => handleImageUpload(file, index)"
                        accept="image/*"
                      >
                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                        <div class="el-upload__text">
                          拖拽图片到此处或 <em>点击上传</em>
                        </div>
                        <template #tip>
                          <div class="el-upload__tip">
                            支持 jpg/png/gif 格式，文件大小不超过 10MB
                          </div>
                        </template>
                      </el-upload>
                    </div>
                    <div v-if="reportSections[index].content" class="image-preview">
                      <img :src="reportSections[index].content" alt="预览" />
                      <el-button size="small" type="danger" @click="removeImage(index)">
                        删除图片
                      </el-button>
                    </div>
                  </div>

                  <!-- 图表内容编辑 -->
                  <div v-else-if="section.type === 'chart'" class="chart-editor">
                    <div class="chart-config">
                      <el-form label-width="80px" size="small">
                        <el-form-item label="图表类型">
                          <el-select v-model="chartConfigs[index].type">
                            <el-option label="柱状图" value="bar" />
                            <el-option label="饼图" value="pie" />
                            <el-option label="折线图" value="line" />
                          </el-select>
                        </el-form-item>
                        <el-form-item label="数据源">
                          <el-select v-model="chartConfigs[index].dataSource" @change="loadChartData(index)">
                            <el-option label="元素组成" value="composition" />
                            <el-option label="网格质量" value="meshQuality" />
                            <el-option label="自定义" value="custom" />
                          </el-select>
                        </el-form-item>
                      </el-form>
                    </div>
                    <div class="chart-preview" ref="chartContainer"></div>
                  </div>

                  <!-- 总结内容编辑 -->
                  <div v-else-if="section.type === 'summary'" class="summary-editor">
                    <el-input
                      v-model="reportSections[index].content"
                      type="textarea"
                      :rows="6"
                      placeholder="请输入总结内容..."
                    />
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>

          <div v-else class="no-template-selected">
            <el-empty description="请先选择一个报告模板">
              <el-button type="primary" @click="focusTemplateSelection">
                选择模板
              </el-button>
            </el-empty>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 预览对话框 -->
    <el-dialog v-model="previewVisible" title="报告预览" width="80%" top="5vh">
      <div class="preview-container" v-html="previewContent"></div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="downloadPreview">下载预览</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { reportGenerator, type ReportTemplate, type ReportData, type ExportOptions } from '@/utils/reportGenerator'

const appStore = useAppStore()

const templates = ref<ReportTemplate[]>([])
const selectedTemplateId = ref('')
const selectedTemplate = computed(() => 
  templates.value.find(t => t.id === selectedTemplateId.value)
)
const activeSection = ref('0')
const previewVisible = ref(false)
const previewContent = ref('')

const reportData = ref<ReportData>({
  title: '',
  author: '系统用户',
  date: new Date().toLocaleDateString('zh-CN'),
  description: '',
  sections: []
})

const exportOptions = ref<ExportOptions>({
  format: 'html',
  includeImages: true,
  includeCharts: true
})

const reportSections = ref<any[]>([])
const chartConfigs = ref<any[]>([])

const onTemplateChange = () => {
  if (!selectedTemplate.value) return
  
  // 初始化报告章节
  reportSections.value = selectedTemplate.value.sections.map(section => ({
    title: section.title,
    type: section.type,
    content: section.type === 'table' ? [] : '',
    required: section.required
  }))
  
  // 初始化图表配置
  chartConfigs.value = selectedTemplate.value.sections
    .filter(section => section.type === 'chart')
    .map(() => ({
      type: 'bar',
      dataSource: 'composition'
    }))
  
  // 设置默认标题
  if (!reportData.value.title) {
    reportData.value.title = selectedTemplate.value.name
  }
}

const getTableColumns = (sectionIndex: number) => {
  const section = reportSections.value[sectionIndex]
  if (!section.content || section.content.length === 0) {
    return ['列1', '列2', '列3']
  }
  return Object.keys(section.content[0])
}

const addTableRow = (sectionIndex: number) => {
  const section = reportSections.value[sectionIndex]
  if (!section.content) {
    section.content = []
  }
  
  const columns = getTableColumns(sectionIndex)
  const newRow: any = {}
  columns.forEach(column => {
    newRow[column] = ''
  })
  
  section.content.push(newRow)
}

const removeTableRow = (sectionIndex: number, rowIndex: number) => {
  const section = reportSections.value[sectionIndex]
  if (section.content && section.content.length > rowIndex) {
    section.content.splice(rowIndex, 1)
  }
}

const loadTableData = async (sectionIndex: number) => {
  try {
    // 根据章节类型加载相应的数据
    const section = selectedTemplate.value.sections[sectionIndex]
    let data = []
    
    if (section.title.includes('晶体结构')) {
      data = await loadCrystalStructureData()
    } else if (section.title.includes('网格')) {
      data = await loadMeshData()
    } else if (section.title.includes('晶胞')) {
      data = await loadCellParameters()
    } else if (section.title.includes('原子')) {
      data = await loadAtomicPositions()
    }
    
    reportSections.value[sectionIndex].content = data
    ElMessage.success('数据加载成功')
  } catch (error) {
    ElMessage.error('数据加载失败: ' + error)
  }
}

const loadCrystalStructureData = async () => {
  // 从应用状态或数据库加载晶体结构数据
  return [
    { 参数: '空间群', 值: 'P21/c', 单位: '' },
    { 参数: '晶胞体积', 值: '1234.5', 单位: 'Å³' },
    { 参数: '密度', 值: '2.34', 单位: 'g/cm³' },
    { 参数: 'Z值', 值: '4', 单位: '' }
  ]
}

const loadMeshData = async () => {
  // 从应用状态加载网格数据
  return [
    { 统计项: '总节点数', 值: '1234' },
    { 统计项: '总单元数', 值: '2345' },
    { 统计项: '边界节点', 值: '156' },
    { 统计项: '平均质量', 值: '0.85' }
  ]
}

const loadCellParameters = async () => {
  return [
    { 参数: 'a', 值: '5.123', 单位: 'Å' },
    { 参数: 'b', 值: '6.456', 单位: 'Å' },
    { 参数: 'c', 值: '7.789', 单位: 'Å' },
    { 参数: 'α', 值: '90.0', 单位: '°' },
    { 参数: 'β', 值: '101.5', 单位: '°' },
    { 参数: 'γ', 值: '90.0', 单位: '°' }
  ]
}

const loadAtomicPositions = async () => {
  return [
    { 原子: 'Fe', x: '0.000', y: '0.000', z: '0.000' },
    { 原子: 'O', x: '0.250', y: '0.250', z: '0.250' },
    { 原子: 'Si', x: '0.500', y: '0.500', z: '0.500' }
  ]
}

const handleImageUpload = (file: any, sectionIndex: number) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    reportSections.value[sectionIndex].content = e.target?.result as string
  }
  reader.readAsDataURL(file.raw)
}

const removeImage = (sectionIndex: number) => {
  reportSections.value[sectionIndex].content = ''
}

const loadChartData = (sectionIndex: number) => {
  // 根据数据源加载图表数据
  const config = chartConfigs.value[sectionIndex]
  // 这里可以实现具体的图表数据加载逻辑
  ElMessage.info(`正在加载${config.dataSource}数据...`)
}

const generateReport = async () => {
  if (!selectedTemplate.value) {
    ElMessage.warning('请先选择报告模板')
    return
  }

  try {
    // 构建完整的报告数据
    const fullReportData: ReportData = {
      ...reportData.value,
      sections: reportSections.value.map((section, index) => ({
        title: section.title,
        type: section.type,
        content: section.content
      }))
    }

    // 生成报告
    const reportContent = reportGenerator.generateReport(fullReportData, exportOptions.value)
    
    // 下载报告
    const fileName = `${reportData.value.title}_${new Date().toISOString().split('T')[0]}.${exportOptions.value.format}`
    const blob = new Blob([reportContent], { 
      type: exportOptions.value.format === 'html' ? 'text/html' : 'text/plain' 
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('报告生成成功')
  } catch (error) {
    ElMessage.error('报告生成失败: ' + error)
  }
}

const previewReport = () => {
  if (!selectedTemplate.value) {
    ElMessage.warning('请先选择报告模板')
    return
  }

  try {
    const fullReportData: ReportData = {
      ...reportData.value,
      sections: reportSections.value.map((section, index) => ({
        title: section.title,
        type: section.type,
        content: section.content
      }))
    }

    const htmlContent = reportGenerator.generateReport(fullReportData, {
      format: 'html',
      includeImages: true,
      includeCharts: true
    })
    
    previewContent.value = htmlContent
    previewVisible.value = true
  } catch (error) {
    ElMessage.error('预览生成失败: ' + error)
  }
}

const downloadPreview = () => {
  const blob = new Blob([previewContent.value], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `报告预览_${new Date().toISOString().split('T')[0]}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const focusTemplateSelection = () => {
  // 聚焦到模板选择区域
  document.querySelector('.template-selection')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  appStore.setStatus('报告生成器已就绪')
  
  // 加载可用模板
  templates.value = reportGenerator.getTemplates()
  
  // 设置默认作者
  if (appStore.currentProject) {
    reportData.value.author = appStore.currentProject.name
  }
})
</script>

<style scoped>
.report-generator-container {
  max-width: 1600px;
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

.template-selection, .report-config, .content-editor {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
}

.template-selection h3, .report-config h3, .content-editor h3 {
  margin-bottom: 15px;
  color: #303133;
}

.template-option {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: all 0.3s;
}

.template-option:hover {
  border-color: #409EFF;
  background-color: #f0f9ff;
}

.template-info {
  margin-left: 20px;
}

.template-name {
  font-weight: 600;
  color: #303133;
  margin-bottom: 5px;
}

.template-description {
  font-size: 12px;
  color: #606266;
}

.report-config h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #303133;
}

.no-template-selected {
  text-align: center;
  padding: 40px;
}

.section-editor {
  min-height: 400px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.section-title {
  font-weight: 600;
  color: #303133;
}

.text-editor, .table-editor, .image-editor, .chart-editor, .summary-editor {
  margin-top: 10px;
}

.table-actions {
  margin-bottom: 15px;
}

.table-actions .el-button {
  margin-right: 10px;
}

.image-upload {
  margin-bottom: 20px;
}

.image-preview {
  text-align: center;
  margin-top: 15px;
}

.image-preview img {
  max-width: 300px;
  max-height: 200px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  margin-bottom: 10px;
}

.chart-config {
  margin-bottom: 20px;
}

.chart-preview {
  height: 300px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.preview-container {
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
}

:deep(.el-tabs__content) {
  padding: 20px 0;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>