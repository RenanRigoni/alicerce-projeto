import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib'

const FOOTER_FONT_SIZE = 6
const FOOTER_MARGIN_X = 36
const FOOTER_MARGIN_Y = 14

async function inserirRodapeHash(pdfDoc: PDFDocument, page: PDFPage, hash: string) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const texto = `Autenticacao Alicerce SHA-256: ${hash}`
  const { width } = page.getSize()

  page.drawText(texto, {
    x: FOOTER_MARGIN_X,
    y: FOOTER_MARGIN_Y,
    size: FOOTER_FONT_SIZE,
    font,
    color: rgb(0.48, 0.48, 0.48),
    opacity: 0.78,
    maxWidth: width - FOOTER_MARGIN_X * 2,
  })
}

export async function inserirHashNoRodapePdf(
  pdfBytes: Uint8Array,
  hash: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  for (const page of pdfDoc.getPages()) {
    await inserirRodapeHash(pdfDoc, page, hash)
  }

  const stampedBytes = await pdfDoc.save()
  return Buffer.from(stampedBytes)
}

export async function criarPdfAutenticadoDeImagem(
  imageBytes: Uint8Array,
  fileName: string,
  hash: string
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

  await inserirRodapeHash(pdfDoc, page, hash)

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
