import { CifData } from './cifParser'

export interface AnalysisResult {
  type: string
  data: any
  timestamp: Date
  success: boolean
  error?: string
}

export interface CrystalStructureAnalysis {
  cellVolume: number
  density: number
  coordinationNumbers: Map<string, number>
  bondLengths: Array<{ element1: string; element2: string; length: number; count: number }>
  angles: Array<{ element1: string; element2: string; element3: string; angle: number; count: number }>
  symmetry: {
    crystalSystem: string
    spaceGroup: string
    pointGroup: string
  }
  composition: Map<string, number>
  formula: string
}

export interface ImageAnalysisResult {
  statistics: {
    mean: number
    median: number
    std: number
    min: number
    max: number
    histogram: number[]
  }
  morphology: {
    grainSize: number
    porosity: number
    surfaceArea: number
    roughness: number
  }
  defects: {
    dislocations: number
    vacancies: number
    grainBoundaries: number
  }
}

export interface PhaseAnalysis {
  phases: Array<{
    name: string
    fraction: number
    latticeParameters: {
      a: number
      b: number
      c: number
      alpha: number
      beta: number
      gamma: number
    }
    spaceGroup: string
  }>
  phaseDiagram: string
  stability: {
    temperature: number
    pressure: number
    gibbsEnergy: number
  }
}

class MaterialAnalyzer {
  // Atomic weights (g/mol)
  private readonly atomicWeights: Map<string, number> = new Map([
    ['H', 1.008], ['He', 4.003], ['Li', 6.941], ['Be', 9.012], ['B', 10.811],
    ['C', 12.011], ['N', 14.007], ['O', 15.999], ['F', 18.998], ['Ne', 20.180],
    ['Na', 22.990], ['Mg', 24.305], ['Al', 26.982], ['Si', 28.086], ['P', 30.974],
    ['S', 32.065], ['Cl', 35.453], ['Ar', 39.948], ['K', 39.098], ['Ca', 40.078],
    ['Sc', 44.956], ['Ti', 47.867], ['V', 50.942], ['Cr', 51.996], ['Mn', 54.938],
    ['Fe', 55.845], ['Co', 58.933], ['Ni', 58.693], ['Cu', 63.546], ['Zn', 65.38],
    ['Ga', 69.723], ['Ge', 72.640], ['As', 74.922], ['Se', 78.971], ['Br', 79.904],
    ['Kr', 83.798], ['Rb', 85.468], ['Sr', 87.62], ['Y', 88.906], ['Zr', 91.224],
    ['Nb', 92.906], ['Mo', 95.95], ['Tc', 98.0], ['Ru', 101.07], ['Rh', 102.91],
    ['Pd', 106.42], ['Ag', 107.87], ['Cd', 112.41], ['In', 114.82], ['Sn', 118.71],
    ['Sb', 121.76], ['Te', 127.60], ['I', 126.90], ['Xe', 131.29], ['Cs', 132.91],
    ['Ba', 137.33], ['La', 138.91], ['Ce', 140.12], ['Pr', 140.91], ['Nd', 144.24],
    ['Pm', 145.0], ['Sm', 150.36], ['Eu', 151.96], ['Gd', 157.25], ['Tb', 158.93],
    ['Dy', 162.50], ['Ho', 164.93], ['Er', 167.26], ['Tm', 168.93], ['Yb', 173.05],
    ['Lu', 174.97], ['Hf', 178.49], ['Ta', 180.95], ['W', 183.84], ['Re', 186.21],
    ['Os', 190.23], ['Ir', 192.22], ['Pt', 195.08], ['Au', 196.97], ['Hg', 200.59],
    ['Tl', 204.38], ['Pb', 207.2], ['Bi', 208.98], ['Po', 209.0], ['At', 210.0],
    ['Rn', 222.0], ['Fr', 223.0], ['Ra', 226.0], ['Ac', 227.0], ['Th', 232.04],
    ['Pa', 231.04], ['U', 238.03], ['Np', 237.0], ['Pu', 244.0], ['Am', 243.0],
    ['Cm', 247.0], ['Bk', 247.0], ['Cf', 251.0], ['Es', 252.0], ['Fm', 257.0],
    ['Md', 258.0], ['No', 259.0], ['Lr', 262.0], ['Rf', 267.0], ['Db', 270.0],
    ['Sg', 271.0], ['Bh', 270.0], ['Hs', 277.0], ['Mt', 278.0], ['Ds', 281.0],
    ['Rg', 282.0], ['Cn', 285.0], ['Fl', 289.0], ['Lv', 293.0], ['Ts', 294.0],
    ['Og', 294.0]
  ])

