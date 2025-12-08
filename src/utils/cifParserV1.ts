export interface CifAtom {
  element: string
  x: number
  y: number
  z: number
  occupancy: number
  thermal_factor: number
  label?: string
  symmetry?: string
}

export interface CifCellParameters {
  a: number
  b: number
  c: number
  alpha: number
  beta: number
  gamma: number
  volume?: number
}

export interface CifSymmetry {
  space_group_name_hm?: string
  space_group_name_hall?: string
  symmetry_cell_setting?: string
  symmetry_space_group_name_h_m?: string
  symmetry_equiv_pos_as_xyz?: string[]
}

export interface CifData {
  filename?: string
  title?: string
  chemical_formula_sum?: string
  chemical_formula_moiety?: string
  chemical_name?: string
  crystal_system?: string
  cell_parameters?: CifCellParameters
  symmetry?: CifSymmetry
  atoms: CifAtom[]
  bonds?: Array<{
    atom1: number
    atom2: number
    distance: number
    order: number
  }>
  metadata?: {
    parse_date: string
    parser_version: string
    warnings: string[]
  }
}

export class CifParser {
  private static readonly VERSION = '1.0.0'
  
  static parse(content: string, filename?: string): CifData {
    if (!content || typeof content !== 'string') {
      throw new Error('CIF文件内容无效或为空')
    }

    try {
      const data: CifData = {
        atoms: [],
        metadata: {
          parse_date: new Date().toISOString(),
          parser_version: this.VERSION,
          warnings: []
        }
      }
      
      if (filename) {
        data.filename = filename
      }
      
      const lines = content.split('\n')
      let inAtomLoop = false
      let atomLabels: string[] = []
      let atomData: string[][] = []
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // 跳过空行和注释
        if (!line || line.startsWith('#')) continue
        
        // 解析标题
        if (line.startsWith('_data_name') || line.startsWith('_publ_section_title')) {
          data.title = this.extractValue(line)
          continue
        }
        
        // 解析化学式
        if (line.startsWith('_chemical_formula_sum')) {
          data.chemical_formula_sum = this.extractValue(line)
          continue
        }
        if (line.startsWith('_chemical_formula_moiety')) {
          data.chemical_formula_moiety = this.extractValue(line)
          continue
        }
        if (line.startsWith('_chemical_name_mineral')) {
          data.chemical_name = this.extractValue(line)
          continue
        }
        
        // 解析晶系
        if (line.startsWith('_symmetry_cell_setting') || line.startsWith('_space_group_crystal_system')) {
          data.crystal_system = this.extractValue(line)
          continue
        }
        
        // 解析空间群
        if (line.startsWith('_space_group_name_H-M') || line.startsWith('_symmetry_space_group_name_H-M')) {
          if (!data.symmetry) data.symmetry = {}
          data.symmetry.space_group_name_hm = this.extractValue(line)
          continue
        }
        if (line.startsWith('_space_group_name_Hall')) {
          if (!data.symmetry) data.symmetry = {}
          data.symmetry.space_group_name_hall = this.extractValue(line)
          continue
        }
        
        // 解析晶胞参数
        if (!data.cell_parameters) {
          data.cell_parameters = { a: 0, b: 0, c: 0, alpha: 90, beta: 90, gamma: 90 }
        }
        
        if (line.startsWith('_cell_length_a')) {
          const value = parseFloat(this.extractValue(line))
          if (!isNaN(value) && value > 0) {
            data.cell_parameters.a = value
          } else {
            data.metadata!.warnings.push(`无效的晶胞参数a: ${this.extractValue(line)}`)
          }
          continue
        }
        if (line.startsWith('_cell_length_b')) {
          const value = parseFloat(this.extractValue(line))
          if (!isNaN(value) && value > 0) {
            data.cell_parameters.b = value
          } else {
            data.metadata!.warnings.push(`无效的晶胞参数b: ${this.extractValue(line)}`)
          }
          continue
        }
        if (line.startsWith('_cell_length_c')) {
          const value = parseFloat(this.extractValue(line))
          if (!isNaN(value) && value > 0) {
            data.cell_parameters.c = value
          } else {
            data.metadata!.warnings.push(`无效的晶胞参数c: ${this.extractValue(line)}`)
          }
          continue
        }
        if (line.startsWith('_cell_angle_alpha')) {
          const value = parseFloat(this.extractValue(line))
          if (!isNaN(value) && value > 0 && value <= 180) {
            data.cell_parameters.alpha = value
          } else {
            data.metadata!.warnings.push(`无效的晶胞角度alpha: ${this.extractValue(line)}`)
          }
          continue
        }
        if (line.startsWith('_cell_angle_beta')) {
          const value = parseFloat(this.extractValue(line))
          if (!isNaN(value) && value > 0 && value <= 180) {
            data.cell_parameters.beta = value
          } else {
            data.metadata!.warnings.push(`无效的晶胞角度beta: ${this.extractValue(line)}`)
          }
          continue
        }
        if (line.startsWith('_cell_angle_gamma')) {
          const value = parseFloat(this.extractValue(line))
          if (!isNaN(value) && value > 0 && value <= 180) {
            data.cell_parameters.gamma = value
          } else {
            data.metadata!.warnings.push(`无效的晶胞角度gamma: ${this.extractValue(line)}`)
          }
          continue
        }
        
        // 检测原子循环开始
        if (line.startsWith('_atom_site_')) {
          inAtomLoop = true
          atomLabels.push(line)
          continue
        }
        
        // 解析原子数据
        if (inAtomLoop && !line.startsWith('_') && line.length > 0) {
          const parts = line.split(/\s+/).filter(p => p.length > 0)
          if (parts.length >= 1) {
            atomData.push(parts)
          }
          continue
        }
        
        // 检测循环结束
        if (inAtomLoop && line.startsWith('_') && !line.startsWith('_atom_site_')) {
          inAtomLoop = false
        }
      }
      
      // 处理原子数据
      if (atomData.length > 0) {
        try {
          data.atoms = this.parseAtomData(atomLabels, atomData, data.metadata!)
        } catch (error) {
          data.metadata!.warnings.push(`原子数据解析失败: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      
      // 计算晶胞体积
      if (data.cell_parameters && data.cell_parameters.a > 0 && data.cell_parameters.b > 0 && data.cell_parameters.c > 0) {
        try {
          data.cell_parameters.volume = this.calculateCellVolume(data.cell_parameters)
        } catch (error) {
          data.metadata!.warnings.push(`晶胞体积计算失败: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      
      // 验证解析结果
      if (data.atoms.length === 0) {
        data.metadata!.warnings.push('未解析到原子数据，使用示例数据')
        data.atoms = this.getExampleAtoms()
      }
      
      if (!data.title) {
        data.metadata!.warnings.push('未找到标题信息')
      }
      
      if (!data.cell_parameters || data.cell_parameters.a === 0) {
        data.metadata!.warnings.push('晶胞参数不完整')
      }
      
      return data
    } catch (error) {
      throw new Error(`CIF文件解析失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  private static extractValue(line: string): string {
    const match = line.match(/^(?:_[^_\s]+(?:_[^_\s]+)*)\s+(.+)$/)
    return match ? match[1].trim().replace(/['"]/g, '') : ''
  }
  
  private static parseAtomData(labels: string[], data: string[][], metadata: { warnings: string[] }): CifAtom[] {
    const atoms: CifAtom[] = []
    
    // 查找关键列的索引
    const labelIndex = labels.findIndex(l => l.includes('_atom_site_label'))
    const typeIndex = labels.findIndex(l => l.includes('_atom_site_type_symbol'))
    const xIndex = labels.findIndex(l => l.includes('_atom_site_fract_x'))
    const yIndex = labels.findIndex(l => l.includes('_atom_site_fract_y'))
    const zIndex = labels.findIndex(l => l.includes('_atom_site_fract_z'))
    const occIndex = labels.findIndex(l => l.includes('_atom_site_occupancy'))
    const uIsoIndex = labels.findIndex(l => l.includes('_atom_site_U_iso_or_equiv'))
    
    for (const row of data) {
      try {
        const atom: CifAtom = {
          element: typeIndex >= 0 ? row[typeIndex] : row[labelIndex]?.substring(0, 1) || 'C',
          x: xIndex >= 0 ? parseFloat(row[xIndex]) : 0,
          y: yIndex >= 0 ? parseFloat(row[yIndex]) : 0,
          z: zIndex >= 0 ? parseFloat(row[zIndex]) : 0,
          occupancy: occIndex >= 0 ? parseFloat(row[occIndex]) : 1.0,
          thermal_factor: uIsoIndex >= 0 ? parseFloat(row[uIsoIndex]) : 0.02
        }
        
        if (labelIndex >= 0) {
          atom.label = row[labelIndex]
        }
        
        atoms.push(atom)
      } catch (error) {
        metadata.warnings.push(`解析原子数据时出错: ${row.join(' ')}`)
      }
    }
    
    return atoms
  }
  
  private static calculateCellVolume(cell: CifCellParameters): number {
    const { a, b, c, alpha, beta, gamma } = cell
    const alphaRad = (alpha * Math.PI) / 180
    const betaRad = (beta * Math.PI) / 180
    const gammaRad = (gamma * Math.PI) / 180
    
    const volume = a * b * c * Math.sqrt(
      1 - Math.cos(alphaRad) * Math.cos(alphaRad) -
      Math.cos(betaRad) * Math.cos(betaRad) -
      Math.cos(gammaRad) * Math.cos(gammaRad) +
      2 * Math.cos(alphaRad) * Math.cos(betaRad) * Math.cos(gammaRad)
    )
    
    return Math.round(volume * 1000) / 1000
  }
  
  private static getExampleAtoms(): CifAtom[] {
    return [
      { element: 'C', x: 0.123, y: 0.456, z: 0.789, occupancy: 1.0, thermal_factor: 0.02, label: 'C1' },
      { element: 'H', x: 0.234, y: 0.567, z: 0.890, occupancy: 1.0, thermal_factor: 0.03, label: 'H1' },
      { element: 'O', x: 0.345, y: 0.678, z: 0.901, occupancy: 1.0, thermal_factor: 0.025, label: 'O1' },
      { element: 'N', x: 0.456, y: 0.789, z: 0.012, occupancy: 1.0, thermal_factor: 0.022, label: 'N1' }
    ]
  }
  
  static validateCifFile(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!content || content.trim().length === 0) {
      errors.push('文件内容为空')
      return { valid: false, errors }
    }
    
    const lines = content.split('\n')
    let hasDataBlock = false
    let hasAtomSite = false
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('data_')) {
        hasDataBlock = true
      }
      
      if (trimmed.startsWith('_atom_site_')) {
        hasAtomSite = true
      }
    }
    
    if (!hasDataBlock) {
      errors.push('缺少数据块 (data_)')
    }
    
    if (!hasAtomSite) {
      errors.push('缺少原子位置信息 (_atom_site_)')
    }
    
    return { valid: errors.length === 0, errors }
  }
  
  static getElementColor(element: string): string {
    const colors: { [key: string]: string } = {
      'H': '#FFFFFF', 'He': '#D9FFFF', 'Li': '#CC80FF', 'Be': '#C2FF00',
      'B': '#FFB5B5', 'C': '#909090', 'N': '#3050F8', 'O': '#FF0D0D',
      'F': '#90E050', 'Ne': '#B3E3F5', 'Na': '#AB5CF2', 'Mg': '#8AFF00',
      'Al': '#BFA6A6', 'Si': '#F0C8A0', 'P': '#FF8000', 'S': '#FFFF30',
      'Cl': '#1FF01F', 'Ar': '#80D1E3', 'K': '#8F40D4', 'Ca': '#3DFF00',
      'Fe': '#E06633', 'Cu': '#C88033', 'Zn': '#7D80B0', 'Au': '#FFD123'
    }
    return colors[element] || '#FF69B4'
  }
  
  static getAtomicRadius(element: string): number {
    const radii: { [key: string]: number } = {
      'H': 0.31, 'He': 0.28, 'Li': 1.28, 'Be': 0.96, 'B': 0.85,
      'C': 0.76, 'N': 0.71, 'O': 0.66, 'F': 0.57, 'Ne': 0.58,
      'Na': 1.66, 'Mg': 1.41, 'Al': 1.21, 'Si': 1.11, 'P': 1.07,
      'S': 1.05, 'Cl': 1.02, 'Ar': 1.06, 'K': 2.03, 'Ca': 1.76,
      'Fe': 1.26, 'Cu': 1.28, 'Zn': 1.34, 'Au': 1.44
    }
    return radii[element] || 1.0
  }
}

// Export a default instance for convenience
export const cifParser = new CifParser()

export const getElementColor = CifParser.getElementColor