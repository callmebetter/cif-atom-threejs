export interface ReportData {
  title: string
  author: string
  date: string
  description: string
  sections: ReportSection[]
}

export interface ReportSection {
  title: string
  type: 'text' | 'table' | 'chart' | 'image' | 'summary'
  content: unknown
}

export interface ExportOptions {
  format: 'pdf' | 'html' | 'json' | 'csv'
  includeImages: boolean
  includeCharts: boolean
  template?: string
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  sections: TemplateSection[]
}

export interface TemplateSection {
  type: 'text' | 'table' | 'chart' | 'image' | 'summary'
  title: string
  required: boolean
  placeholder?: string
}

export class ReportGenerator {
  private templates: ReportTemplate[] = [
    {
      id: 'material-analysis',
      name: '材料分析报告',
      description: '包含晶体结构、组成分析、相分析等完整的材料分析报告',
      sections: [
        {
          title: '摘要',
          type: 'text',
          required: true,
          placeholder: '请输入研究摘要...'
        },
        {
          title: '晶体结构分析',
          type: 'table',
          required: true
        },
        {
          title: '组成分析',
          type: 'table',
          required: true
        },
        {
          title: '相分析',
          type: 'table',
          required: true
        },
        {
          title: '结构图像',
          type: 'image',
          required: false
        },
        {
          title: '结论',
          type: 'summary',
          required: true
        }
      ]
    },
    {
      id: 'crystal-structure',
      name: '晶体结构报告',
      description: '专注于晶体结构参数和原子位置的分析报告',
      sections: [
        {
          title: '晶体基本信息',
          type: 'table',
          required: true
        },
        {
          title: '晶胞参数',
          type: 'table',
          required: true
        },
        {
          title: '原子位置',
          type: 'table',
          required: true
        },
        {
          title: '键长键角',
          type: 'table',
          required: false
        },
        {
          title: '3D结构图',
          type: 'image',
          required: false
        },
        {
          title: '结构分析',
          type: 'text',
          required: true
        }
      ]
    },
    {
      id: 'image-mesh',
      name: '图像网格化报告',
      description: '图像网格化处理和质量分析的详细报告',
      sections: [
        {
          title: '处理概述',
          type: 'text',
          required: true
        },
        {
          title: '网格统计',
          type: 'table',
          required: true
        },
        {
          title: '质量分析',
          type: 'chart',
          required: true
        },
        {
          title: '原始图像',
          type: 'image',
          required: false
        },
        {
          title: '网格结果',
          type: 'image',
          required: false
        },
        {
          title: '技术参数',
          type: 'table',
          required: true
        },
        {
          title: '处理建议',
          type: 'summary',
          required: true
        }
      ]
    }
  ]

  getTemplates(): ReportTemplate[] {
    return this.templates
  }

  getTemplate(id: string): ReportTemplate | undefined {
    return this.templates.find(template => template.id === id)
  }

  generateReport(data: ReportData, options: ExportOptions): string {
    switch (options.format) {
      case 'html':
        return this.generateHTMLReport(data, options)
      case 'json':
        return this.generateJSONReport(data)
      case 'csv':
        return this.generateCSVReport(data)
      case 'pdf':
        return this.generatePDFReport(data, options)
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }
  }