  // Atomic radii (Å)
  private readonly atomicRadii: Map<string, number> = new Map([
    ['H', 0.53], ['He', 0.31], ['Li', 1.67], ['Be', 1.12], ['B', 0.87],
    ['C', 0.67], ['N', 0.56], ['O', 0.48], ['F', 0.42], ['Ne', 0.38],
    ['Na', 1.90], ['Mg', 1.45], ['Al', 1.18], ['Si', 1.11], ['P', 1.06],
    ['S', 1.02], ['Cl', 0.99], ['Ar', 0.98], ['K', 2.43], ['Ca', 1.94],
    ['Sc', 1.84], ['Ti', 1.76], ['V', 1.71], ['Cr', 1.66], ['Mn', 1.61],
    ['Fe', 1.56], ['Co', 1.52], ['Ni', 1.49], ['Cu', 1.45], ['Zn', 1.42],
    ['Ga', 1.36], ['Ge', 1.25], ['As', 1.21], ['Se', 1.16], ['Br', 1.14],
    ['Kr', 1.17], ['Rb', 2.65], ['Sr', 2.19], ['Y', 2.12], ['Zr', 2.06],
    ['Nb', 1.98], ['Mo', 1.90], ['Tc', 1.83], ['Ru', 1.78], ['Rh', 1.73],
    ['Pd', 1.69], ['Ag', 1.65], ['Cd', 1.61], ['In', 1.56], ['Sn', 1.45],
    ['Sb', 1.33], ['Te', 1.23], ['I', 1.15], ['Xe', 1.17], ['Cs', 2.98],
    ['Ba', 2.53], ['La', 2.07], ['Ce', 2.04], ['Pr', 2.03], ['Nd', 2.01],
    ['Pm', 1.99], ['Sm', 1.98], ['Eu', 1.98], ['Gd', 1.96], ['Tb', 1.94],
    ['Dy', 1.92], ['Ho', 1.92], ['Er', 1.89], ['Tm', 1.90], ['Yb', 1.87],
    ['Lu', 1.87], ['Hf', 1.75], ['Ta', 1.70], ['W', 1.62], ['Re', 1.51],
    ['Os', 1.44], ['Ir', 1.36], ['Pt', 1.39], ['Au', 1.36], ['Hg', 1.32],
    ['Tl', 1.45], ['Pb', 1.46], ['Bi', 1.48], ['Po', 1.40], ['At', 1.50],
    ['Rn', 1.54], ['Fr', 3.48], ['Ra', 2.83], ['Ac', 2.15], ['Th', 2.06],
    ['Pa', 2.00], ['U', 1.96], ['Np', 1.90], ['Pu', 1.87], ['Am', 1.80],
    ['Cm', 1.69], ['Bk', 1.70], ['Cf', 1.73], ['Es', 1.76], ['Fm', 1.76],
    ['Md', 1.76], ['No', 1.76], ['Lr', 1.76], ['Rf', 1.57], ['Db', 1.49],
    ['Sg', 1.43], ['Bh', 1.41], ['Hs', 1.34], ['Mt', 1.29], ['Ds', 1.28],
    ['Rg', 1.21], ['Cn', 1.22], ['Fl', 1.62], ['Lv', 1.75], ['Ts', 1.56],
    ['Og', 1.57]
  ])

