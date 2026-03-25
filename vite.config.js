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

// ── Shared server state ──────────────────────────────────────────────────────
let buildState = { status: 'idle', log: [], outDir: null, workDir: null, error: null }
let dataOverrides = {} // CSS selector → replacement text (for runtime data injection)

function figmaRenderPlugin() {
  return {
    name: 'figma-render',
    configureServer(server) {

      // ── POST /api/upload ─────────────────────────────────────────────────
      server.middlewares.use('/api/upload', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        collectBody(req).then(async (buf) => {
          try {
            if (buildState.outDir) {
              fs.rm(path.dirname(buildState.outDir), { recursive: true, force: true }, () => {})
            }
            buildState = { status: 'extracting', log: ['Extracting zip...'], outDir: null, workDir: null, error: null }
            dataOverrides = {}

            const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'figma-'))
            const zip = new AdmZip(buf)
            zip.extractAllTo(workDir, true)
            addLog('Extracted to temp directory.')
            buildState.status = 'installing'

            json(res, { ok: true })
            runBuild(workDir).catch(console.error)
          } catch (err) {
            buildState = { ...buildState, status: 'error', error: err.message }
            json(res, { error: err.message }, 500)
          }
        })
      })

      // ── GET /api/status ──────────────────────────────────────────────────
      server.middlewares.use('/api/status', (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        json(res, { status: buildState.status, log: buildState.log.slice(-30), error: buildState.error })
      })

      // ── GET /api/data-state ──────────────────────────────────────────────
      // Called by the injected script inside the preview iframe
      server.middlewares.use('/api/data-state', (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        json(res, { overrides: dataOverrides })
      })

      // ── POST /api/data-override ──────────────────────────────────────────
      // Called by the app when data mappings change: { overrides: { selector: value } }
      server.middlewares.use('/api/data-override', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        collectBody(req).then(buf => {
          try {
            dataOverrides = JSON.parse(buf.toString()).overrides || {}
            json(res, { ok: true })
          } catch (err) { json(res, { error: err.message }, 400) }
        })
      })

      // ── POST /api/ai-modify ──────────────────────────────────────────────
      // { apiKey, request } → reads source files, calls Claude, patches files, rebuilds
      server.middlewares.use('/api/ai-modify', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        collectBody(req).then(buf => {
          try {
            const { apiKey, request: userRequest } = JSON.parse(buf.toString())
            if (!buildState.workDir) {
              json(res, { error: 'No project loaded — upload a Figma Make ZIP first.' }, 400); return
            }
            if (!apiKey?.trim()) {
              json(res, { error: 'Anthropic API key required.' }, 400); return
            }
            json(res, { ok: true })
            runAiModify(apiKey.trim(), userRequest, buildState.workDir).catch(console.error)
          } catch (err) { json(res, { error: err.message }, 400) }
        })
      })

      // ── GET /preview/* ───────────────────────────────────────────────────
      server.middlewares.use('/preview', (req, res) => {
        const previewReady = buildState.outDir &&
          (buildState.status === 'ready' || buildState.status === 'modifying')
        if (!previewReady) { res.statusCode = 503; res.end('Preview not ready'); return }

        let urlPath = (req.url || '/').split('?')[0]
        if (urlPath === '' || urlPath === '/') urlPath = '/index.html'

        const fullPath = path.join(buildState.outDir, urlPath)
        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
          serveFile(path.join(buildState.outDir, 'index.html'), res)
          return
        }
        serveFile(fullPath, res)
      })
    },
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function json(res, body, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.mjs': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json',
}

// Script injected into every HTML page served under /preview/
// Handles: (1) runtime data overrides via CSS selectors, (2) element-pick mode
const PREVIEW_INJECT = `
<script>
(function() {
  var current = {};

  function applyOverrides(overrides) {
    current = overrides;
    Object.entries(overrides).forEach(function([sel, val]) {
      try {
        document.querySelectorAll(sel).forEach(function(el) {
          if (el.children.length === 0) el.textContent = val;
        });
      } catch(e) {}
    });
  }

  // MutationObserver reapplies overrides after React re-renders
  var observer = new MutationObserver(function() {
    if (Object.keys(current).length) applyOverrides(current);
  });

  document.addEventListener('DOMContentLoaded', function() {
    observer.observe(document.body, { childList: true, subtree: true });
  });

  function fetchAndApply() {
    fetch('/api/data-state').then(function(r) { return r.json(); })
      .then(function(d) { applyOverrides(d.overrides || {}); })
      .catch(function() {});
  }
  fetchAndApply();
  setInterval(fetchAndApply, 1500);

  // Element-pick mode (triggered by parent via postMessage)
  window.addEventListener('message', function(e) {
    if (!e.data) return;

    if (e.data.type === 'ENABLE_SELECT_MODE') {
      document.body.style.cursor = 'crosshair';
      document.body.style.outline = '3px solid #6366f1';
      document.body.style.outlineOffset = '-3px';

      var over = null;
      function onOver(ev) {
        if (over) over.style.outline = '';
        over = ev.target;
        over.style.outline = '2px solid #6366f1';
      }
      function onClick(ev) {
        ev.preventDefault(); ev.stopPropagation();
        var el = ev.target;
        if (over) over.style.outline = '';
        document.body.style.cursor = '';
        document.body.style.outline = '';
        document.removeEventListener('mouseover', onOver, true);
        document.removeEventListener('click', onClick, true);
        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          selector: buildSelector(el),
          text: (el.textContent || '').trim().slice(0, 60)
        }, '*');
      }
      document.addEventListener('mouseover', onOver, true);
      document.addEventListener('click', onClick, true);
    }

    if (e.data.type === 'DISABLE_SELECT_MODE') {
      document.body.style.cursor = '';
      document.body.style.outline = '';
    }
  });

  function buildSelector(el) {
    if (el.id) return '#' + el.id;
    var parts = [];
    var cur = el;
    while (cur && cur !== document.documentElement) {
      var tag = cur.tagName.toLowerCase();
      var cls = Array.from(cur.classList).slice(0, 2).join('.');
      var part = cls ? tag + '.' + cls : tag;
      var parent = cur.parentElement;
      if (parent) {
        var sibs = Array.from(parent.children).filter(function(c) { return c.tagName === cur.tagName; });
        if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      if (parts.length >= 4) break;
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }
})();
</script>`

