import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { readFileSync } from 'fs'
import { join } from 'path'

const FOOTER_FONT_SIZE = 6
const FOOTER_MARGIN_X = 36
const FOOTER_MARGIN_Y = 14

export interface InfoAutenticacao {
  hash: string
  terapeuta?: string
  conselho?: string
  autenticacaoEm?: string
}

function lerLogoBytes(): Uint8Array | null {
  try {
    return new Uint8Array(readFileSync(join(process.cwd(), 'public', 'logo_hor.png')))
  } catch {
    return null
  }
}

async function inserirLogoEMarcaDagua(pdfDoc: PDFDocument, pages: PDFPage[]) {
  const logoBytes = lerLogoBytes()
  if (!logoBytes) return

  const logo = await pdfDoc.embedPng(logoBytes)

  for (const page of pages) {
    const { width, height } = page.getSize()

    // Logo no cabeçalho (canto superior esquerdo)
    const logoH = 28
    const logoW = logo.width * (logoH / logo.height)
    page.drawImage(logo, {
      x: FOOTER_MARGIN_X,
      y: height - FOOTER_MARGIN_X - logoH,
      width: logoW,
      height: logoH,
      opacity: 1,
    })

    // Marca d'água centralizada (~5% opacidade)
    const wmW = width * 0.65
    const wmH = logo.height * (wmW / logo.width)
    page.drawImage(logo, {
      x: (width - wmW) / 2,
      y: (height - wmH) / 2,
      width: wmW,
      height: wmH,
      opacity: 0.05,
    })
  }
}

async function inserirRodapeHash(pdfDoc: PDFDocument, page: PDFPage, info: InfoAutenticacao) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const { width } = page.getSize()
  const maxW = width - FOOTER_MARGIN_X * 2

  page.drawText(`Autenticacao Alicerce SHA-256: ${info.hash}`, {
    x: FOOTER_MARGIN_X,
    y: FOOTER_MARGIN_Y,
    size: FOOTER_FONT_SIZE,
    font,
    color: rgb(0.48, 0.48, 0.48),
    opacity: 0.78,
    maxWidth: maxW,
  })

  if (info.terapeuta || info.autenticacaoEm) {
    const partes: string[] = []
    if (info.terapeuta) partes.push(info.terapeuta)
    if (info.conselho) partes.push(info.conselho)
    if (info.autenticacaoEm) partes.push(`Autenticado em: ${info.autenticacaoEm}`)
    page.drawText(partes.join(' | '), {
      x: FOOTER_MARGIN_X,
      y: FOOTER_MARGIN_Y + 8,
      size: FOOTER_FONT_SIZE,
      font,
      color: rgb(0.48, 0.48, 0.48),
      opacity: 0.78,
      maxWidth: maxW,
    })
  }
}

export async function inserirHashNoRodapePdf(
  pdfBytes: Uint8Array,
  info: InfoAutenticacao
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()

  await inserirLogoEMarcaDagua(pdfDoc, pages)
  for (const page of pages) {
    await inserirRodapeHash(pdfDoc, page, info)
  }

  const stampedBytes = await pdfDoc.save()
  return Buffer.from(stampedBytes)
}

export async function criarPdfAutenticadoDeImagem(
  imageBytes: Uint8Array,
  fileName: string,
  info: InfoAutenticacao
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const lowerName = fileName.toLowerCase()
  const image = lowerName.endsWith('.png')
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes)

  const { width, height } = page.getSize()
  const margin = 36
  const footerSpace = 36
  const maxWidth = width - margin * 2
  const maxHeight = height - margin * 2 - footerSpace
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
  const scaled = image.scale(scale)

  page.drawImage(image, {
    x: (width - scaled.width) / 2,
    y: footerSpace + margin + (maxHeight - scaled.height) / 2,
    width: scaled.width,
    height: scaled.height,
  })

  await inserirLogoEMarcaDagua(pdfDoc, [page])
  await inserirRodapeHash(pdfDoc, page, info)

  const stampedBytes = await pdfDoc.save()
  return Buffer.from(stampedBytes)
}

export function isPdfPath(path: string): boolean {
  return path.toLowerCase().split('?')[0].endsWith('.pdf')
}

export function isImagePath(path: string): boolean {
  const cleanPath = path.toLowerCase().split('?')[0]
  return cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg') || cleanPath.endsWith('.png')
}