  /**
   * 分析晶体结构
   */
  analyzeCrystalStructure(cifData: CifData): AnalysisResult {
    try {
      const analysis: CrystalStructureAnalysis = {
        cellVolume: this.calculateCellVolume(cifData),
        density: this.calculateDensity(cifData),
        coordinationNumbers: this.calculateCoordinationNumbers(cifData),
        bondLengths: this.calculateBondLengths(cifData),
        angles: this.calculateBondAngles(cifData),
        symmetry: this.analyzeSymmetry(cifData),
        composition: this.getComposition(cifData),
        formula: this.generateFormula(cifData)
      }

      return {
        type: 'crystal_structure',
        data: analysis,
        timestamp: new Date(),
        success: true
      }
    } catch (error) {
      return {
        type: 'crystal_structure',
        data: null,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 计算晶胞体积
   */
  private calculateCellVolume(cifData: CifData): number {
    const { a, b, c, alpha, beta, gamma } = cifData.cell
    
    // Convert angles to radians
    const alphaRad = (alpha * Math.PI) / 180
    const betaRad = (beta * Math.PI) / 180
    const gammaRad = (gamma * Math.PI) / 180

    // Calculate volume using the general formula
    const cosAlpha = Math.cos(alphaRad)
    const cosBeta = Math.cos(betaRad)
    const cosGamma = Math.cos(gammaRad)
    
    const volume = a * b * c * Math.sqrt(
      1 - cosAlpha * cosAlpha - cosBeta * cosBeta - cosGamma * cosGamma +
      2 * cosAlpha * cosBeta * cosGamma
    )

    return volume
  }

  /**
   * 计算密度
   */
  private calculateDensity(cifData: CifData): number {
    const volume = this.calculateCellVolume(cifData) // Å³
    const molecularWeight = this.calculateMolecularWeight(cifData) // g/mol
    const z = this.getZValue(cifData) // Number of formula units per cell
    
    // Convert Å³ to cm³ and calculate density (g/cm³)
    const volumeCm3 = volume * 1e-24
    const avogadro = 6.022e23
    
    return (molecularWeight * z) / (avogadro * volumeCm3)
  }

  /**
   * 计算分子量
   */
  private calculateMolecularWeight(cifData: CifData): number {
    const composition = this.getComposition(cifData)
    let totalWeight = 0

    for (const [element, count] of composition) {
      const atomicWeight = this.atomicWeights.get(element)
      if (atomicWeight) {
        totalWeight += atomicWeight * count
      }
    }

    return totalWeight
  }

  /**
   * 获取Z值（每个晶胞的分子式单位数）
   */
  private getZValue(cifData: CifData): number {
    // Try to get Z from CIF data
    if (cifData.symmetry && cifData.symmetry.z) {
      return cifData.symmetry.z
    }
    
    // If not available, estimate based on the number of atoms
    const totalAtoms = cifData.atoms.length
    return Math.max(1, Math.floor(totalAtoms / 10)) // Rough estimate
  }

  /**
   * 计算配位数
   */
  private calculateCoordinationNumbers(cifData: CifData): Map<string, number> {
    const coordinationNumbers = new Map<string, number>()
    const bondLengths = this.calculateBondLengths(cifData)
    
    // Group bonds by central atom
    const bondsByCentralAtom = new Map<string, number[]>()
    
    for (const bond of bondLengths) {
      if (!bondsByCentralAtom.has(bond.element1)) {
        bondsByCentralAtom.set(bond.element1, [])
      }
      bondsByCentralAtom.get(bond.element1)!.push(bond.count)
    }
    
    // Calculate average coordination number for each element
    for (const [element, counts] of bondsByCentralAtom) {
      const avgCoordination = counts.reduce((sum, count) => sum + count, 0) / counts.length
      coordinationNumbers.set(element, Math.round(avgCoordination))
    }
    
    return coordinationNumbers
  }

  /**
   * 计算键长
   */
  private calculateBondLengths(cifData: CifData): Array<{ element1: string; element2: string; length: number; count: number }> {
    const bondLengths: Array<{ element1: string; element2: string; length: number; count: number }> = []
    const bondMap = new Map<string, { length: number; count: number }>()
    
    // Calculate distances between all atom pairs
    for (let i = 0; i < cifData.atoms.length; i++) {
      for (let j = i + 1; j < cifData.atoms.length; j++) {
        const atom1 = cifData.atoms[i]
        const atom2 = cifData.atoms[j]
        
        const distance = this.calculateDistance(atom1, atom2, cifData.cell)
        const maxBondDistance = this.getMaxBondDistance(atom1.element, atom2.element)
        
        if (distance <= maxBondDistance) {
          const key = `${atom1.element}-${atom2.element}`
          const existing = bondMap.get(key)
          
          if (existing) {
            existing.count++
            existing.length = (existing.length + distance) / 2 // Update average
          } else {
            bondMap.set(key, { length: distance, count: 1 })
          }
        }
      }
    }
    
    // Convert map to array
    for (const [pair, data] of bondMap) {
      const [element1, element2] = pair.split('-')
      bondLengths.push({
        element1,
        element2,
        length: Math.round(data.length * 1000) / 1000, // Round to 3 decimal places
        count: data.count
      })
    }
    
    return bondLengths.sort((a, b) => a.length - b.length)
  }

  /**
   * 计算键角
   */
  private calculateBondAngles(cifData: CifData): Array<{ element1: string; element2: string; element3: string; angle: number; count: number }> {
    const angles: Array<{ element1: string; element2: string; element3: string; angle: number; count: number }> = []
    const angleMap = new Map<string, { angle: number; count: number }>()
    
    // Calculate angles for all triplets
    for (let i = 0; i < cifData.atoms.length; i++) {
      for (let j = 0; j < cifData.atoms.length; j++) {
        if (i === j) continue
        
        for (let k = j + 1; k < cifData.atoms.length; k++) {
          if (k === i) continue
          
          const atom1 = cifData.atoms[i]
          const atom2 = cifData.atoms[j] // Central atom
          const atom3 = cifData.atoms[k]
          
          const distance1 = this.calculateDistance(atom1, atom2, cifData.cell)
          const distance2 = this.calculateDistance(atom2, atom3, cifData.cell)
          const distance3 = this.calculateDistance(atom1, atom3, cifData.cell)
          
          const maxBondDistance1 = this.getMaxBondDistance(atom1.element, atom2.element)
          const maxBondDistance2 = this.getMaxBondDistance(atom2.element, atom3.element)
          
          if (distance1 <= maxBondDistance1 && distance2 <= maxBondDistance2) {
            // Calculate angle using law of cosines
            const cosAngle = (distance1 * distance1 + distance2 * distance2 - distance3 * distance3) / (2 * distance1 * distance2)
            const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI)
            
            const key = `${atom1.element}-${atom2.element}-${atom3.element}`
            const existing = angleMap.get(key)
            
            if (existing) {
              existing.count++
              existing.angle = (existing.angle + angle) / 2 // Update average
            } else {
              angleMap.set(key, { angle, count: 1 })
            }
          }
        }
      }
    }
    
    // Convert map to array
    for (const [triplet, data] of angleMap) {
      const [element1, element2, element3] = triplet.split('-')
      angles.push({
        element1,
        element2,
        element3,
        angle: Math.round(data.angle * 10) / 10, // Round to 1 decimal place
        count: data.count
      })
    }
    
    return angles.sort((a, b) => a.angle - b.angle)
  }

  /**
   * 分析对称性
   */
  private analyzeSymmetry(cifData: CifData): CrystalStructureAnalysis['symmetry'] {
    const cell = cifData.cell
    let crystalSystem = 'triclinic'
    let pointGroup = '1'
    
    // Determine crystal system based on cell parameters
    const tolerance = 0.01
    
    if (Math.abs(cell.a - cell.b) < tolerance && 
        Math.abs(cell.b - cell.c) < tolerance &&
        Math.abs(cell.alpha - 90) < tolerance &&
        Math.abs(cell.beta - 90) < tolerance &&
        Math.abs(cell.gamma - 90) < tolerance) {
      crystalSystem = 'cubic'
      pointGroup = 'm-3m'
    } else if (Math.abs(cell.a - cell.b) < tolerance &&
               Math.abs(cell.alpha - 90) < tolerance &&
               Math.abs(cell.beta - 90) < tolerance &&
               Math.abs(cell.gamma - 90) < tolerance) {
      crystalSystem = 'tetragonal'
      pointGroup = '4/mmm'
    } else if (Math.abs(cell.alpha - 90) < tolerance &&
               Math.abs(cell.beta - 90) < tolerance &&
               Math.abs(cell.gamma - 120) < tolerance) {
      crystalSystem = 'hexagonal'
      pointGroup = '6/mmm'
    } else if (Math.abs(cell.alpha - cell.beta) < tolerance &&
               Math.abs(cell.beta - cell.gamma) < tolerance &&
               Math.abs(cell.alpha + cell.beta + cell.gamma - 360) < tolerance) {
      crystalSystem = 'rhombohedral'
      pointGroup = '-3m'
    } else if (Math.abs(cell.alpha - 90) < tolerance &&
               Math.abs(cell.beta - 90) < tolerance &&
               Math.abs(cell.gamma - 90) < tolerance) {
      crystalSystem = 'orthorhombic'
      pointGroup = 'mmm'
    } else if (Math.abs(cell.gamma - 90) < tolerance) {
      crystalSystem = 'monoclinic'
      pointGroup = '2/m'
    }
    
    return {
      crystalSystem,
      spaceGroup: cifData.symmetry?.spaceGroup || 'P1',
      pointGroup
    }
  }

  /**
   * 获取组成
   */
  private getComposition(cifData: CifData): Map<string, number> {
    const composition = new Map<string, number>()
    
    for (const atom of cifData.atoms) {
      const current = composition.get(atom.element) || 0
      composition.set(atom.element, current + 1)
    }
    
    return composition
  }

  /**
   * 生成化学式
   */
  private generateFormula(cifData: CifData): string {
    const composition = this.getComposition(cifData)
    const elements = Array.from(composition.entries()).sort(([a], [b]) => a.localeCompare(b))
    
    return elements.map(([element, count]) => {
      return count > 1 ? `${element}${count}` : element
    }).join('')
  }

  /**
   * 计算两个原子之间的距离
   */
  private calculateDistance(atom1: any, atom2: any, cell: any): number {
    const dx = atom1.x - atom2.x
    const dy = atom1.y - atom2.y
    const dz = atom1.z - atom2.z
    
    // Apply periodic boundary conditions
    const dxPbc = dx - Math.round(dx)
    const dyPbc = dy - Math.round(dy)
    const dzPbc = dz - Math.round(dz)
    
    // Convert to Cartesian coordinates
    const x1 = atom1.x * cell.a + atom1.y * cell.b * Math.cos(cell.gamma * Math.PI / 180) + atom1.z * cell.c * Math.cos(cell.beta * Math.PI / 180)
    const y1 = atom1.y * cell.b * Math.sin(cell.gamma * Math.PI / 180) + atom1.z * cell.c * (Math.cos(cell.alpha * Math.PI / 180) - Math.cos(cell.beta * Math.PI / 180) * Math.cos(cell.gamma * Math.PI / 180)) / Math.sin(cell.gamma * Math.PI / 180)
    const z1 = atom1.z * cell.c * Math.sqrt(1 - Math.cos(cell.alpha * Math.PI / 180) ** 2 - Math.cos(cell.beta * Math.PI / 180) ** 2 - Math.cos(cell.gamma * Math.PI / 180) ** 2 + 2 * Math.cos(cell.alpha * Math.PI / 180) * Math.cos(cell.beta * Math.PI / 180) * Math.cos(cell.gamma * Math.PI / 180)) / Math.sin(cell.gamma * Math.PI / 180)
    
    const x2 = atom2.x * cell.a + atom2.y * cell.b * Math.cos(cell.gamma * Math.PI / 180) + atom2.z * cell.c * Math.cos(cell.beta * Math.PI / 180)
    const y2 = atom2.y * cell.b * Math.sin(cell.gamma * Math.PI / 180) + atom2.z * cell.c * (Math.cos(cell.alpha * Math.PI / 180) - Math.cos(cell.beta * Math.PI / 180) * Math.cos(cell.gamma * Math.PI / 180)) / Math.sin(cell.gamma * Math.PI / 180)
    const z2 = atom2.z * cell.c * Math.sqrt(1 - Math.cos(cell.alpha * Math.PI / 180) ** 2 - Math.cos(cell.beta * Math.PI / 180) ** 2 - Math.cos(cell.gamma * Math.PI / 180) ** 2 + 2 * Math.cos(cell.alpha * Math.PI / 180) * Math.cos(cell.beta * Math.PI / 180) * Math.cos(cell.gamma * Math.PI / 180)) / Math.sin(cell.gamma * Math.PI / 180)
    
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2)
  }

  /**
   * 获取最大键距离
   */
  private getMaxBondDistance(element1: string, element2: string): number {
    const radius1 = this.atomicRadii.get(element1) || 1.5
    const radius2 = this.atomicRadii.get(element2) || 1.5
    
    // Bond distance is typically sum of atomic radii plus tolerance
    return (radius1 + radius2) * 1.2 // 20% tolerance
  }

  /**
   * 分析图像数据
   */
  analyzeImage(imageData: ImageData): AnalysisResult {
    try {
      const analysis: ImageAnalysisResult = {
        statistics: this.calculateImageStatistics(imageData),
        morphology: this.analyzeMorphology(imageData),
        defects: this.detectDefects(imageData)
      }

      return {
        type: 'image_analysis',
        data: analysis,
        timestamp: new Date(),
        success: true
      }
    } catch (error) {
      return {
        type: 'image_analysis',
        data: null,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 计算图像统计信息
   */
  private calculateImageStatistics(imageData: ImageData): ImageAnalysisResult['statistics'] {
    const data = imageData.data
    const values: number[] = []
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert RGB to grayscale
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
      values.push(gray)
    }
    
    values.sort((a, b) => a - b)
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const median = values[Math.floor(values.length / 2)]
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length
    const std = Math.sqrt(variance)
    const min = values[0]
    const max = values[values.length - 1]
    
    // Calculate histogram
    const histogram = new Array(256).fill(0)
    for (const value of values) {
      histogram[Math.floor(value)]++
    }
    
    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      std: Math.round(std * 100) / 100,
      min,
      max,
      histogram
    }
  }

  /**
   * 分析形态学特征
   */
  private analyzeMorphology(imageData: ImageData): ImageAnalysisResult['morphology'] {
    // This is a simplified implementation
    // In practice, you would use more sophisticated image processing algorithms
    
    const stats = this.calculateImageStatistics(imageData)
    const threshold = stats.mean + stats.std
    
    // Simple thresholding to identify grains
    let grainPixels = 0
    let totalPixels = imageData.width * imageData.height
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
      if (gray > threshold) {
        grainPixels++
      }
    }
    
    const grainSize = Math.sqrt(grainPixels / Math.PI) // Approximate grain size
    const porosity = 1 - (grainPixels / totalPixels)
    const surfaceArea = grainPixels // Simplified
    const roughness = stats.std / stats.mean // Simplified roughness measure
    
    return {
      grainSize: Math.round(grainSize * 100) / 100,
      porosity: Math.round(porosity * 10000) / 100, // Convert to percentage
      surfaceArea: Math.round(surfaceArea),
      roughness: Math.round(roughness * 1000) / 1000
    }
  }

  /**
   * 检测缺陷
   */
  private detectDefects(imageData: ImageData): ImageAnalysisResult['defects'] {
    // Simplified defect detection
    // In practice, you would use edge detection, pattern recognition, etc.
    
    const stats = this.calculateImageStatistics(imageData)
    const data = imageData.data
    
    let dislocations = 0
    let vacancies = 0
    let grainBoundaries = 0
    
    // Simple edge detection for grain boundaries
    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < imageData.width - 1; x++) {
        const idx = (y * imageData.width + x) * 4
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        // Check neighboring pixels
        const neighbors = [
          ((y - 1) * imageData.width + x) * 4,
          ((y + 1) * imageData.width + x) * 4,
          (y * imageData.width + (x - 1)) * 4,
          (y * imageData.width + (x + 1)) * 4
        ]
        
        let edgeCount = 0
        for (const nIdx of neighbors) {
          const nGray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
          if (Math.abs(gray - nGray) > stats.std) {
            edgeCount++
          }
        }
        
        if (edgeCount >= 2) {
          grainBoundaries++
        }
      }
    }
    
