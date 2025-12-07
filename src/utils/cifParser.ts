// file: cif-parser.ts
/* Minimal docs at top. Exported API:
   - CifParser.parse(content, filename?) -> CifData (first data_ block)
   - CifParser.parseAll(content, filename?) -> CifData[]
*/

export interface CifAtom {
  element: string
  x: number | null
  y: number | null
  z: number | null
  occupancy: number | null
  thermal_factor: number | null
  label?: string
  symmetry?: string
  [key: string]: any
}

export interface CifCellParameters {
  a: number | null
  b: number | null
  c: number | null
  alpha: number | null
  beta: number | null
  gamma: number | null
  volume?: number | null
}

export interface CifSymmetry {
  space_group_name_hm?: string
  space_group_name_hall?: string
  symmetry_cell_setting?: string
  symmetry_space_group_name_h_m?: string
  symmetry_equiv_pos_as_xyz?: string[]
  [key: string]: any
}

export interface CifData {
  filename?: string
  block_id?: string
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
    raw_keys?: string[] // keys encountered in block
  }
  _raw?: { [key: string]: any } // keep raw items if needed
}

type Token = string

export class CifParser {
  private static readonly VERSION = '2.0.0-ts-refactor'

  // Public: parse first data block
  static parse(content: string, filename?: string): CifData {
    const blocks = this.parseAll(content, filename)
    if (blocks.length === 0) {
      throw new Error('No data_ blocks found in CIF content')
    }
    return blocks[0]
  }

  // Public: parse all data blocks
  static parseAll(content: string, filename?: string): CifData[] {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid or empty CIF content')
    }

    const lines = content.split(/\r?\n/)
    const parserState = new CIFTokenizer(lines)
    const blocks: CifData[] = []

    while (!parserState.eof()) {
      const token = parserState.peekToken()
      if (!token) break

      if (token.toLowerCase().startsWith('data_')) {
        const blockId = parserState.nextToken()!
        const block = this.parseDataBlock(parserState, blockId, filename)
        blocks.push(block)
      } else {
        // skip stray tokens until next data_
        parserState.nextToken()
      }
    }

