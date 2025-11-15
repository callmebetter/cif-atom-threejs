import UTIF from 'utif'

export interface TifImageInfo {
  width: number
  height: number
  bitsPerSample: number
  samplesPerPixel: number
  photometricInterpretation: number
  compression: number
  stripOffsets: number[]
  stripByteCounts: number[]
  rowsPerStrip: number
  imageDescription?: string
}

export class TifParser {
  static async parseTif(arrayBuffer: ArrayBuffer): Promise<{
    info: TifImageInfo
    imageData: ImageData
  }> {
    try {
      // Parse the TIFF file
      const ifds = UTIF.decode(arrayBuffer)
      
      if (ifds.length === 0) {
        throw new Error('No TIFF pages found')
      }
      
      // Get the first page
      const page = ifds[0]
      
      // Extract image information
      const info: TifImageInfo = {
        width: page.width || 0,
        height: page.height || 0,
        bitsPerSample: page.bitsPerSample?.[0] || 8,
        samplesPerPixel: page.samplesPerPixel || 1,
        photometricInterpretation: page.photometricInterpretation || 0,
        compression: page.compression || 1,
        stripOffsets: page.stripOffsets || [],
        stripByteCounts: page.stripByteCounts || [],
        rowsPerStrip: page.rowsPerStrip || page.height,
        imageDescription: page.imageDescription
      }
      
      // Decode the image
      UTIF.decodeImage(arrayBuffer, page)
      
      // Get RGBA data
      const rgba = UTIF.toRGBA8(page)
      
      // Create ImageData
      const imageData = new ImageData(
        new Uint8ClampedArray(rgba),
        info.width,
        info.height
      )
      
      return { info, imageData }
    } catch (error) {
      throw new Error(`TIF parsing failed: ${error}`)
    }
  }
  
  static async createCanvasFromTif(arrayBuffer: ArrayBuffer): Promise<{
    canvas: HTMLCanvasElement
    info: TifImageInfo
  }> {
    const { info, imageData } = await this.parseTif(arrayBuffer)
    
    const canvas = document.createElement('canvas')
    canvas.width = info.width
    canvas.height = info.height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    return { canvas, info }
  }
  
  static validateTifFile(file: ArrayBuffer): boolean {
    try {
      // Check TIFF signature
      const view = new DataView(file)
      const signature = view.getUint16(0, false) // Big endian
      
      // TIFF files start with II (0x4949) or MM (0x4D4D)
      return signature === 0x4949 || signature === 0x4D4D
    } catch {
      return false
    }
  }
}