<template>
  <div class="structure-visualization-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>3D结构可视化</span>
          <div class="header-actions">
            <el-button @click="resetView">
              <el-icon><Refresh /></el-icon>
              重置视图
            </el-button>
            <el-button type="primary" @click="exportImage">
              <el-icon><Camera /></el-icon>
              导出图像
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="!hasStructureData" class="no-data">
        <el-empty description="没有可显示的结构数据">
          <el-button type="primary" @click="$router.push('/cif-analysis')">
            去解析CIF文件
          </el-button>
        </el-empty>
      </div>

      <div v-else class="visualization-workspace">
        <el-row :gutter="20">
          <el-col :span="18">
            <div class="threejs-container">
              <div ref="threejsContainer" class="threejs-canvas"></div>
            </div>
          </el-col>
          
          <el-col :span="6">
            <div class="control-panel">
              <h4>显示控制</h4>
              
              <el-form label-width="80px" size="small">
                <el-form-item label="显示模式">
                  <el-radio-group v-model="displayMode" @change="updateDisplay">
                    <el-radio label="ball-stick">球棍模型</el-radio>
                    <el-radio label="space-filling">空间填充</el-radio>
                    <el-radio label="wireframe">线框模型</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <el-form-item label="原子大小">
                  <el-slider
                    v-model="atomSize"
                    :min="0.5"
                    :max="2"
                    :step="0.1"
                    @change="updateAtomSize"
                  />
                </el-form-item>
                
                <el-form-item label="键粗细">
                  <el-slider
                    v-model="bondThickness"
                    :min="0.1"
                    :max="1"
                    :step="0.1"
                    @change="updateBondThickness"
                  />
                </el-form-item>
                
                <el-form-item label="旋转速度">
                  <el-slider
                    v-model="rotationSpeed"
                    :min="0"
                    :max="0.05"
                    :step="0.005"
                    @change="updateRotationSpeed"
                  />
                </el-form-item>
                
                <el-form-item label="背景色">
                  <el-color-picker v-model="backgroundColor" @change="updateBackgroundColor" />
                </el-form-item>
              </el-form>

              <div class="element-filters">
                <h5>元素显示</h5>
                <el-checkbox-group v-model="visibleElements" @change="updateElementVisibility">
                  <el-checkbox v-for="element in availableElements" :key="element" :label="element">
                    {{ element }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'

const appStore = useAppStore()

const threejsContainer = ref<HTMLElement>()
const hasStructureData = ref(false)
const displayMode = ref('ball-stick')
const atomSize = ref(1)
const bondThickness = ref(0.3)
const rotationSpeed = ref(0.01)
const backgroundColor = ref('#ffffff')
const visibleElements = ref<string[]>([])

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let animationId: number
let atoms: THREE.Group[] = []
let bonds: THREE.Line[] = []

const availableElements = ref(['C', 'H', 'O', 'N', 'S', 'P', 'Fe', 'Cu', 'Zn'])

const elementColors: Record<string, number> = {
  'C': 0x404040,
  'H': 0xffffff,
  'O': 0xff0000,
  'N': 0x0000ff,
  'S': 0xffff00,
  'P': 0xffa500,
  'Fe': 0xff8c00,
  'Cu': 0xb87333,
  'Zn': 0x7f8c8d
}

const initThreeJS = () => {
  if (!threejsContainer.value) return

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(backgroundColor.value)

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    threejsContainer.value.clientWidth / threejsContainer.value.clientHeight,
    0.1,
    1000
  )
  camera.position.set(10, 10, 10)
  camera.lookAt(0, 0, 0)

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(threejsContainer.value.clientWidth, threejsContainer.value.clientHeight)
  threejsContainer.value.appendChild(renderer.domElement)

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(10, 10, 10)
  scene.add(directionalLight)

  // 添加控制器
  addControls()

  // 开始动画循环
  animate()
}

const addControls = () => {
  // 这里应该添加OrbitControls，但为了简化暂时不实现
  // 实际项目中需要安装和导入three/examples/jsm/controls/OrbitControls
}

