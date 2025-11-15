import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CifData } from './cifParser'

export interface VisualizationOptions {
  displayMode: 'ball-stick' | 'space-filling' | 'wireframe'
  atomSize: number
  bondThickness: number
  rotationSpeed: number
  backgroundColor: string
  visibleElements: string[]
}

export interface AtomMesh {
  mesh: THREE.Mesh
  element: string
  position: THREE.Vector3
}

export interface BondMesh {
  line: THREE.Line
  startAtom: number
  endAtom: number
}

export class StructureVisualizer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private container: HTMLElement
  private animationId: number | null = null
  
  private atoms: AtomMesh[] = []
  private bonds: BondMesh[] = []
  private options: VisualizationOptions
  
  private elementColors: Record<string, number> = {
    'H': 0xffffff, 'He': 0xd9ffff, 'Li': 0xcc80ff, 'Be': 0xc2ff00,
    'B': 0xffb5b5, 'C': 0x909090, 'N': 0x3050f8, 'O': 0xff0d0d,
    'F': 0x90e050, 'Ne': 0xb3e3f5, 'Na': 0xab5cf2, 'Mg': 0x8aff00,
    'Al': 0xbfa6a6, 'Si': 0xf0c8a0, 'P': 0xff8000, 'S': 0xffff30,
    'Cl': 0x1ff01f, 'Ar': 0x80d1e3, 'K': 0x8f40d4, 'Ca': 0x3dff00,
    'Sc': 0xe6e6e6, 'Ti': 0xbfc2c7, 'V': 0xa6a6ab, 'Cr': 0x8a99c7,
    'Mn': 0x9c7ac7, 'Fe': 0xe06633, 'Co': 0xf090a0, 'Ni': 0x50d050,
    'Cu': 0xc88033, 'Zn': 0x7d80b0, 'Ga': 0xc28f8f, 'Ge': 0x668f8f,
    'As': 0xbd80e3, 'Se': 0xffa100, 'Br': 0xa62929, 'Kr': 0x5cb8d1,
    'Rb': 0x702eb0, 'Sr': 0x00ff00, 'Y': 0x94ffff, 'Zr': 0x94e0e0,
    'Nb': 0x73c2c9, 'Mo': 0x54b5b5, 'Tc': 0x3b9e9e, 'Ru': 0x248f8f,
    'Rh': 0x0a7d8c, 'Pd': 0x006985, 'Ag': 0xc0c0c0, 'Cd': 0xffd98f,
    'In': 0xa67573, 'Sn': 0x668080, 'Sb': 0x9e63b5, 'Te': 0xd47a00,
    'I': 0x940094, 'Xe': 0x429eb0, 'Cs': 0x57178f, 'Ba': 0x00c900,
    'La': 0x70d4ff, 'Ce': 0xffffc7, 'Pr': 0xd9ffc7, 'Nd': 0xc7ffc7,
    'Pm': 0xa3ffc7, 'Sm': 0x8fffc7, 'Eu': 0x61ffc7, 'Gd': 0x45ffc7,
    'Tb': 0x30ffc7, 'Dy': 0x1fffc7, 'Ho': 0x00ff9c, 'Er': 0x00e675,
    'Tm': 0x00d452, 'Yb': 0x00bf38, 'Lu': 0x00ab24, 'Hf': 0x4dc2ff,
    'Ta': 0x4da6ff, 'W': 0x2194d6, 'Re': 0x267dab, 'Os': 0x266696,
    'Ir': 0x175487, 'Pt': 0xd0d0e0, 'Au': 0xffd123, 'Hg': 0xb8b8d0,
    'Tl': 0xa6544d, 'Pb': 0x575961, 'Bi': 0x9e4fb5, 'Po': 0xab5c00,
    'At': 0x754f45, 'Rn': 0x428296, 'Fr': 0x420066, 'Ra': 0x007d00,
    'Ac': 0x70abfa, 'Th': 0x00baff, 'Pa': 0x00a1ff, 'U': 0x008fff,
    'Np': 0x0080ff, 'Pu': 0x006bff, 'Am': 0x545cf2, 'Cm': 0x785ce3,
    'Bk': 0x8a4fe3, 'Cf': 0xa136d4, 'Es': 0xb31fd4, 'Fm': 0xb31fba,
    'Md': 0xb30da6, 'No': 0xbd0d87, 'Lr': 0xc70066, 'Rf': 0xcc0059,
    'Db': 0xd1004f, 'Sg': 0xd90045, 'Bh': 0xe00038, 'Hs': 0xe6002e,
    'Mt': 0xeb0026, 'Ds': 0x000000, 'Rg': 0x000000, 'Cn': 0x000000,
    'Fl': 0x000000, 'Lv': 0x000000, 'Ts': 0x000000, 'Og': 0x000000
  }

  private elementRadii: Record<string, number> = {
    'H': 0.31, 'He': 0.28, 'Li': 1.28, 'Be': 0.96, 'B': 0.84, 'C': 0.76,
    'N': 0.71, 'O': 0.66, 'F': 0.57, 'Ne': 0.58, 'Na': 1.66, 'Mg': 1.41,
    'Al': 1.21, 'Si': 1.11, 'P': 1.07, 'S': 1.05, 'Cl': 1.02, 'Ar': 1.06,
    'K': 2.03, 'Ca': 1.76, 'Sc': 1.70, 'Ti': 1.60, 'V': 1.53, 'Cr': 1.39,
    'Mn': 1.50, 'Fe': 1.42, 'Co': 1.38, 'Ni': 1.24, 'Cu': 1.32, 'Zn': 1.22,
    'Ga': 1.22, 'Ge': 1.20, 'As': 1.19, 'Se': 1.16, 'Br': 1.14, 'Kr': 1.17,
    'Rb': 2.20, 'Sr': 1.95, 'Y': 1.90, 'Zr': 1.75, 'Nb': 1.64, 'Mo': 1.54,
    'Tc': 1.47, 'Ru': 1.46, 'Rh': 1.42, 'Pd': 1.39, 'Ag': 1.45, 'Cd': 1.44,
    'In': 1.42, 'Sn': 1.39, 'Sb': 1.39, 'Te': 1.38, 'I': 1.39, 'Xe': 1.40,
    'Cs': 2.44, 'Ba': 2.15, 'La': 2.07, 'Ce': 2.04, 'Pr': 2.03, 'Nd': 2.01,
    'Pm': 1.99, 'Sm': 1.98, 'Eu': 1.98, 'Gd': 1.96, 'Tb': 1.94, 'Dy': 1.92,
    'Ho': 1.92, 'Er': 1.89, 'Tm': 1.90, 'Yb': 1.87, 'Lu': 1.87, 'Hf': 1.75,
    'Ta': 1.70, 'W': 1.62, 'Re': 1.51, 'Os': 1.44, 'Ir': 1.41, 'Pt': 1.36,
    'Au': 1.36, 'Hg': 1.32, 'Tl': 1.45, 'Pb': 1.46, 'Bi': 1.48, 'Po': 1.40,
    'At': 1.50, 'Rn': 1.50, 'Fr': 2.60, 'Ra': 2.30, 'Ac': 2.15, 'Th': 2.06,
    'Pa': 2.00, 'U': 1.96, 'Np': 1.90, 'Pu': 1.84, 'Am': 1.80, 'Cm': 1.69
  }

  constructor(container: HTMLElement, options: VisualizationOptions) {
    this.container = container
    this.options = options
    this.initThreeJS()
  }

  private initThreeJS() {
    // 创建场景
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.options.backgroundColor)

    // 创建相机
    const aspect = this.container.clientWidth / this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
    this.camera.position.set(10, 10, 10)

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    // 添加控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.enableZoom = true
    this.controls.enableRotate = true
    this.controls.enablePan = true

    // 添加光源
    this.setupLights()

    // 开始动画循环
    this.animate()

    // 处理窗口大小变化
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  private setupLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    // 主光源
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight1.position.set(10, 10, 5)
    directionalLight1.castShadow = true
    directionalLight1.shadow.mapSize.width = 2048
    directionalLight1.shadow.mapSize.height = 2048
    this.scene.add(directionalLight1)

    // 补充光源
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight2.position.set(-10, -10, -5)
    this.scene.add(directionalLight2)

    // 点光源
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100)
    pointLight.position.set(0, 10, 0)
    this.scene.add(pointLight)
  }

  public loadStructure(cifData: CifData, options?: VisualizationOptions): void {
    try {
      if (!cifData) {
        throw new Error('CIF数据不能为空')
      }

      if (!cifData.atoms || !Array.isArray(cifData.atoms) || cifData.atoms.length === 0) {
        console.warn('没有原子数据，无法可视化结构')
        return
      }

      // Validate atom data structure
      const validAtoms = cifData.atoms.filter((atom: any) => {
        return atom && 
               typeof atom.x === 'number' && !isNaN(atom.x) &&
               typeof atom.y === 'number' && !isNaN(atom.y) &&
               typeof atom.z === 'number' && !isNaN(atom.z) &&
               atom.element && typeof atom.element === 'string'
      })

      if (validAtoms.length === 0) {
        throw new Error('没有有效的原子数据')
      }

      if (validAtoms.length < cifData.atoms.length) {
        console.warn(`过滤了 ${cifData.atoms.length - validAtoms.length} 个无效原子数据`)
      }

      this.clearStructure()
      
      if (options) {
        this.options = { ...this.options, ...options }
      }
      
      // 创建原子
      this.createAtoms(validAtoms)
      
      // 创建化学键
      this.createBonds(validAtoms)
      
      // 调整相机位置以适应结构
      this.fitCameraToStructure()
      
      console.log(`成功加载 ${validAtoms.length} 个原子的结构`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载结构时发生未知错误'
      console.error('Failed to load structure:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  private createAtoms(atoms: any[]) {
    atoms.forEach((atom, index) => {
      if (!this.options.visibleElements.includes(atom.element)) {
        return
      }

      const element = atom.element
      const position = new THREE.Vector3(
        atom.x || 0,
        atom.y || 0,
        atom.z || 0
      )

      let geometry: THREE.BufferGeometry
      let radius: number

      switch (this.options.displayMode) {
        case 'space-filling':
          radius = (this.elementRadii[element] || 1.0) * 0.5
          geometry = new THREE.SphereGeometry(radius * this.options.atomSize, 32, 32)
          break
        case 'wireframe':
          radius = 0.3
          geometry = new THREE.SphereGeometry(radius * this.options.atomSize, 8, 6)
          break
        case 'ball-stick':
        default:
          radius = 0.5
          geometry = new THREE.SphereGeometry(radius * this.options.atomSize, 32, 32)
          break
      }

      const material = new THREE.MeshPhongMaterial({
        color: this.elementColors[element] || 0x808080,
        shininess: 100,
        specular: 0x222222
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)
      mesh.castShadow = true
      mesh.receiveShadow = true

      // 添加原子标签
      const labelGeometry = new THREE.RingGeometry(0.1, 0.15, 32)
      const labelMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      })
      const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial)
      labelMesh.position.copy(position)
      labelMesh.position.y += radius * this.options.atomSize + 0.5

      const group = new THREE.Group()
      group.add(mesh)
      group.add(labelMesh)
      this.scene.add(group)

      this.atoms.push({
        mesh,
        element,
        position
      })
    })
  }

  private createBonds(atoms: any[]) {
    const bondLengthThreshold = 2.0 // 键长阈值

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const atom1 = atoms[i]
        const atom2 = atoms[j]

        const distance = Math.sqrt(
          Math.pow((atom1.x || 0) - (atom2.x || 0), 2) +
          Math.pow((atom1.y || 0) - (atom2.y || 0), 2) +
          Math.pow((atom1.z || 0) - (atom2.z || 0), 2)
        )

        if (distance < bondLengthThreshold) {
          this.createBond(atom1, atom2, i, j)
        }
      }
    }
  }

  private createBond(atom1: any, atom2: any, index1: number, index2: number) {
    const start = new THREE.Vector3(atom1.x || 0, atom1.y || 0, atom1.z || 0)
    const end = new THREE.Vector3(atom2.x || 0, atom2.y || 0, atom2.z || 0)

    let geometry: THREE.BufferGeometry

    switch (this.options.displayMode) {
      case 'wireframe':
        geometry = new THREE.BufferGeometry().setFromPoints([start, end])
        break
      case 'space-filling':
        // 空间填充模式下不显示键
        return
      case 'ball-stick':
      default:
        // 创建圆柱体作为键
        const direction = new THREE.Vector3().subVectors(end, start)
        const length = direction.length()
        const radius = this.options.bondThickness * 0.1

        geometry = new THREE.CylinderGeometry(radius, radius, length, 8)
        
        // 创建圆柱体并旋转到正确方向
        const cylinder = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
          color: 0x808080,
          shininess: 50
        }))
        
        cylinder.position.copy(start).add(direction.multiplyScalar(0.5))
        cylinder.lookAt(end)
        cylinder.rotateX(Math.PI / 2)
        
        this.scene.add(cylinder)
        this.bonds.push({
          line: cylinder as any,
          startAtom: index1,
          endAtom: index2
        })
        return
    }

    const material = new THREE.LineBasicMaterial({
      color: 0x808080,
      linewidth: this.options.bondThickness
    })

    const line = new THREE.Line(geometry, material)
    this.scene.add(line)
    this.bonds.push({
      line,
      startAtom: index1,
      endAtom: index2
    })
  }

  private fitCameraToStructure() {
    if (this.atoms.length === 0) return

    const box = new THREE.Box3()
    this.atoms.forEach(atom => {
      box.expandByPoint(atom.position)
    })

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    const distance = maxDim * 2
    this.camera.position.set(
      center.x + distance,
      center.y + distance,
      center.z + distance
    )
    this.camera.lookAt(center)
    this.controls.target.copy(center)
    this.controls.update()
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)

    // 自动旋转
    if (this.options.rotationSpeed > 0) {
      this.scene.rotation.y += this.options.rotationSpeed
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private handleResize = () => {
    const aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  public updateOptions(newOptions: Partial<VisualizationOptions>) {
    this.options = { ...this.options, ...newOptions }
    
    // 更新背景色
    if (newOptions.backgroundColor) {
      this.scene.background = new THREE.Color(newOptions.backgroundColor)
    }
    
    // 如果显示模式或原子大小改变，重新创建结构
    if (newOptions.displayMode || newOptions.atomSize || newOptions.visibleElements) {
      // 这里需要重新加载当前结构
      // 实际实现中应该保存当前的CIF数据并重新加载
    }
  }

  public clearStructure() {
    // 清除原子
    this.atoms.forEach(atom => {
      this.scene.remove(atom.mesh.parent || atom.mesh)
    })
    this.atoms = []

    // 清除键
    this.bonds.forEach(bond => {
      this.scene.remove(bond.line)
    })
    this.bonds = []
  }

  public resetView() {
    this.camera.position.set(10, 10, 10)
    this.camera.lookAt(0, 0, 0)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  public exportImage(width?: number, height?: number): string {
    const originalSize = this.renderer.getSize(new THREE.Vector2())
    
    if (width && height) {
      this.renderer.setSize(width, height)
    }
    
    this.renderer.render(this.scene, this.camera)
    const dataURL = this.renderer.domElement.toDataURL('image/png')
    
    // 恢复原始尺寸
    this.renderer.setSize(originalSize.x, originalSize.y)
    
    return dataURL
  }

  public dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    this.clearStructure()
    
    if (this.renderer) {
      this.renderer.dispose()
      this.container.removeChild(this.renderer.domElement)
    }
    
    window.removeEventListener('resize', this.handleResize.bind(this))
  }
}