function serveFile(filePath, res) {
  if (!fs.existsSync(filePath)) { res.statusCode = 404; res.end('Not found'); return }
  const ext = path.extname(filePath)
  if (ext === '.html') {
    let html = fs.readFileSync(filePath, 'utf-8')
    html = html.replace('</body>', PREVIEW_INJECT + '</body>')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(html)
    return
  }
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  fs.createReadStream(filePath).pipe(res)
}

// ── package.json patch ───────────────────────────────────────────────────────
function patchPackageJson(workDir) {
  const pkgPath = path.join(workDir, 'package.json')
  if (!fs.existsSync(pkgPath)) return
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.dependencies = pkg.dependencies || {}
  for (const [name, ver] of Object.entries(pkg.peerDependencies || {})) {
    if (!pkg.dependencies[name]) {
      pkg.dependencies[name] = ver
      addLog(`Promoted peer dep: ${name}@${ver}`)
    }
  }
  delete pkg.peerDependencies
  delete pkg.peerDependenciesMeta
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}

// ── Build pipeline ───────────────────────────────────────────────────────────
async function runBuild(workDir) {
  try {
    patchPackageJson(workDir)
    addLog('Installing dependencies (this may take a few minutes)...')
    await runCommand('npm', ['install', '--legacy-peer-deps'], workDir)

    buildState.status = 'building'
    addLog('Building project...')
    await runCommand('npm', ['run', 'build', '--', '--base', '/preview/'], workDir)

    buildState = {
      status: 'ready',
      log: [...buildState.log, '✓ Build complete — preview is ready!'],
      outDir: path.join(workDir, 'dist'),
      workDir,
      error: null,
    }
  } catch (err) {
    buildState = {
      status: 'error',
      log: [...buildState.log, `✗ Build failed: ${err.message}`],
      outDir: buildState.outDir,  // keep previous outDir if any
      workDir: buildState.workDir,
      error: err.message,
    }
  }
}

// ── AI modification pipeline ─────────────────────────────────────────────────
async function runAiModify(apiKey, userRequest, workDir) {
  const prevOutDir = buildState.outDir
  buildState = { ...buildState, status: 'modifying', error: null }
  addLog(`AI request: "${userRequest}"`)

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })

    const files = readSourceFiles(workDir)
    const filesBlock = Object.entries(files)
      .map(([p, c]) => `=== ${p} ===\n${c}`)
      .join('\n\n')

    addLog('Sending request to Claude...')
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      messages: [{
        role: 'user',
        content: `You are modifying a React + TypeScript + Tailwind CSS dashboard built with Figma Make.\n\nCurrent source files:\n${filesBlock}\n\nUser request: "${userRequest}"\n\nRespond with ONLY a JSON object: {"files": {"relative/path": "full new content"}}. Include ONLY files that need to change. No explanations, no markdown fences.`,
      }],
    })

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('Claude returned no JSON')

    const { files: changed } = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
    addLog(`Claude modified ${Object.keys(changed).length} file(s). Rebuilding...`)

    for (const [rel, content] of Object.entries(changed)) {
      const full = path.join(workDir, rel)
      await fsp.mkdir(path.dirname(full), { recursive: true })
      await fsp.writeFile(full, content, 'utf-8')
      addLog(`  Updated: ${rel}`)
    }

    buildState.status = 'building'
    await runCommand('npm', ['run', 'build', '--', '--base', '/preview/'], workDir)

    buildState = {
      status: 'ready',
      log: [...buildState.log, '✓ Design updated!'],
      outDir: path.join(workDir, 'dist'),
      workDir,
      error: null,
    }
  } catch (err) {
    // Restore preview if build was previously working
    buildState = {
      status: prevOutDir ? 'ready' : 'error',
      log: [...buildState.log, `✗ AI modify failed: ${err.message}`],
      outDir: prevOutDir,
      workDir,
      error: prevOutDir ? null : err.message,
    }
  }
}

function readSourceFiles(workDir) {
  const files = {}
  const roots = ['src/app/App.tsx', 'src/styles/theme.css', 'src/styles/index.css']

  // Custom components (skip the shadcn/ui sub-folder)
  const compDir = path.join(workDir, 'src/app/components')
  if (fs.existsSync(compDir)) {
    for (const entry of fs.readdirSync(compDir, { withFileTypes: true })) {
      if (entry.isFile() && /\.(tsx?|css)$/.test(entry.name)) {
        roots.push(`src/app/components/${entry.name}`)
      }
    }
  }

  for (const rel of roots) {
    const full = path.join(workDir, rel)
    if (fs.existsSync(full)) files[rel] = fs.readFileSync(full, 'utf-8')
  }
  return files
}

function addLog(line) {
  buildState.log.push(line)
  if (buildState.log.length > 300) buildState.log.shift()
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true, stdio: 'pipe' })
    const onData = d => d.toString().split('\n').forEach(l => { if (l.trim()) addLog(l.trim()) })
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`exit code ${code}`)))
    proc.on('error', reject)
  })
}

export default defineConfig({
  plugins: [react(), figmaRenderPlugin()],
})
