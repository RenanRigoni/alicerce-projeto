import path from 'node:path'
import { pathToFileURL } from 'node:url'

let adapterPromise

async function loadOriginalAdapter() {
  const adapterPath = process.env.VERCEL_NEXT_ORIGINAL_ADAPTER_PATH
  if (!adapterPath) {
    throw new Error('VERCEL_NEXT_ORIGINAL_ADAPTER_PATH is not set')
  }

  const specifier = path.isAbsolute(adapterPath)
    ? pathToFileURL(adapterPath).href
    : adapterPath

  adapterPromise ??= import(specifier).then((mod) => mod.default ?? mod)
  return adapterPromise
}

export const name = 'Vercel'

export async function modifyConfig(config, ctx = {}) {
  const adapter = await loadOriginalAdapter()
  if (typeof adapter.modifyConfig !== 'function') return config

  return adapter.modifyConfig(config, {
    ...ctx,
    projectDir: ctx.projectDir ?? process.env.VERCEL_NEXT_PROJECT_DIR ?? process.cwd(),
  })
}

export async function onBuildComplete(args) {
  const adapter = await loadOriginalAdapter()
  if (typeof adapter.onBuildComplete !== 'function') return undefined
  return adapter.onBuildComplete(args)
}

const shim = {
  name,
  modifyConfig,
  onBuildComplete,
}

export default shim
