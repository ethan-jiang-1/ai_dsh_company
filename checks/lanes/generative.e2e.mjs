// 状态：常驻
// 何时跑：weekly lane；手动 `node checks/lanes/generative.e2e.mjs`。
// 成本：keyless，1000 个 seeded 文档 × mdast 独立真值差分 + 4 消费者契约差分 + 多门禁分支级 mutation，约 4–10s；不进 pre-push。
// 证明什么：markdown-shape 与四消费者的结构不变量在 1000 个随机组合文档上与 mdast 对齐，且各核心门禁的拒绝分支无死规则；
// 不证明业务语义、真进程或真浏览器。
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const vitest = join(root, 'node_modules/vitest/vitest.mjs')

const propResult = spawnSync(
  process.execPath,
  [
    vitest,
    'run',
    'tests/lib/markdown-shape.property.spec.ts',
    'tests/host/contract/structure-agreement.spec.ts',
    '--reporter=dot',
  ],
  {
    cwd: root,
    env: { ...process.env, MARKDOWN_SHAPE_CASES: '1000' },
    stdio: 'inherit',
  },
)
if (propResult.status !== 0) process.exit(propResult.status ?? 1)

const mutResult = spawnSync(
  process.execPath,
  ['tests/checks/gate-mutation.test.mjs'],
  {
    cwd: root,
    stdio: 'inherit',
  },
)
process.exit(mutResult.status ?? 1)
