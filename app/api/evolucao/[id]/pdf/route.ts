import { NextRequest } from 'next/server'
import {
  evolucaoPdfConfig,
  handleDocumentoClinicoPdfGet,
  handleDocumentoClinicoPdfPost,
} from '@/lib/pdf/documento-clinico-pdf'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return handleDocumentoClinicoPdfPost(request, id, evolucaoPdfConfig)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return handleDocumentoClinicoPdfGet(request, id, evolucaoPdfConfig)
}
