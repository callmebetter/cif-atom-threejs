import * as THREE from 'three'
import { CifData, CifAtom } from './cifParser'

export interface VisualizationOptions {
  showBonds?: boolean
  showLabels?: boolean
  atomScale?: number
  bondRadius?: number
  backgroundColor?: number
  cameraDistance?: number
  autoRotate?: boolean
}

export class CrystalStructureVisualizer {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private controls: any
  private container: HTMLElement
  private atoms: THREE.Group[] = []
  private bonds: THREE.Line[] = []
  private labels: THREE.Sprite[] = []
  private animationId: number | null = null

  constructor(container: HTMLElement, options: VisualizationOptions = {}) {
    this.container = container
    this.initScene(options)
    this.initCamera(options)
    this.initRenderer()
    this.initControls()
    this.initLights()
  }

  private initScene(options: VisualizationOptions) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(options.backgroundColor || 0xf0f0f0)
  }

  private initCamera(options: VisualizationOptions) {
    const aspect = this.container.clientWidth / this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
    this.camera.position.z = options.cameraDistance || 50
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)
  }

  private initControls() {
    // 动态导入 OrbitControls
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05
      this.controls.enableZoom = true
      this.controls.enableRotate = true
      this.controls.enablePan = true
    })
  }

  private initLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    this.scene.add(directionalLight)

    // 点光源
    const pointLight = new THREE.PointLight(0xffffff, 0.5)
    pointLight.position.set(-10, -10, -5)
    this.scene.add(pointLight)
  }

  visualizeStructure(cifData: CifData, options: VisualizationOptions = {}) {
    this.clearStructure()
    
    if (!cifData.atoms || cifData.atoms.length === 0) {
      console.warn('No atoms to visualize')
      return
    }

    // 计算晶胞中心和缩放因子
    const { center, scale } = this.calculateStructureBounds(cifData)
    
    // 创建原子
    this.createAtoms(cifData.atoms, center, scale, options)
    
    // 创建化学键
    if (options.showBonds !== false) {
      this.createBonds(cifData.atoms, center, scale, options)
    }
    
    // 创建标签
    if (options.showLabels) {
      this.createLabels(cifData.atoms, center, scale)
    }

    // 添加晶胞边框
    if (cifData.cell_parameters) {
      this.createUnitCell(cifData.cell_parameters, center, scale)
    }

    // 开始动画循环
    this.startAnimation(options.autoRotate)
  }

  private calculateStructureBounds(cifData: CifData): { center: THREE.Vector3, scale: number } {
    const positions = cifData.atoms.map(atom => new THREE.Vector3(atom.x, atom.y, atom.z))
    
    // 计算边界框
    const box = new THREE.Box3()
    positions.forEach(pos => box.expandByPoint(pos))
    
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z)
    const scale = maxDimension > 0 ? 20 / maxDimension : 1 // 标准化到合适的显示大小
    
    return { center, scale }
  }

  private createAtoms(atoms: CifAtom[], center: THREE.Vector3, scale: number, options: VisualizationOptions) {
    const atomScale = options.atomScale || 1.0
    
    atoms.forEach((atom, index) => {
      const geometry = new THREE.SphereGeometry(
        this.getAtomicRadius(atom.element) * atomScale * scale * 0.3,
        32,
        16
      )
      
      const material = new THREE.MeshPhongMaterial({
        color: this.getElementColor(atom.element),
        shininess: 100,
        specular: 0x222222
      })
      
      const sphere = new THREE.Mesh(geometry, material)
      
      // 设置位置（相对于中心）
      sphere.position.set(
        (atom.x - center.x) * scale,
        (atom.y - center.y) * scale,
        (atom.z - center.z) * scale
      )
      
      sphere.castShadow = true
      sphere.receiveShadow = true
      sphere.userData = { atom, index }
      
      this.scene.add(sphere)
      this.atoms.push(sphere as any)
    })
  }

  private createBonds(atoms: CifAtom[], center: THREE.Vector3, scale: number, options: VisualizationOptions) {
    const bondRadius = options.bondRadius || 0.1
    const maxBondDistance = 2.0 // 最大键长（Å）
    
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const atom1 = atoms[i]
        const atom2 = atoms[j]
        
        // 计算原子间距离
        const distance = Math.sqrt(
          Math.pow(atom1.x - atom2.x, 2) +
          Math.pow(atom1.y - atom2.y, 2) +
          Math.pow(atom1.z - atom2.z, 2)
        )
        
        // 判断是否形成化学键
        if (this.shouldCreateBond(atom1, atom2, distance, maxBondDistance)) {
          this.createBond(atom1, atom2, center, scale, bondRadius)
        }
      }
    }
  }

  private shouldCreateBond(atom1: CifAtom, atom2: CifAtom, distance: number, maxDistance: number): boolean {
    // 简单的键长判断逻辑
    const covalentRadiusSum = this.getCovalentRadius(atom1.element) + this.getCovalentRadius(atom2.element)
    return distance <= covalentRadiusSum * 1.2 && distance <= maxDistance
  }

  private createBond(atom1: CifAtom, atom2: CifAtom, center: THREE.Vector3, scale: number, radius: number) {
    const start = new THREE.Vector3(
      (atom1.x - center.x) * scale,
      (atom1.y - center.y) * scale,
      (atom1.z - center.z) * scale
    )
    
    const end = new THREE.Vector3(
      (atom2.x - center.x) * scale,
      (atom2.y - center.y) * scale,
      (atom2.z - center.z) * scale
    )
    
    const geometry = new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 8)
    const material = new THREE.MeshPhongMaterial({ color: 0x666666 })
    
    const cylinder = new THREE.Mesh(geometry, material)
    
    // 设置圆柱体的位置和方向
    const position = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    
    cylinder.position.copy(position)
    cylinder.lookAt(end)
    cylinder.rotateX(Math.PI / 2)
    
    this.scene.add(cylinder)
    this.bonds.push(cylinder as any)
  }

  private createLabels(atoms: CifAtom[], center: THREE.Vector3, scale: number) {
    atoms.forEach((atom) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.width = 64
      canvas.height = 64
      
      context.fillStyle = 'rgba(0, 0, 0, 0.8)'
      context.fillRect(0, 0, 64, 64)
      
      context.fillStyle = 'white'
      context.font = '16px Arial'
      context.textAlign = 'center'
      context.fillText(atom.element, 32, 36)
      
      const texture = new THREE.CanvasTexture(canvas)
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
      const sprite = new THREE.Sprite(spriteMaterial)
      
      sprite.position.set(
        (atom.x - center.x) * scale,
        (atom.y - center.y) * scale + 2,
        (atom.z - center.z) * scale
      )
      
      sprite.scale.set(2, 2, 1)
      
      this.scene.add(sprite)
      this.labels.push(sprite)
    })
  }

  private createUnitCell(cellParams: any, center: THREE.Vector3, scale: number) {
    const { a, b, c } = cellParams
    
    // 创建晶胞的8个顶点
    const vertices = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(a, 0, 0),
      new THREE.Vector3(0, b, 0),
      new THREE.Vector3(0, 0, c),
      new THREE.Vector3(a, b, 0),
      new THREE.Vector3(a, 0, c),
      new THREE.Vector3(0, b, c),
      new THREE.Vector3(a, b, c)
    ]
    
    // 转换为笛卡尔坐标并缩放
    const cartesianVertices = vertices.map(v => {
      const cart = this.fractionalToCartesian(v, cellParams)
      return new THREE.Vector3(
        (cart.x - center.x) * scale,
        (cart.y - center.y) * scale,
        (cart.z - center.z) * scale
      )
    })
    
    // 创建晶胞边框线
    const edges = [
      [0, 1], [0, 2], [0, 3], // 从原点出发的边
      [4, 1], [4, 2], [5, 1], [5, 3], // 连接的边
      [6, 2], [6, 3], [7, 4], [7, 5], [7, 6] // 最后的边
    ]
    
    edges.forEach(([start, end]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        cartesianVertices[start],
        cartesianVertices[end]
      ])
      const material = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 })
      const line = new THREE.Line(geometry, material)
      this.scene.add(line)
    })
  }

  private fractionalToCartesian(frac: THREE.Vector3, cellParams: any): THREE.Vector3 {
    const { a, b, c, alpha, beta, gamma } = cellParams
    const alphaRad = (alpha * Math.PI) / 180
    const betaRad = (beta * Math.PI) / 180
    const gammaRad = (gamma * Math.PI) / 180
    
    const x = frac.x * a + frac.y * b * Math.cos(gammaRad) + frac.z * c * Math.cos(betaRad)
    const y = frac.y * b * Math.sin(gammaRad) + frac.z * c * (Math.cos(alphaRad) - Math.cos(betaRad) * Math.cos(gammaRad)) / Math.sin(gammaRad)
    const z = frac.z * c * Math.sqrt(1 - Math.cos(alphaRad) ** 2 - Math.cos(betaRad) ** 2 - Math.cos(gammaRad) ** 2 + 2 * Math.cos(alphaRad) * Math.cos(betaRad) * Math.cos(gammaRad)) / Math.sin(gammaRad)
    
    return new THREE.Vector3(x, y, z)
  }

  private startAnimation(autoRotate = false) {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      
      if (this.controls) {
        this.controls.update()
      }
      
      if (autoRotate) {
        this.scene.rotation.y += 0.005
      }
      
      this.renderer.render(this.scene, this.camera)
    }
    
    animate()
  }

  private clearStructure() {
    // 清除原子
    this.atoms.forEach(atom => this.scene.remove(atom))
    this.atoms = []
    
    // 清除化学键
    this.bonds.forEach(bond => this.scene.remove(bond))
    this.bonds = []
    
    // 清除标签
    this.labels.forEach(label => this.scene.remove(label))
    this.labels = []
    
    // 停止动画
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private getElementColor(element: string): number {
    const colors: { [key: string]: number } = {
      'H': 0xFFFFFF, 'He': 0xD9FFFF, 'Li': 0xCC80FF, 'Be': 0xC2FF00,
      'B': 0xFFB5B5, 'C': 0x909090, 'N': 0x3050F8, 'O': 0xFF0D0D,
      'F': 0x90E050, 'Ne': 0xB3E3F5, 'Na': 0xAB5CF2, 'Mg': 0x8AFF00,
      'Al': 0xBFA6A6, 'Si': 0xF0C8A0, 'P': 0xFF8000, 'S': 0xFFFF30,
      'Cl': 0x1FF01F, 'Ar': 0x80D1E3, 'K': 0x8F40D4, 'Ca': 0x3DFF00,
      'Fe': 0xE06633, 'Cu': 0xC88033, 'Zn': 0x7D80B0, 'Au': 0xFFD123
    }
    return colors[element] || 0xFF69B4
  }

  private getAtomicRadius(element: string): number {
    const radii: { [key: string]: number } = {
      'H': 0.31, 'He': 0.28, 'Li': 1.28, 'Be': 0.96, 'B': 0.85,
      'C': 0.76, 'N': 0.71, 'O': 0.66, 'F': 0.57, 'Ne': 0.58,
      'Na': 1.66, 'Mg': 1.41, 'Al': 1.21, 'Si': 1.11, 'P': 1.07,
      'S': 1.05, 'Cl': 1.02, 'Ar': 1.06, 'K': 2.03, 'Ca': 1.76,
      'Fe': 1.26, 'Cu': 1.28, 'Zn': 1.34, 'Au': 1.44
    }
    return radii[element] || 1.0
  }

  private getCovalentRadius(element: string): number {
    const radii: { [key: string]: number } = {
      'H': 0.31, 'He': 0.28, 'Li': 1.28, 'Be': 0.96, 'B': 0.84,
      'C': 0.76, 'N': 0.71, 'O': 0.66, 'F': 0.57, 'Ne': 0.58,
      'Na': 1.66, 'Mg': 1.41, 'Al': 1.21, 'Si': 1.11, 'P': 1.07,
      'S': 1.05, 'Cl': 1.02, 'Ar': 1.06, 'K': 2.03, 'Ca': 1.76,
      'Fe': 1.26, 'Cu': 1.28, 'Zn': 1.34, 'Au': 1.44
    }
    return radii[element] || 1.0
  }

  resize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  destroy() {
    this.clearStructure()
    
    if (this.renderer) {
      this.renderer.dispose()
      this.container.removeChild(this.renderer.domElement)
    }
  }

  // 导出场景为图片
  exportImage(width = 1920, height = 1080): string {
    const originalSize = new THREE.Vector2(
      this.renderer.domElement.width,
      this.renderer.domElement.height
    )
    
    // 临时调整渲染器大小
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    
    // 渲染场景
    this.renderer.render(this.scene, this.camera)
    
    // 获取图片数据
    const dataURL = this.renderer.domElement.toDataURL('image/png')
    
    // 恢复原始大小
    this.renderer.setSize(originalSize.x, originalSize.y)
    this.camera.aspect = originalSize.x / originalSize.y
    this.camera.updateProjectionMatrix()
    
    return dataURL
  }
}