'use client'

/**
 * Lê o PDF do manual no próprio celular/navegador e devolve só as páginas que falam de
 * revisão/manutenção. Assim o arquivo grande não sobe para o servidor, só o texto que importa.
 */
const KEYWORDS = [
  /revis[aã]o|revis[oõ]es/gi,
  /manuten[cç][aã]o/gi,
  /\b\d{1,3}[.\s]?000\s?km\b/gi,
  /troca|substitu/gi,
  /[oó]leo|filtro|correia|velas?|fluido|arrefecimento|pastilha/gi,
  /meses|anos|o que ocorrer primeiro/gi,
]

export type ManualExtract = { text: string; pages: number; usedPages: number; scanned: boolean }

export async function extractManualText(file: File, onProgress?: (p: number) => void): Promise<ManualExtract> {
  // build "legacy": funciona também em WebViews Android mais antigos
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const scored: { page: number; text: string; score: number }[] = []
  let totalChars = 0

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const text = content.items
      .map((i) => ('str' in i ? i.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    totalChars += text.length
    const score = KEYWORDS.reduce((a, re) => a + (text.match(re)?.length ?? 0), 0)
    if (score >= 4) scored.push({ page: p, text, score })
    onProgress?.(p / doc.numPages)
  }

  // pega as páginas mais relevantes até ~70 mil caracteres, mantendo a ordem do manual
  const chosen: typeof scored = []
  let size = 0
  for (const s of [...scored].sort((a, b) => b.score - a.score)) {
    if (size + s.text.length > 70000) continue
    chosen.push(s)
    size += s.text.length
  }
  chosen.sort((a, b) => a.page - b.page)

  return {
    text: chosen.map((c) => `[página ${c.page}]\n${c.text}`).join('\n\n'),
    pages: doc.numPages,
    usedPages: chosen.length,
    scanned: totalChars < doc.numPages * 40, // quase sem texto: PDF escaneado (imagem)
  }
}
