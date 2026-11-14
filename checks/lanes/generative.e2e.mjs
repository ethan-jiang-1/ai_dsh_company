// 状态：常驻
// 何时跑：weekly lane；手动 `node checks/lanes/generative.e2e.mjs`。
// 成本：keyless，1000 个 seeded 文档，约 2–5s；不进 pre-push。
// 证明什么：markdown-shape 的归一化幂等/围栏不变量/节定位在 1000 个生成文档上成立；
// 不证明业务语义、真进程或真浏览器。
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const vitest = join(root, 'node_modules/vitest/vitest.mjs')
const result = spawnSync(process.execPath, [vitest, 'run', 'tests/lib/markdown-shape.property.spec.ts', '--reporter=dot'], {
  cwd: root,
  env: { ...process.env, MARKDOWN_SHAPE_CASES: '1000' },
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
