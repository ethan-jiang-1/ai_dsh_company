// playwright/chromium 定位的共享工具（本仓所有"真浏览器"检查的唯一实现）。
//
// 为什么抽出来：从 .pnpm store 里找 playwright、并在 playwright 期望的 chromium 版本缺席时
// 回退到缓存里最新一份可执行文件——这段逻辑有真实的坑（`Executable doesn't exist` 的形态、
// macOS app bundle 与 headless shell 的路径差异），复制第二份必然漂移。
// 出处：client-load-smoke.mjs（postmortem 0003 起的既有实现）。
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** 递归找 chromium 可执行文件（headless shell / macOS app bundle / chrome）。 */
function findExecutable(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const hit = findExecutable(path)
      if (hit !== undefined) return hit
    } else if (entry.name === 'chrome-headless-shell' || entry.name === 'Chromium' || entry.name === 'chrome') {
      return path
    }
  }
  return undefined
}

/**
 * 定位 playwright 的 chromium API：根 node_modules → .pnpm store（vendor 全树安装后存在）。
 * @param root - 仓库根（含 node_modules）。
 * @returns playwright 的 `chromium` 导出。
 */
export async function loadChromium(root) {
  const candidates = [join(root, 'node_modules/playwright/index.mjs')]
  const pnpmDir = join(root, 'node_modules/.pnpm')
  if (existsSync(pnpmDir)) {
    for (const name of readdirSync(pnpmDir).sort().reverse()) {
      if (name.startsWith('playwright@')) candidates.push(join(pnpmDir, name, 'node_modules/playwright/index.mjs'))
    }
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const mod = await import(pathToFileURL(candidate).href)
    if (mod.chromium !== undefined) return mod.chromium
  }
  throw new Error('找不到 playwright（先 `pnpm install`，guides/bootstrap）')
}

/** 启动 chromium：默认解析失败（缓存里没有期望版本）时，回退缓存里最新一份可执行文件。 */
export async function launchChromium(chromiumApi) {
  try {
    return await chromiumApi.launch()
  } catch (error) {
    if (!String(error).includes("Executable doesn't exist")) throw error
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), 'Library/Caches/ms-playwright')
    if (!existsSync(cache)) throw error
    const roots = readdirSync(cache)
      .filter(name => name.startsWith('chromium_headless_shell-') || name.startsWith('chromium-'))
      .sort().reverse()
    for (const root of roots) {
      const executable = findExecutable(join(cache, root))
      if (executable !== undefined) return await chromiumApi.launch({ executablePath: executable })
    }
    throw error
  }
}