  private generateHTMLReport(data: ReportData, options: ExportOptions): string {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .report-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .report-header {
            text-align: center;
            border-bottom: 2px solid #409EFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .report-header h1 {
            color: #303133;
            margin-bottom: 10px;
        }
        .report-meta {
            color: #606266;
            font-size: 14px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            color: #409EFF;
            border-left: 4px solid #409EFF;
            padding-left: 15px;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 600;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .data-table th,
        .data-table td {
            border: 1px solid #DCDFE6;
            padding: 12px;
            text-align: left;
        }
        .data-table th {
            background-color: #F5F7FA;
            font-weight: 600;
            color: #303133;
        }
        .data-table tr:nth-child(even) {
            background-color: #FAFAFA;
        }
        .report-image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin: 15px 0;
        }
        .chart-container {
            margin: 15px 0;
            padding: 20px;
            background-color: #FAFAFA;
            border-radius: 4px;
        }
        .summary-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .summary-box h4 {
            margin-top: 0;
            color: white;
        }
        @media print {
            body { background: white; }
            .report-container { box-shadow: none; padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>${data.title}</h1>
            <div class="report-meta">
                <p>作者: ${data.author}</p>
                <p>日期: ${data.date}</p>
                <p>${data.description}</p>
            </div>
        </div>
        
        ${data.sections.map(section => this.generateHTMLSection(section, options)).join('')}
    </div>
</body>
</html>`
    
    return html
  }

  private generateHTMLSection(section: ReportSection, options: ExportOptions): string {
    switch (section.type) {
      case 'text':
        return `
        <div class="section">
            <h3 class="section-title">${section.title}</h3>
            <div class="text-content">
                ${section.content || '<p>暂无内容</p>'}
            </div>
        </div>`
      
      case 'table':
        return `
        <div class="section">
            <h3 class="section-title">${section.title}</h3>
            ${this.generateHTMLTable(section.content)}
        </div>`
      
      case 'image':
        if (!options.includeImages) return ''
        return `
        <div class="section">
            <h3 class="section-title">${section.title}</h3>
            <img src="${section.content}" alt="${section.title}" class="report-image" />
        </div>`
      
      case 'chart':
        if (!options.includeCharts) return ''
        return `
        <div class="section">
            <h3 class="section-title">${section.title}</h3>
            <div class="chart-container">
                ${section.content || '<p>图表暂无内容</p>'}
            </div>
        </div>`
      
      case 'summary':
        return `
        <div class="section">
            <h3 class="section-title">${section.title}</h3>
            <div class="summary-box">
                <h4>关键发现</h4>
                ${section.content || '<p>暂无总结内容</p>'}
            </div>
        </div>`
      
      default:
        return ''
    }
  }

  private generateHTMLTable(data: any): string {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '<p>表格暂无数据</p>'
    }

    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      `<tr>${headers.map(header => `<td>${row[header] || '-'}</td>`).join('')}</tr>`
    ).join('')

    return `
    <table class="data-table">
        <thead>
            <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>`
  }

  private generateJSONReport(data: ReportData): string {
    return JSON.stringify(data, null, 2)
  }

  private generateCSVReport(data: ReportData): string {
    const csvLines: string[] = []
    
    csvLines.push(`报告标题,${data.title}`)
    csvLines.push(`作者,${data.author}`)
    csvLines.push(`日期,${data.date}`)
    csvLines.push(`描述,${data.description}`)
    csvLines.push('')

    data.sections.forEach(section => {
      csvLines.push(`章节,${section.title}`)
      
      if (section.type === 'table' && Array.isArray(section.content)) {
        const headers = Object.keys(section.content[0])
        csvLines.push(headers.join(','))
        section.content.forEach((row: any) => {
          csvLines.push(headers.map(header => row[header] || '').join(','))
        })
      } else {
        csvLines.push(`内容,${section.content || ''}`)
      }
      
      csvLines.push('')
    })

    return csvLines.join('\n')
  }

  private generatePDFReport(data: ReportData, options: ExportOptions): string {
    // 简化的PDF生成（实际项目中应使用专门的PDF库如jsPDF）
    const htmlContent = this.generateHTMLReport(data, options)
    
    // 这里应该调用PDF生成库将HTML转换为PDF
    // 为了演示，返回HTML内容，实际使用时需要集成PDF生成功能
    return htmlContent
  }

  createMaterialAnalysisReport(analysisData: any): ReportData {
    const currentDate = new Date().toLocaleDateString('zh-CN')
    
    return {
      title: `${analysisData.projectName || '材料分析报告'}`,
      author: analysisData.author || '系统用户',
      date: currentDate,
      description: `基于${analysisData.fileName || '未知文件'}的材料分析综合报告`,
      sections: [
        {
          title: '项目概述',
          type: 'text',
          content: analysisData.description || '本报告包含晶体结构分析、图像处理和网格化结果的详细分析。'
        },
        {
          title: '晶体结构数据',
          type: 'table',
          content: analysisData.crystalStructure || []
        },
        {
          title: '元素组成分析',
          type: 'chart',
          content: analysisData.compositionChart || ''
        },
        {
          title: '网格统计信息',
          type: 'table',
          content: analysisData.meshStatistics || []
        },
        {
          title: '分析结论',
          type: 'summary',
          content: analysisData.conclusion || '分析完成，详细结果请参见各章节。'
        }
      ]
    }
  }

  createCrystalStructureReport(crystalData: any): ReportData {
    const currentDate = new Date().toLocaleDateString('zh-CN')
    
    return {
      title: `${crystalData.materialName || '晶体结构分析报告'}`,
      author: crystalData.author || '系统用户',
      date: currentDate,
      description: `基于${crystalData.fileName || 'CIF文件'}的晶体结构详细分析`,
      sections: [
        {
          title: '结构描述',
          type: 'text',
          content: crystalData.description || '晶体结构分析已完成。'
        },
        {
          title: '晶胞参数',
          type: 'table',
          content: crystalData.cellParameters || []
        },
        {
          title: '原子坐标',
          type: 'table',
          content: crystalData.atomicPositions || []
        },
        {
          title: '键长分布',
          type: 'chart',
          content: crystalData.bondLengthChart || ''
        },
        {
          title: '结构特征总结',
          type: 'summary',
          content: crystalData.summary || '晶体结构特征分析完成。'
        }
      ]
    }
  }

  createImageMeshingReport(meshData: any): ReportData {
    const currentDate = new Date().toLocaleDateString('zh-CN')
    
    return {
      title: `${meshData.projectName || '图像网格化报告'}`,
      author: meshData.author || '系统用户',
      date: currentDate,
      description: `基于${meshData.fileName || 'TIF图像'}的网格化处理分析`,
      sections: [
        {
          title: '图像描述',
          type: 'text',
          content: meshData.description || '图像网格化处理已完成。'
        },
        {
          title: '图像参数',
          type: 'table',
          content: meshData.imageParameters || []
        },
        {
          title: '网格统计',
          type: 'table',
          content: meshData.meshStatistics || []
        },
        {
          title: '网格质量分布',
          type: 'chart',
          content: meshData.qualityChart || ''
        },
        {
          title: '网格化评估',
          type: 'summary',
          content: meshData.evaluation || '网格化质量评估完成。'
        }
      ]
    }
  }
}

export const reportGenerator = new ReportGenerator()