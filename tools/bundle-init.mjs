// 状态：常驻
// 何时跑：fresh clone、或 dev 的 company-workspace 被清掉之后——重建 dev run bundle 的 workspace；
// 制度件做成指回 pack 的符号链接（单源），业务数据目录留空。已有 workspace 时一个字节都不动。
//
// 为什么需要它（2026-10-24 RFC run-bundle-install-unit）：company-workspace 是 dev run bundle 的
// workspace，整树已不进 git。fresh clone 没有它，角色会话就没有 cwd、gates/orient 也没有盘可读。
// 产品安装不需要本脚本——pack 首启会自己落骨架；这里只补本仓 dev 的单源链接。
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { repositoryRoot as repoRoot } from './lib/repository-layout.mjs'

const SKELETON = join(repoRoot, 'packages/company-pack/workspace')
const WORKSPACE = join(repoRoot, 'company-workspace')
/** 制度件：运行盘用符号链接指回 pack（单源）；其余文件按骨架复制。 */
const LINKS = [
  ['AGENTS.md', 'AGENTS.md'],
  ['templates', 'templates'],
  ['kb/org.md', 'kb/org.md'],
  ...['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales'].map(role => [`kb/${role}/CHARTER.md`, `kb/${role}/CHARTER.md`]),
]

if (existsSync(WORKSPACE)) {
  console.log(`bundle:init 跳过——dev run bundle workspace 已在场：${relative(repoRoot, WORKSPACE)}（一个字节都不动）`)
  process.exit(0)
}

if (!existsSync(SKELETON)) {
  console.error(`bundle:init 失败——出厂骨架不在：${relative(repoRoot, SKELETON)}`)
  process.exit(1)
}

/** 递归复制（含 dotfile，保留 .gitkeep 空目录形状）。 */
function copy(source, target, rel = '') {
  for (const entry of readdirSync(join(source, rel), { withFileTypes: true })) {
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`
    if (entry.isDirectory()) {
      mkdirSync(join(target, child), { recursive: true })
      copy(source, target, child)
    } else if (entry.isFile()) {
      mkdirSync(dirname(join(target, child)), { recursive: true })
      copyFileSync(join(source, child), join(target, child))
    }
  }
}

copy(SKELETON, WORKSPACE)
for (const [live, target] of LINKS) {
  const livePath = join(WORKSPACE, live)
  rmSync(livePath, { recursive: true, force: true })
  mkdirSync(dirname(livePath), { recursive: true })
  symlinkSync(relative(dirname(livePath), join(SKELETON, target)), livePath)
}

console.log(`bundle:init 完成——${relative(repoRoot, WORKSPACE)}（制度件 ×${String(LINKS.length)} 指回 pack；业务目录留空）`)
console.log('下一步：source run/env.sh；启动后 pack 会写 runtime/harness-home/bundle.json（run bundle 身份）。')
