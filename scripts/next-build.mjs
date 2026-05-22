import { spawn } from 'node:child_process'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const env = { ...process.env }

if (env.NEXT_ADAPTER_PATH && env.VERCEL === '1') {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
  env.VERCEL_NEXT_ORIGINAL_ADAPTER_PATH = env.NEXT_ADAPTER_PATH
  env.VERCEL_NEXT_PROJECT_DIR = process.cwd()
  env.NEXT_ADAPTER_PATH = path.join(scriptsDir, 'vercel-next-adapter-shim.mjs')
}

const nextBin = require.resolve('next/dist/bin/next')
const child = spawn(process.execPath, [nextBin, 'build'], {
  env,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