    return blocks
  }

  // Parse single data block given tokenizer after reading data_ id
  private static parseDataBlock(tokenizer: CIFTokenizer, blockId: string, filename?: string): CifData {
    const data: Partial<CifData> = {
      filename,
      block_id: blockId,
      atoms: [],
      _raw: {},
      metadata: {
        parse_date: new Date().toISOString(),
        parser_version: this.VERSION,
        warnings: []
      }
    }

    // accumulate simple tags and loops until next data_ or EOF
    while (!tokenizer.eof()) {
      const tk = tokenizer.peekToken()
      if (!tk) break
      if (tk.toLowerCase().startsWith('data_')) break

      if (tk.toLowerCase() === 'loop_') {
        tokenizer.nextToken() // consume loop_
        // collect labels (tokens starting with '_')
        const labels: string[] = []
        while (!tokenizer.eof() && tokenizer.peekToken() && tokenizer.peekToken()!.startsWith('_')) {
          labels.push(tokenizer.nextToken()!)
        }
        if (labels.length === 0) {
          data.metadata!.warnings.push('Found loop_ with no labels')
          continue
        }
        // collect rows until next tag (startsWith '_') or next 'loop_' or 'data_' or EOF
        const rows: Token[][] = []
        while (!tokenizer.eof()) {
          const next = tokenizer.peekToken()
          if (!next) break
          if (next === 'loop_' || next.startsWith('_') || next.toLowerCase().startsWith('data_')) break
          // read one row: number of tokens equal to labels length (but rows may be split across lines)
          const row: Token[] = []
          for (let i = 0; i < labels.length; i++) {
            const v = tokenizer.nextToken()
            if (v === undefined) break
            row.push(v)
          }
          if (row.length === 0) break
          rows.push(row)
        }
        this.handleLoop(labels, rows, data, tokenizer)
        continue
      }

      if (tk.startsWith('_')) {
        // simple tag/value
        const key = tokenizer.nextToken()!
        const value = tokenizer.nextToken() ?? ''
        this.assignSimpleTag(key, value, data)
        continue
      }

      // If we encounter a semicolon-only multiline marker at non-start, tokenizer handles it as token ';...'
      // Otherwise skip token
      tokenizer.nextToken()
    }

    // Post-process: map extracted raw data into typed CifData
    const cif: CifData = {
      filename: data.filename,
      block_id: data.block_id,
      title: (data as any)._raw?._title || (data as any)._raw?._publ_section_title || undefined,
      chemical_formula_sum: (data as any)._raw?._chemical_formula_sum,
      chemical_formula_moiety: (data as any)._raw?._chemical_formula_moiety,
      chemical_name: (data as any)._raw?._chemical_name_mineral || (data as any)._raw?._chemical_name_common,
      crystal_system: (data as any)._raw?._symmetry_cell_setting || (data as any)._raw?._space_group_crystal_system,
      cell_parameters: this.extractCellParams((data as any)._raw || {}),
      symmetry: this.extractSymmetry((data as any)._raw || {}),
      atoms: (data.atoms as CifAtom[]) || [],
      metadata: data.metadata!,
      _raw: data._raw
    }

    // compute cell volume if possible
    if (cif.cell_parameters && cif.cell_parameters.a && cif.cell_parameters.b && cif.cell_parameters.c &&
        cif.cell_parameters.alpha != null && cif.cell_parameters.beta != null && cif.cell_parameters.gamma != null) {
      try {
        cif.cell_parameters.volume = this.calculateCellVolume(cif.cell_parameters)
      } catch (err) {
        cif.metadata!.warnings.push('Cell volume calculation failed')
        cif.cell_parameters.volume = null
      }
    }

    // record encountered keys
    cif.metadata!.raw_keys = Object.keys(cif._raw || {})

    // sanity checks
    if (cif.atoms.length === 0) {
      cif.metadata!.warnings.push('No atoms parsed in block')
    }

    return cif
  }

  // Convert collected cell parameters (raw map) into typed object
  private static extractCellParams(raw: { [k: string]: any }): CifCellParameters | undefined {
    const maybe = (k: string) => {
      const v = raw[k] ?? raw[k.toLowerCase()]
      return v !== undefined ? this.parseNumericToken(String(v)) : null
    }
    const a = maybe('_cell_length_a') ?? maybe('_cell_length_a'.toLowerCase())
    const b = maybe('_cell_length_b')
    const c = maybe('_cell_length_c')
    const alpha = maybe('_cell_angle_alpha')
    const beta = maybe('_cell_angle_beta')
    const gamma = maybe('_cell_angle_gamma')
    if (a == null && b == null && c == null && alpha == null && beta == null && gamma == null) return undefined
    return { a: a ?? null, b: b ?? null, c: c ?? null, alpha: alpha ?? null, beta: beta ?? null, gamma: gamma ?? null }
  }

  private static extractSymmetry(raw: { [k: string]: any }): CifSymmetry | undefined {
    const s: CifSymmetry = {}
    if (raw['_symmetry_space_group_name_H-M']) s.space_group_name_hm = String(raw['_symmetry_space_group_name_H-M']).replace(/['"]/g,'')
    if (raw['_symmetry_space_group_name_Hall']) s.space_group_name_hall = String(raw['_symmetry_space_group_name_Hall']).replace(/['"]/g,'')
    if (raw['_symmetry_cell_setting']) s.symmetry_cell_setting = String(raw['_symmetry_cell_setting']).replace(/['"]/g,'')
    if (Object.keys(s).length === 0) return undefined
    return s
  }

  // Place a simple _tag value into data._raw
  private static assignSimpleTag(key: string, value: Token, data: Partial<CifData>) {
    if (!data._raw) data._raw = {}
    // keep original key-case but also lowercase alias
    data._raw[key] = value
    data._raw[key.toLowerCase()] = value
  }

  // Handle loop based on labels. Recognize atom loops by label prefix.
  private static handleLoop(labels: string[], rows: Token[][], data: Partial<CifData>, tokenizer: CIFTokenizer) {
    // Normalize labels
    const normalized = labels.map(l => l.trim())

    // store raw loop for later debugging
    if (!data._raw) data._raw = {}
    const loopId = normalized.join('|')
    data._raw[`loop:${loopId}`] = { labels: normalized, rows }

    // Heuristic: atom site loop (labels start with _atom_site_)
    if (normalized.some(l => l.toLowerCase().startsWith('_atom_site_'))) {
      const atoms = this.parseAtomLoop(normalized, rows, data.metadata!)
      data.atoms = (data.atoms || []).concat(atoms)
      return
    }

    // Other loop types can be captured raw
    // store each label values as arrays into _raw
    normalized.forEach((lab, idx) => {
      data._raw![lab] = rows.map(r => r[idx] ?? null)
    })
  }

  // Parse atom loop: label mapping -> build CifAtom objects
  private static parseAtomLoop(labels: string[], rows: Token[][], metadata: NonNullable<CifData['metadata']>): CifAtom[] {
    // create mapping from label -> index
    const idxByKey: { [key: string]: number } = {}
    labels.forEach((l, i) => { idxByKey[l.toLowerCase()] = i })

    const get = (row: Token[], keyCandidates: string[]): string | null => {
      for (const candidate of keyCandidates) {
        const idx = idxByKey[candidate.toLowerCase()]
        if (idx !== undefined && row[idx] !== undefined) return row[idx]
      }
      return null
    }

    const atoms: CifAtom[] = []
    for (const row of rows) {
      try {
        const label = get(row, ['_atom_site_label']) || undefined
        const typeSym = get(row, ['_atom_site_type_symbol', '_atom_site_type']) || undefined
        const xtok = get(row, ['_atom_site_fract_x', '_atom_site_Cartn_x'])
        const ytok = get(row, ['_atom_site_fract_y', '_atom_site_Cartn_y'])
        const ztok = get(row, ['_atom_site_fract_z', '_atom_site_Cartn_z'])
        const occTok = get(row, ['_atom_site_occupancy'])
        const uTok = get(row, ['_atom_site_U_iso_or_equiv', '_atom_site_B_iso_or_equiv'])

        const atom: CifAtom = {
          element: (typeSym ?? (label ? label[0] : 'C')) as string,
          x: xtok ? this.parseNumericToken(xtok) : null,
          y: ytok ? this.parseNumericToken(ytok) : null,
          z: ztok ? this.parseNumericToken(ztok) : null,
          occupancy: occTok ? this.parseNumericToken(occTok) : null,
          thermal_factor: uTok ? this.parseNumericToken(uTok) : null
        }

        if (label) atom.label = label
        const sym = get(row, ['_atom_site_symmetry_multiplicity', '_atom_site_symmetry_ops', '_atom_site_site_symmetry'])
        if (sym) atom.symmetry = sym

        // include any extra fields present in loop row
        labels.forEach((lab, idx) => {
          const key = lab.replace(/^_/, '')
          if (!atom.hasOwnProperty(key) && row[idx] !== undefined) {
            atom[key] = row[idx]
          }
        })

        atoms.push(atom)
      } catch (err) {
        metadata.warnings.push(`Failed to parse atom row: ${row.join(' ')}`)
      }
    }

    return atoms
  }

  // Parse numeric tokens handling uncertainties and missing values
  private static parseNumericToken(tok: string): number | null {
    if (tok === '.' || tok === '?' || tok === '' || tok === undefined || tok === null) return null
    // semicolon multi-line tokens start with ';' are already handled; here we just sanitize
    let s = String(tok).trim()
    // remove surrounding quotes
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
      s = s.substring(1, s.length - 1)
    }
    // remove uncertainty parentheses 1.234(5) -> 1.234
    s = s.replace(/\([^\)]*\)/g, '')
    // some CIFs use comma as decimal (rare) - don't auto convert; keep parseFloat standard
    const n = Number.parseFloat(s)
    if (Number.isFinite(n)) return n
    // try integer parse
    const ni = Number.parseInt(s, 10)
    if (!Number.isNaN(ni)) return ni
    return null
  }

  // Compute cell volume
  private static calculateCellVolume(cell: CifCellParameters): number {
    const a = cell.a ?? 0
    const b = cell.b ?? 0
    const c = cell.c ?? 0
    const alpha = (cell.alpha ?? 90) * Math.PI / 180
    const beta = (cell.beta ?? 90) * Math.PI / 180
    const gamma = (cell.gamma ?? 90) * Math.PI / 180
    const val = a * b * c * Math.sqrt(
      1 - Math.cos(alpha) * Math.cos(alpha) -
      Math.cos(beta) * Math.cos(beta) -
      Math.cos(gamma) * Math.cos(gamma) +
      2 * Math.cos(alpha) * Math.cos(beta) * Math.cos(gamma)
    )
    // round to 6 decimals
    return Math.round(val * 1e6) / 1e6
  }
}

/* ---------- Helper: tokenizer that understands CIF token rules:
   - tokens separated by whitespace
   - quoted tokens (single/double)
   - semicolon multiline values: a line that begins with ';' starts a value which continues
     until a line that is exactly ';' (RFC-like)
   - preserves order and returns tokens one by one
*/
class CIFTokenizer {
  private pos = 0
  private tokens: Token[] = []

  constructor(private lines: string[]) {
    this.tokenize()
  }

  eof(): boolean {
    return this.pos >= this.tokens.length
  }

  peekToken(): Token | null {
    return this.tokens[this.pos] ?? null
  }

  nextToken(): Token | undefined {
    const t = this.tokens[this.pos]
    if (t === undefined) return undefined
    this.pos++
    return t
  }

  private tokenize() {
    const out: Token[] = []
    const L = this.lines.length
    let i = 0
    while (i < L) {
      const raw = this.lines[i]
      if (raw === undefined) { i++; continue }
      const line = raw.replace(/\r?\n$/, '')

      // semicolon multiline: line starting with ';' (leading whitespace allowed)?
      if (/^\s*;/.test(line)) {
        // start of multiline value: consume until a line that is exactly ';' (possibly with whitespace)
        const contentLines: string[] = []
        // If the line is exactly ';' then empty content until next ';' line
        // The convention: semicolon at line start marks open; everything up to next line starting with ';' is content
        // We'll remove leading initial ';'
        let first = line.replace(/^\s*;/, '')
        // if the first line had content after the initial ';', include it
        if (first.length > 0) contentLines.push(first)
        i++
        let closed = false
        while (i < L) {
          const l2 = this.lines[i]
          if (/^\s*;/.test(l2)) { closed = true; break }
          contentLines.push(l2)
          i++
        }
        // advance past closing ';' if present
        if (i < L && /^\s*;/.test(this.lines[i])) {
          i++
        }
        out.push(contentLines.join('\n'))
        continue
      }

      // otherwise parse token-by-token on the line
      let j = 0
      const len = line.length
      while (j < len) {
        // skip whitespace
        if (/\s/.test(line[j])) { j++; continue }

        // comment: line starting with '#' -> skip rest of line
        if (line[j] === '#') break

        // quoted token
        if (line[j] === "'" || line[j] === '"') {
          const quote = line[j]
          j++
          let buf = ''
          while (j < len) {
            if (line[j] === quote) {
              // handle escaped quote by doubling (CIF uses '' to represent ' inside single-quoted string)
              if (j + 1 < len && line[j + 1] === quote) {
                buf += quote
                j += 2
                continue
              }
              j++
              break
            }
            buf += line[j]
            j++
          }
          out.push(buf)
          continue
        }

        // unquoted token: read until whitespace or comment char
        let tok = ''
        while (j < len && !/\s/.test(line[j])) {
          if (line[j] === '#') break
          tok += line[j]
          j++
        }
        out.push(tok)
      }

      i++
    }

    this.tokens = out
  }
}
