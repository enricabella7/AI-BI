import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')

// ── Shared build state (lives in Vite server process) ──────────────────────
let buildState = { status: 'idle', log: [], outDir: null, error: null }

function figmaRenderPlugin() {
  return {
    name: 'figma-render',
    configureServer(server) {

      // ── POST /api/upload ─────────────────────────────────────────────────
      // Accepts raw zip binary (Content-Type: application/zip)
      server.middlewares.use('/api/upload', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }

        const chunks = []
        req.on('data', chunk => chunks.push(chunk))
        req.on('end', async () => {
          try {
            const buf = Buffer.concat(chunks)

            // Clean up previous temp dir
            if (buildState.outDir) {
              const prevWork = path.dirname(buildState.outDir)
              fs.rm(prevWork, { recursive: true, force: true }, () => {})
            }

            buildState = { status: 'extracting', log: ['Extracting zip...'], outDir: null, error: null }

            const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'figma-'))
            const zip = new AdmZip(buf)
            zip.extractAllTo(workDir, /*overwrite*/ true)

            buildState.log.push(`Extracted to temp directory.`)
            buildState.status = 'installing'

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))

            // Kick off install + build in background
            runBuild(workDir).catch(console.error)
          } catch (err) {
            buildState = { status: 'error', log: buildState.log, outDir: null, error: err.message }
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // ── GET /api/status ──────────────────────────────────────────────────
      server.middlewares.use('/api/status', (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          status: buildState.status,
          log: buildState.log.slice(-30),
          error: buildState.error,
        }))
      })

      // ── GET /preview/* ───────────────────────────────────────────────────
      // Serves the built Figma Make output
      server.middlewares.use('/preview', (req, res) => {
        if (!buildState.outDir || buildState.status !== 'ready') {
          res.statusCode = 503
          res.end('Preview not ready')
          return
        }

        let urlPath = (req.url || '/').split('?')[0]
        if (urlPath === '' || urlPath === '/') urlPath = '/index.html'

        const fullPath = path.join(buildState.outDir, urlPath)

        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
          // SPA fallback
          serveFile(path.join(buildState.outDir, 'index.html'), res)
          return
        }

        serveFile(fullPath, res)
      })
    },
  }
}

// ── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.json':  'application/json',
}

function serveFile(filePath, res) {
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404
    res.end('Not found')
    return
  }
  const ext = path.extname(filePath)
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  fs.createReadStream(filePath).pipe(res)
}

// ── Build pipeline ──────────────────────────────────────────────────────────
async function runBuild(workDir) {
  try {
    addLog('Installing dependencies (this may take a few minutes)...')
    await runCommand('npm', ['install', '--legacy-peer-deps'], workDir)

    buildState.status = 'building'
    addLog('Building project...')
    // Pass --base /preview/ so asset paths are correct when served under /preview/
    await runCommand('npm', ['run', 'build', '--', '--base', '/preview/'], workDir)

    const outDir = path.join(workDir, 'dist')
    buildState = {
      status: 'ready',
      log: [...buildState.log, '✓ Build complete — preview is ready!'],
      outDir,
      error: null,
    }
  } catch (err) {
    buildState = {
      status: 'error',
      log: [...buildState.log, `✗ Build failed: ${err.message}`],
      outDir: null,
      error: err.message,
    }
  }
}

function addLog(line) {
  buildState.log.push(line)
  if (buildState.log.length > 300) buildState.log.shift()
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: true,   // required on Windows for .cmd wrappers
      stdio: 'pipe',
    })

    const onData = (data) => {
      for (const line of data.toString().split('\n')) {
        const t = line.trim()
        if (t) addLog(t)
      }
    }

    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)

    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`exit code ${code}`)))
    proc.on('error', reject)
  })
}

export default defineConfig({
  plugins: [react(), figmaRenderPlugin()],
})
