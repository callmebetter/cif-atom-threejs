import UTIF from 'utif'
import pako from 'pako'

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
  isCompressed?: boolean
  originalSize?: number
  compressedSize?: number
}

export class TifParser {
  // Compression constants
  private static readonly COMPRESSION_NONE = 1
  private static readonly COMPRESSION_CCITT1D = 2
  private static readonly COMPRESSION_GROUP3 = 3
  private static readonly COMPRESSION_GROUP4 = 4
  private static readonly COMPRESSION_LZW = 5
  private static readonly COMPRESSION_JPEG = 6
  private static readonly COMPRESSION_DEFLATE = 8
  private static readonly COMPRESSION_ADOBE_DEFLATE = 32946
  private static readonly COMPRESSION_PACKBITS = 32773

  static async parseTif(arrayBuffer: ArrayBuffer): Promise<{
    info: TifImageInfo
    imageData: ImageData
  }> {
    try {
      const originalSize = arrayBuffer.byteLength
      let processedBuffer = arrayBuffer
      let isCompressed = false
      let compressedSize = originalSize

      // Parse the TIFF file
      let ifds = UTIF.decode([processedBuffer])
      
      if (ifds.length === 0) {
        throw new Error('No TIFF pages found')
      }
      
      // Get the first page
      const page = ifds[0]
      
      // Check if compression needs special handling
      if (page.compression && page.compression !== this.COMPRESSION_NONE) {
        isCompressed = true
        
        // Handle deflate compression with pako
        if (page.compression === this.COMPRESSION_DEFLATE || 
            page.compression === this.COMPRESSION_ADOBE_DEFLATE) {
          processedBuffer = await this.handleDeflateCompression(processedBuffer, page)
        }
        
        // Re-parse after decompression
        ifds = UTIF.decode([processedBuffer])
        if (ifds.length === 0) {
          throw new Error('No TIFF pages found after decompression')
        }
      }
      
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
        imageDescription: page.imageDescription,
        isCompressed,
        originalSize,
        compressedSize: isCompressed ? compressedSize : undefined
      }
      
      // Decode the image
      UTIF.decodeImage(processedBuffer)

      // Get RGBA data
      const rgba = UTIF.toRGBA(page)

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

  private static async handleDeflateCompression(
    arrayBuffer: ArrayBuffer, 
    page: any
  ): Promise<ArrayBuffer> {
    // This method extracts compressed strips from the TIFF page and attempts
    // to decompress them using `pako`. It returns a combined ArrayBuffer of
    // the decompressed strips when successful. If no strips are found or all
    // decompression attempts fail, the original buffer is returned so that
    // upstream code can decide how to proceed.
    try {
      const strips: Uint8Array[] = []

      // Defensive access: ensure stripOffsets/stripByteCounts are arrays
      const offsets = Array.isArray(page?.stripOffsets) ? page.stripOffsets : []
      const counts = Array.isArray(page?.stripByteCounts) ? page.stripByteCounts : []

      for (let i = 0; i < offsets.length; i++) {
        const offset = offsets[i]
        const byteCount = counts[i] ?? 0

        if (typeof offset !== 'number' || byteCount <= 0) continue

        const compressedData = new Uint8Array(arrayBuffer, offset, byteCount)

        // Try inflate, then inflateRaw, fallback to original compressed chunk
        try {
          const decompressed = pako.inflate(compressedData)
          strips.push(decompressed)
        } catch (inflateError) {
          try {
            const decompressed = pako.inflateRaw(compressedData)
            strips.push(decompressed)
          } catch (rawError) {
            // If both decompression attempts fail, keep the original compressed
            // chunk so that callers can make a decision (we avoid throwing
            // here because some TIFFs use alternative packing that may be
            // handled later by UTIF or other logic).
            console.warn('Strip decompression failed; keeping compressed chunk', rawError)
            strips.push(compressedData)
          }
        }
      }

      if (strips.length === 0) {
        // Nothing decompressed — return original buffer
        return arrayBuffer
      }

      // Combine all strips into a single contiguous buffer
      const totalLength = strips.reduce((sum, strip) => sum + strip.length, 0)
      const combined = new Uint8Array(totalLength)
      let destOff = 0
      for (const s of strips) {
        combined.set(s, destOff)
        destOff += s.length
      }

      return combined.buffer
    } catch (error) {
      console.warn('handleDeflateCompression failed, returning original buffer', error)
      return arrayBuffer
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

  // Compress image data using pako
  static compressImageData(imageData: Uint8Array, level: number = 6): Uint8Array {
    try {
      return pako.deflate(imageData, { level: level as any })
    } catch (error) {
      throw new Error(`Image compression failed: ${error}`)
    }
  }

  // Decompress image data using pako
  static decompressImageData(compressedData: Uint8Array): Uint8Array {
    try {
      return pako.inflate(compressedData)
    } catch (error) {
      try {
        return pako.inflateRaw(compressedData)
      } catch (rawError) {
        throw new Error(`Image decompression failed: ${rawError}`)
      }
    }
  }

  // Get compression ratio information
  static getCompressionInfo(original: Uint8Array, compressed: Uint8Array): {
    originalSize: number
    compressedSize: number
    compressionRatio: number
    spaceSaved: number
  } {
    const originalSize = original.length
    const compressedSize = compressed.length
    const compressionRatio = originalSize / compressedSize
    const spaceSaved = ((originalSize - compressedSize) / originalSize) * 100

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      spaceSaved
    }
  }

  // Create compressed TIF data
  static async createCompressedTif(
    imageData: ImageData,
    compression: number = this.COMPRESSION_DEFLATE
  ): Promise<ArrayBuffer> {
    try {
      // Convert ImageData to raw data
      const rawData = new Uint8Array(imageData.data.buffer as ArrayBuffer)
      
      // Compress the data if needed
      let processedData = rawData as Uint8Array<ArrayBuffer>
      if (compression !== this.COMPRESSION_NONE) {
        processedData = this.compressImageData(rawData) as Uint8Array<ArrayBuffer>
      }

      // Create a simple TIF structure (this is a simplified implementation)
      // In practice, you'd want to use a more complete TIF writer
      const tifHeader = new ArrayBuffer(8 + processedData.length)
      const view = new DataView(tifHeader)
      
      // TIFF Header
      view.setUint16(0, 0x4D4D, false) // MM (Big endian)
      view.setUint16(2, 42, false)     // TIFF magic number
      view.setUint32(4, 8, false)      // Offset to first IFD

      // Note: This is a very simplified TIF creation
      // A complete implementation would need proper IFD structure
      // For production use, consider using a dedicated TIF library
      
      return tifHeader
    } catch (error) {
      throw new Error(`Compressed TIF creation failed: ${error}`)
    }
  }

  // Extract metadata from compressed TIF
  static extractCompressionMetadata(info: TifImageInfo): {
    compressionType: string
    isCompressed: boolean
    compressionRatio?: number
    spaceSaved?: string
  } {
    const compressionTypes: { [key: number]: string } = {
      [this.COMPRESSION_NONE]: 'None',
      [this.COMPRESSION_CCITT1D]: 'CCITT 1D',
      [this.COMPRESSION_GROUP3]: 'Group 3 Fax',
      [this.COMPRESSION_GROUP4]: 'Group 4 Fax',
      [this.COMPRESSION_LZW]: 'LZW',
      [this.COMPRESSION_JPEG]: 'JPEG',
      [this.COMPRESSION_DEFLATE]: 'Deflate',
      [this.COMPRESSION_ADOBE_DEFLATE]: 'Adobe Deflate',
      [this.COMPRESSION_PACKBITS]: 'PackBits'
    }

    const compressionType = compressionTypes[info.compression] || 'Unknown'
    const isCompressed = info.compression !== this.COMPRESSION_NONE

    let compressionRatio: number | undefined
    let spaceSaved: string | undefined

    if (isCompressed && info.originalSize && info.compressedSize) {
      compressionRatio = info.originalSize / info.compressedSize
      spaceSaved = `${((info.originalSize - info.compressedSize) / info.originalSize * 100).toFixed(1)}%`
    }

    return {
      compressionType,
      isCompressed,
      compressionRatio,
      spaceSaved
    }
  }

  
}