    // Simplified defect counting
    dislocations = Math.floor(grainBoundaries * 0.1)
    vacancies = Math.floor(imageData.width * imageData.height * 0.001)
    
    return {
      dislocations,
      vacancies,
      grainBoundaries
    }
  }

  /**
   * 相分析
   */
  analyzePhases(cifData: CifData, temperature: number = 298, pressure: number = 1): AnalysisResult {
    try {
      const analysis: PhaseAnalysis = {
        phases: this.identifyPhases(cifData),
        phaseDiagram: this.generatePhaseDiagram(cifData),
        stability: {
          temperature,
          pressure,
          gibbsEnergy: this.calculateGibbsEnergy(cifData, temperature, pressure)
        }
      }

      return {
        type: 'phase_analysis',
        data: analysis,
        timestamp: new Date(),
        success: true
      }
    } catch (error) {
      return {
        type: 'phase_analysis',
        data: null,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 识别相
   */
  private identifyPhases(cifData: CifData): PhaseAnalysis['phases'] {
    // Simplified phase identification
    // In practice, you would use databases and pattern matching
    
    const composition = this.getComposition(cifData)
    const symmetry = this.analyzeSymmetry(cifData)
    
    return [{
      name: `${symmetry.crystalSystem} phase`,
      fraction: 1.0,
      latticeParameters: {
        a: cifData.cell.a,
        b: cifData.cell.b,
        c: cifData.cell.c,
        alpha: cifData.cell.alpha,
        beta: cifData.cell.beta,
        gamma: cifData.cell.gamma
      },
      spaceGroup: symmetry.spaceGroup
    }]
  }

  /**
   * 生成相图
   */
  private generatePhaseDiagram(cifData: CifData): string {
    // Simplified phase diagram generation
    // In practice, you would use thermodynamic databases
    
    return 'binary_phase_diagram.png' // Placeholder
  }

  /**
   * 计算吉布斯自由能
   */
  private calculateGibbsEnergy(cifData: CifData, temperature: number, pressure: number): number {
    // Simplified Gibbs energy calculation
    // In practice, you would use thermodynamic models
    
    const molecularWeight = this.calculateMolecularWeight(cifData)
    const volume = this.calculateCellVolume(cifData)
    
    // Simplified model: G = H - TS
    const enthalpy = molecularWeight * 0.01 // Simplified enthalpy
    const entropy = molecularWeight * 0.0001 * temperature // Simplified entropy
    const pvTerm = pressure * volume * 1e-6 // Convert to appropriate units
    
    return enthalpy - entropy + pvTerm
  }
}

export const materialAnalyzer = new MaterialAnalyzer()
export default materialAnalyzer