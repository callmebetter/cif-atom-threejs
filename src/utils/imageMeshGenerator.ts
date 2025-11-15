export interface MeshNode {
  id: number
  x: number
  y: number
  z?: number
  boundary: boolean
}

export interface MeshElement {
  id: number
  type: 'triangle' | 'quad'
  nodeIndices: number[]
  area: number
  quality: number
}

export interface MeshConfig {
  type: 'triangular' | 'quadrilateral' | 'mixed'
  density: number
  adaptive: boolean
  adaptiveThreshold: number
  edgeDetection: boolean
  edgeSensitivity: number
  smoothing: number
  qualityOptimization: boolean
}

export interface MeshResult {
  success: boolean
  nodes: MeshNode[]
  elements: MeshElement[]
  statistics: {
    totalNodes: number
    totalElements: number
    boundaryNodes: number
    averageQuality: number
    minQuality: number
    maxQuality: number
    processingTime: number
  }
  config: MeshConfig
  error?: string
}

export class ImageMeshGenerator {
  generateMesh(imageData: ImageData, config: MeshConfig): MeshResult {
    const startTime = performance.now()
    
    try {
      // 预处理图像
      const processedImage = this.preprocessImage(imageData, config)
      
      // 检测边界
      const boundaries = this.detectBoundaries(processedImage, config)
      
      // 生成初始节点
      const nodes = this.generateNodes(processedImage, config, boundaries)
      
      // 生成网格单元
      const elements = this.generateElements(nodes, config, boundaries)
      
      // 优化网格质量
      if (config.qualityOptimization) {
        this.optimizeMesh(nodes, elements, config)
      }
      
      // 计算统计信息
      const statistics = this.calculateStatistics(nodes, elements, startTime)
      
      return {
        success: true,
        nodes,
        elements,
        statistics,
        config
      }
    } catch (error) {
      return {
        success: false,
        nodes: [],
        elements: [],
        statistics: {
          totalNodes: 0,
          totalElements: 0,
          boundaryNodes: 0,
          averageQuality: 0,
          minQuality: 0,
          maxQuality: 0,
          processingTime: performance.now() - startTime
        },
        config,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private preprocessImage(imageData: ImageData, config: MeshConfig): Float32Array {
    const { width, height, data } = imageData
    const processed = new Float32Array(width * height)
    
    // 转换为灰度图
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      processed[i] = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255.0
    }
    
    // 应用高斯滤波
    if (config.smoothing > 0) {
      this.applyGaussianFilter(processed, width, height, config.smoothing)
    }
    
    return processed
  }

  private applyGaussianFilter(image: Float32Array, width: number, height: number, sigma: number): void {
    const kernel = this.createGaussianKernel(sigma)
    const kernelSize = kernel.length
    const halfKernel = Math.floor(kernelSize / 2)
    const filtered = new Float32Array(image.length)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let weightSum = 0
        
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const nx = x + kx
            const ny = y + ky
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const weight = kernel[ky + halfKernel] * kernel[kx + halfKernel]
              sum += image[ny * width + nx] * weight
              weightSum += weight
            }
          }
        }
        
