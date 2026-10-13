// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 2d-quater-3. 页签计数声明门（nav-count-claims，2026-10-12 立）─────────────────
// 为什么：把页签「数量」写进文档必过期（用户裁定「连数量也不列举」——清单随切片增长，计数是它
// 最易腐的投影）。错误类复发两次：2026-10-04 已结卡（doc-snr-cleanup-audit）诊断「页签 5 vs 8」
// 未修、2026-10-12 清扫轮在 index/orient/ui-demo/cdp-probe 四文件抓到「五个/8 个」口径并存——
// 满足门禁升格判据（复发过 + 可机械判定 + 负例可证）。
// 规则：导航面（docs/** + AGENTS.md + README.md）不得出现「计数词 + 页签」组合（汉字/阿拉伯数字
// + 可选「个」+ 可选「公司/平台」+ 页签）——写法 = 「全部公司页签」或「清单 = 客户端注册面」。
// 「一」豁免（「开一个页签」是操作叙述不是清点）；notes/ 与 snapshots 载荷不扫——历史证据与
// Note 里的负例引用记录当时事实，判红即逼篡改（与 retired-path 的归档豁免同边界）。
// 负例留证 2026-10-12（实跑原话）：docs/orient.md 词表临时插「右栏五个平台页签」→
//   `FAIL nav-count-claims: docs/orient.md:N → 页签计数声明「五个平台页签」（计数随切片增长必过期；写法 = 全部公司页签 / 清单 = 注册面）`；
//   还原即绿。豁免方向：cdp-probe.md「开一个页签后…」→ 绿（「一」豁免）。
export function run({ root, ok, fail }) {
  const walkNavMd = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkNavMd(p)
    return entry.name.endsWith('.md') ? [p.slice(root.length + 1)] : []
  })
  const COUNT_PHRASE = /[两二三四五六七八九十0-9]+ *个? *(?:公司|平台)?页签/
  const navCountFiles = [...walkNavMd(join(root, 'docs')), 'AGENTS.md', 'README.md'].filter(f => existsSync(join(root, f)))
  let navCountBad = false
  for (const rel of navCountFiles) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      const m = line.match(COUNT_PHRASE)
      if (m) {
        navCountBad = true
        fail('nav-count-claims', `${rel}:${i + 1} → 页签计数声明「${m[0]}」（计数随切片增长必过期；写法 = 全部公司页签 / 清单 = 注册面）`)
      }
    })
  }
  if (!navCountBad) ok(`nav-count-claims ×${navCountFiles.length}（导航面零页签计数声明；数量随切片增长必过期）`)
}