const createMolecule = () => {
  // 清除现有原子和键
  atoms.forEach(atom => scene.remove(atom))
  bonds.forEach(bond => scene.remove(bond))
  atoms = []
  bonds = []

  // 创建示例分子结构（实际项目中应该从CIF数据创建）
  const moleculeData = [
    { element: 'C', x: 0, y: 0, z: 0 },
    { element: 'H', x: 1, y: 0, z: 0 },
    { element: 'O', x: 0, y: 1, z: 0 },
    { element: 'N', x: 0, y: 0, z: 1 }
  ]

  // 创建原子
  moleculeData.forEach(atom => {
    if (visibleElements.value.includes(atom.element)) {
      const geometry = new THREE.SphereGeometry(0.5 * atomSize.value, 32, 32)
      const material = new THREE.MeshPhongMaterial({ 
        color: elementColors[atom.element] || 0x808080 
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(atom.x, atom.y, atom.z)
      
      const group = new THREE.Group()
      group.add(sphere)
      scene.add(group)
      atoms.push(group)
    }
  })

  // 创建键
  const bondsData = [
    [0, 1], [0, 2], [0, 3] // C-H, C-O, C-N bonds
  ]

  bondsData.forEach(([start, end]) => {
    const startAtom = moleculeData[start]
    const endAtom = moleculeData[end]
    
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startAtom.x, startAtom.y, startAtom.z),
      new THREE.Vector3(endAtom.x, endAtom.y, endAtom.z)
    ])
    
    const material = new THREE.LineBasicMaterial({ 
      color: 0x808080,
      linewidth: bondThickness.value
    })
    
    const line = new THREE.Line(geometry, material)
    scene.add(line)
    bonds.push(line)
  })
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  // 自动旋转
  if (rotationSpeed.value > 0) {
    atoms.forEach(atom => {
      atom.rotation.y += rotationSpeed.value
    })
  }

  renderer.render(scene, camera)
}

const resetView = () => {
  camera.position.set(10, 10, 10)
  camera.lookAt(0, 0, 0)
  ElMessage.success('视图已重置')
}

const updateDisplay = () => {
  createMolecule()
}

const updateAtomSize = () => {
  createMolecule()
}

const updateBondThickness = () => {
  createMolecule()
}

const updateRotationSpeed = () => {
  // 速度会在animate函数中自动应用
}

const updateBackgroundColor = () => {
  if (scene) {
    scene.background = new THREE.Color(backgroundColor.value)
  }
}

const updateElementVisibility = () => {
  createMolecule()
}

const exportImage = () => {
  if (!renderer) return
  
  const dataURL = renderer.domElement.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = 'structure-visualization.png'
  link.href = dataURL
  link.click()
  
  ElMessage.success('图像导出成功')
}

const handleResize = () => {
  if (!threejsContainer.value || !camera || !renderer) return
  
  camera.aspect = threejsContainer.value.clientWidth / threejsContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(threejsContainer.value.clientWidth, threejsContainer.value.clientHeight)
}

onMounted(async () => {
  appStore.setStatus('3D结构可视化模块已就绪')
  
  // 检查是否有结构数据
  hasStructureData.value = true // 暂时设为true，实际应该检查appStore中的数据
  
  visibleElements.value = availableElements.value.slice(0, 5) // 默认显示前5个元素
  
  await nextTick()
  initThreeJS()
  createMolecule()
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (renderer) {
    renderer.dispose()
  }
  
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.structure-visualization-container {
  max-width: 1600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.no-data {
  text-align: center;
  padding: 40px;
}

.visualization-workspace {
  min-height: 700px;
}

.threejs-container {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.threejs-canvas {
  width: 100%;
  height: 600px;
}

.control-panel {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
  height: fit-content;
}

.control-panel h4 {
  margin-bottom: 15px;
  color: #303133;
}

.element-filters {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.element-filters h5 {
  margin-bottom: 10px;
  color: #606266;
  font-size: 14px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>