        filtered[y * width + x] = sum / weightSum
      }
    }
    
    // 复制过滤结果
    for (let i = 0; i < image.length; i++) {
      image[i] = filtered[i]
    }
  }

  private createGaussianKernel(sigma: number): Float32Array {
    const size = Math.ceil(3 * sigma) * 2 + 1
    const kernel = new Float32Array(size)
    const center = Math.floor(size / 2)
    let sum = 0
    
    for (let i = 0; i < size; i++) {
      const x = i - center
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma))
      sum += kernel[i]
    }
    
    // 归一化
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum
    }
    
    return kernel
  }

  private detectBoundaries(image: Float32Array, config: MeshConfig): boolean[] {
    const width = Math.sqrt(image.length)
    const height = width
    const boundaries = new Array(image.length).fill(false)
    
    if (!config.edgeDetection) {
      return boundaries
    }
    
    // 使用Sobel算子检测边缘
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx)
            const kernelIdx = (ky + 1) * 3 + (kx + 1)
            gx += image[idx] * sobelX[kernelIdx]
            gy += image[idx] * sobelY[kernelIdx]
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        boundaries[y * width + x] = magnitude > config.edgeSensitivity
      }
    }
    
    return boundaries
  }

  private generateNodes(image: Float32Array, config: MeshConfig, boundaries: boolean[]): MeshNode[] {
    const width = Math.sqrt(image.length)
    const height = width
    const nodes: MeshNode[] = []
    let nodeId = 0
    
    // 计算网格间距
    const spacing = Math.max(width, height) / config.density
    
    // 生成内部节点
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const idx = Math.floor(y) * width + Math.floor(x)
        
        // 自适应网格细化
        if (config.adaptive && this.shouldRefine(image, x, y, config.adaptiveThreshold)) {
          // 在当前单元格内生成更密集的节点
          const subSpacing = spacing / 2
          for (let sy = y; sy < Math.min(y + spacing, height); sy += subSpacing) {
            for (let sx = x; sx < Math.min(x + spacing, width); sx += subSpacing) {
              const subIdx = Math.floor(sy) * width + Math.floor(sx)
              nodes.push({
                id: nodeId++,
                x: sx,
                y: sy,
                boundary: boundaries[subIdx] || this.isOnBoundary(sx, sy, width, height)
              })
            }
          }
        } else {
          nodes.push({
            id: nodeId++,
            x: x,
            y: y,
            boundary: boundaries[idx] || this.isOnBoundary(x, y, width, height)
          })
        }
      }
    }
    
    // 确保边界节点
    this.ensureBoundaryNodes(nodes, width, height, boundaries, nodeId)
    
    return nodes
  }

  private shouldRefine(image: Float32Array, x: number, y: number, threshold: number): boolean {
    const width = Math.sqrt(image.length)
    const idx = Math.floor(y) * width + Math.floor(x)
    
    // 基于梯度判断是否需要细化
    const gradient = this.calculateGradient(image, x, y, width)
    return gradient > threshold
  }

  private calculateGradient(image: Float32Array, x: number, y: number, width: number): number {
    const idx = Math.floor(y) * width + Math.floor(x)
    
    if (x === 0 || x >= width - 1 || y === 0 || y >= width - 1) {
      return 0
    }
    
    const dx = Math.abs(image[idx + 1] - image[idx - 1])
    const dy = Math.abs(image[idx + width] - image[idx - width])
    
    return Math.sqrt(dx * dx + dy * dy)
  }

  private isOnBoundary(x: number, y: number, width: number, height: number): boolean {
    return x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2
  }

  private ensureBoundaryNodes(nodes: MeshNode[], width: number, height: number, boundaries: boolean[], startId: number): void {
    let nodeId = startId
    
    // 添加边界节点
    for (let x = 0; x < width; x += 10) {
      nodes.push({
        id: nodeId++,
        x: x,
        y: 0,
        boundary: true
      })
      nodes.push({
        id: nodeId++,
        x: x,
        y: height - 1,
        boundary: true
      })
    }
    
    for (let y = 0; y < height; y += 10) {
      nodes.push({
        id: nodeId++,
        x: 0,
        y: y,
        boundary: true
      })
      nodes.push({
        id: nodeId++,
        x: width - 1,
        y: y,
        boundary: true
      })
    }
  }

  private generateElements(nodes: MeshNode[], config: MeshConfig, boundaries: boolean[]): MeshElement[] {
    const elements: MeshElement[] = []
    let elementId = 0
    
    if (config.type === 'triangular') {
      // 使用Delaunay三角剖分
      this.generateTriangularElements(nodes, elements, elementId)
    } else if (config.type === 'quadrilateral') {
      // 生成四边形单元
      this.generateQuadrilateralElements(nodes, elements, elementId)
    } else {
      // 混合网格
      this.generateMixedElements(nodes, elements, elementId, boundaries)
    }
    
    return elements
  }

  private generateTriangularElements(nodes: MeshNode[], elements: MeshElement[], startId: number): void {
    let elementId = startId
    
    // 简化的三角剖分算法
    const sortedNodes = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x)
    
    for (let i = 0; i < sortedNodes.length - 2; i++) {
      for (let j = i + 1; j < sortedNodes.length - 1; j++) {
        for (let k = j + 1; k < sortedNodes.length; k++) {
          const n1 = sortedNodes[i]
          const n2 = sortedNodes[j]
          const n3 = sortedNodes[k]
          
          // 检查是否形成有效三角形
          if (this.isValidTriangle(n1, n2, n3)) {
            const area = this.calculateTriangleArea(n1, n2, n3)
            const quality = this.calculateTriangleQuality(n1, n2, n3)
            
            elements.push({
              id: elementId++,
              type: 'triangle',
              nodeIndices: [n1.id, n2.id, n3.id],
              area,
              quality
            })
          }
        }
      }
    }
  }

  private generateQuadrilateralElements(nodes: MeshNode[], elements: MeshElement[], startId: number): void {
    let elementId = startId
    
    // 简化的四边形生成算法
    const gridNodes = this.organizeNodesInGrid(nodes)
    
    for (let i = 0; i < gridNodes.length - 1; i++) {
      for (let j = 0; j < gridNodes[i].length - 1; j++) {
        const n1 = gridNodes[i][j]
        const n2 = gridNodes[i][j + 1]
        const n3 = gridNodes[i + 1][j + 1]
        const n4 = gridNodes[i + 1][j]
        
        if (n1 && n2 && n3 && n4) {
          const area = this.calculateQuadArea(n1, n2, n3, n4)
          const quality = this.calculateQuadQuality(n1, n2, n3, n4)
          
          elements.push({
            id: elementId++,
            type: 'quad',
            nodeIndices: [n1.id, n2.id, n3.id, n4.id],
            area,
            quality
          })
        }
      }
    }
  }

  private generateMixedElements(nodes: MeshNode[], elements: MeshElement[], startId: number, boundaries: boolean[]): void {
    // 在边界使用四边形，内部使用三角形
    const boundaryNodes = nodes.filter(n => n.boundary)
    const interiorNodes = nodes.filter(n => !n.boundary)
    
    // 生成内部三角形单元
    this.generateTriangularElements(interiorNodes, elements, startId)
    
    // 生成边界四边形单元
    this.generateQuadrilateralElements(boundaryNodes, elements, startId + elements.length)
  }

  private organizeNodesInGrid(nodes: MeshNode[]): MeshNode[][] {
    // 简化的网格组织
    const gridSize = Math.ceil(Math.sqrt(nodes.length))
    const grid: MeshNode[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null))
    
    nodes.forEach(node => {
      const gridX = Math.floor(node.x / gridSize)
      const gridY = Math.floor(node.y / gridSize)
      
      if (gridX < gridSize && gridY < gridSize) {
        grid[gridY][gridX] = node
      }
    })
    
    return grid
  }

  private isValidTriangle(n1: MeshNode, n2: MeshNode, n3: MeshNode): boolean {
    // 检查三角形是否退化
    const area = this.calculateTriangleArea(n1, n2, n3)
    return area > 1e-6
  }

  private calculateTriangleArea(n1: MeshNode, n2: MeshNode, n3: MeshNode): number {
    return Math.abs((n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y)) / 2
  }

  private calculateTriangleQuality(n1: MeshNode, n2: MeshNode, n3: MeshNode): number {
    // 计算三角形质量（基于最小角度）
    const angles = this.calculateTriangleAngles(n1, n2, n3)
    const minAngle = Math.min(...angles)
    const maxAngle = Math.max(...angles)
    
    // 理想三角形的最小角度为60度
    return Math.min(minAngle / 60, (180 - maxAngle) / 60)
  }

  private calculateTriangleAngles(n1: MeshNode, n2: MeshNode, n3: MeshNode): number[] {
    const a = this.distance(n2, n3)
    const b = this.distance(n1, n3)
    const c = this.distance(n1, n2)
    
    const angle1 = Math.acos((b * b + c * c - a * a) / (2 * b * c))
    const angle2 = Math.acos((a * a + c * c - b * b) / (2 * a * c))
    const angle3 = Math.PI - angle1 - angle2
    
    return [angle1 * 180 / Math.PI, angle2 * 180 / Math.PI, angle3 * 180 / Math.PI]
  }

  private calculateQuadArea(n1: MeshNode, n2: MeshNode, n3: MeshNode, n4: MeshNode): number {
    // 将四边形分成两个三角形
    return this.calculateTriangleArea(n1, n2, n3) + this.calculateTriangleArea(n1, n3, n4)
  }

  private calculateQuadQuality(n1: MeshNode, n2: MeshNode, n3: MeshNode, n4: MeshNode): number {
    // 计算四边形质量（基于内角）
    const angles = this.calculateQuadAngles(n1, n2, n3, n4)
    const minAngle = Math.min(...angles)
    const maxAngle = Math.max(...angles)
    
    // 理想四边形的最小角度为90度
    return Math.min(minAngle / 90, (180 - maxAngle) / 90)
  }

  private calculateQuadAngles(n1: MeshNode, n2: MeshNode, n3: MeshNode, n4: MeshNode): number[] {
    // 计算四边形的四个内角
    const angle1 = this.calculateAngle(n4, n1, n2)
    const angle2 = this.calculateAngle(n1, n2, n3)
    const angle3 = this.calculateAngle(n2, n3, n4)
    const angle4 = this.calculateAngle(n3, n4, n1)
    
    return [angle1, angle2, angle3, angle4]
  }

  private calculateAngle(p1: MeshNode, p2: MeshNode, p3: MeshNode): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
    
    const dot = v1.x * v2.x + v1.y * v2.y
    const det = v1.x * v2.y - v1.y * v2.x
    
    return Math.abs(Math.atan2(det, dot) * 180 / Math.PI)
  }

  private distance(n1: MeshNode, n2: MeshNode): number {
    return Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2))
  }

  private optimizeMesh(nodes: MeshNode[], elements: MeshElement[], config: MeshConfig): void {
    // 简化的网格优化
    for (let iteration = 0; iteration < 5; iteration++) {
      this.smoothNodes(nodes, elements)
      this.removePoorElements(nodes, elements)
    }
  }

  private smoothNodes(nodes: MeshNode[], elements: MeshElement[]): void {
    // Laplacian平滑
    const smoothedPositions = new Map<number, { x: number, y: number }>()
    
    nodes.forEach(node => {
      if (!node.boundary) {
        const neighbors = this.getNodeNeighbors(node, elements, nodes)
        if (neighbors.length > 0) {
          const avgX = neighbors.reduce((sum, n) => sum + n.x, 0) / neighbors.length
          const avgY = neighbors.reduce((sum, n) => sum + n.y, 0) / neighbors.length
          
          smoothedPositions.set(node.id, {
            x: node.x * 0.7 + avgX * 0.3,
            y: node.y * 0.7 + avgY * 0.3
          })
        }
      }
    })
    
    smoothedPositions.forEach((pos, nodeId) => {
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        node.x = pos.x
        node.y = pos.y
      }
    })
  }

  private getNodeNeighbors(node: MeshNode, elements: MeshElement[], nodes: MeshNode[]): MeshNode[] {
    const neighbors: MeshNode[] = []
    const neighborIds = new Set<number>()
    
    elements.forEach(element => {
      if (element.nodeIndices.includes(node.id)) {
        element.nodeIndices.forEach(id => {
          if (id !== node.id && !neighborIds.has(id)) {
            neighborIds.add(id)
          }
        })
      }
    })
    
    neighborIds.forEach(id => {
      const neighbor = nodes.find(n => n.id === id)
      if (neighbor) {
        neighbors.push(neighbor)
      }
    })
    
    return neighbors
  }

  private removePoorElements(nodes: MeshNode[], elements: MeshElement[]): void {
    // 移除质量差的单元
    const threshold = 0.3
    for (let i = elements.length - 1; i >= 0; i--) {
      if (elements[i].quality < threshold) {
        elements.splice(i, 1)
      }
    }
  }

  private calculateStatistics(nodes: MeshNode[], elements: MeshElement[], startTime: number): any {
    const qualities = elements.map(e => e.quality)
    const boundaryNodes = nodes.filter(n => n.boundary).length
    
    return {
      totalNodes: nodes.length,
      totalElements: elements.length,
      boundaryNodes,
      averageQuality: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
      minQuality: Math.min(...qualities),
      maxQuality: Math.max(...qualities),
      processingTime: performance.now() - startTime
    }
  }
}

export const imageMeshGenerator = new ImageMeshGenerator()