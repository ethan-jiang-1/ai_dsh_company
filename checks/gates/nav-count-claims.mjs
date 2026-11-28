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
// 负例留证 2026-11-25（preset 计数类）：docs/guides/zz-doc-count.md 写「公司有 6 个 preset，六公司角色各一行」→
//   `FAIL nav-count-claims: … preset 计数声明「六公司角色」`；真盘 9 处（AGENTS/architecture/presets/repo-handoff/
//   bootstrap×2/project-map×2/profile）删数改「清单 = presets/ 目录」后 `OK ×121`。
// 负例留证 2026-10-27（R3-15，扫描面扩到包 README 后）：packages/company-pack/README.md 临时追加
//   「公司视图与五个页签。」→ `FAIL nav-count-claims packages/company-pack/README.md:117 → 页签计数声明
//   「五个页签」`；还原 → 绿 ×47 文件。
export function run({ root, ok, fail }) {
  const contentRoot = join(root, 'packages/company-pack/content')
  if (!existsSync(contentRoot)) {
    fail('nav-count-claims', 'packages/company-pack/content 不在盘上——随包分发的只读内容（手册/模板/默认章程）是页签计数声明的主要注入面，不许消失')
    return
  }
  const walkNavMd = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkNavMd(p)
    return entry.name.endsWith('.md') ? [p.slice(root.length + 1)] : []
  })
  const COUNT_PHRASE = /[两二三四五六七八九十0-9]+ *个? *(?:公司|平台)?页签/
  // 2026-11-25 扩「preset 计数」类：名册/编制写进散文必过期（新增第 12 个 preset 当天即失真，
  // 二轮审计实测 9 处并存：AGENTS×2 / architecture / presets / repo-handoff / bootstrap×2 / project-map×2）。
  // 家 = presets/ 目录 + package.json patch 数组；写法 = 「清单 = presets/ 目录」。
  // 「一」豁免同页签（「开一个 preset」是操作叙述）；`每个 preset` 无数字不命中。
  const PRESET_COUNT_PHRASE = /[两二三四五六七八九十0-9]+ *个? *(?:公司角色|公司 preset|support preset|preset 文件)/
  // 2026-11-16：扩「文档篇数库存计数」类——repo-handoff §4 曾写死 notes/（332 篇）_backlog/（597 篇），
  // 实测 335/506 当天即过期（D28 同款：计数是清单最易腐的投影；页签计数门只查「N个页签」漏了篇数类）。
  // 签名锚在结构上而非弱计数：① 括号裸篇数注解「（N 篇）」（篇紧邻闭括号）；② 库存目录 notes//_backlog/
  // 相邻的阿拉伯篇数。豁免（与页签「一」豁免同源）：本篇/长篇/一篇/四篇 Note/八篇/两篇（汉字数词或操作
  // 叙述）、历史叙事「（46 篇 journal 已于…）」（篇后有散文，非裸注解）均不命中；notes//snapshots 载荷不扫。
  // 盲审 S3（2026-11-16）精度收口：分支②加词界 (?<![A-Za-z0-9_]) 防「keynotes/3 篇」误命中；
  // 分支①容篇后空格「（332 篇 ）」。登记边界（现盘 0 误伤，不扩以免误伤有界引用）：全角数字不查（罕见）；
  // 深子目录 >8 字符裸数不查（notes/implemented/… 属有界引用）；分支②邻接计数优先于历史叙事豁免
  // （「notes/ 下（46 篇 journal…」理论可压过豁免，现盘无此形）。
  const DOC_COUNT_PHRASE = /[（(][0-9]+ *篇 *[）)]|(?<![A-Za-z0-9_])(?:notes|_backlog)\/[^\n]{0,8}?[0-9]+ *篇/
  // 2026-10-27（R3-15）：扫描面补**随包分发的文档**——包 README 是收件人第一份文档，content/*.md 是
//   随每个角色会话注入的手册；两者原先不在面内，于是包 README 的「五个页签」（实际 9）活过了两轮审计。
// 2026-11-03（R5-02）：v3 把出厂内容从 workspace/ 搬到 content/，本门随迁。负例留证同轮：
//   在 `content/AGENTS.md` 末尾加「右栏五个页签」→ `FAIL nav-count-claims: …:158 → 页签计数声明「五个页签」`；
//   还原 → `OK ×52`；root 缺失 → 报「不在盘上」不崩。
  // 负例留证 2026-11-16（文档篇数类，真实病灶）：repo-handoff.md:66 写死「notes/（332 篇）_backlog/（597 篇）」
  //   （实测 335/506 当天即过期）→ `FAIL nav-count-claims: docs/guides/repo-handoff.md:66 → 文档篇数计数声明「notes/`（332 篇」…`；
  //   删两个死数改现算公式 → `OK nav-count-claims ×119`。豁免方向（真东西）：architecture 四篇 / budget-and-ops 本篇·长篇 /
  //   demo-scenes 一篇·（46 篇 journal 已于…）/ external-research 八篇·两篇 均在扫描面内且绿（汉字数词/操作叙述/篇后散文不命中）。
  // 负例留证 2026-11-28：run/company.overlay.yml:18 写「六个公司角色 preset」→ `FAIL nav-count-claims: run/company.overlay.yml:18 → preset 计数声明「六个公司角色」`；改为无计数表述后绿。
const navCountFiles = [...new Set([
  ...walkNavMd(join(root, 'docs')),
  ...walkNavMd(join(root, 'packages/company-pack/content')),
  'AGENTS.md', 'README.md', 'packages/company-pack/README.md', 'run/company.overlay.yml',
])].filter(f => existsSync(join(root, f)))
  let navCountBad = false
  for (const rel of navCountFiles) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      const m = line.match(COUNT_PHRASE)
      if (m) {
        navCountBad = true
        fail('nav-count-claims', `${rel}:${i + 1} → 页签计数声明「${m[0]}」（计数随切片增长必过期；写法 = 全部公司页签 / 清单 = 注册面）`)
      }
      const p = line.match(PRESET_COUNT_PHRASE)
      if (p) {
        navCountBad = true
        fail('nav-count-claims', `${rel}:${i + 1} → preset 计数声明「${p[0]}」（清单 = presets/ 目录；数量随增员必过期）`)
      }
      const d = line.match(DOC_COUNT_PHRASE)
      if (d) {
        navCountBad = true
        fail('nav-count-claims', `${rel}:${i + 1} → 文档篇数计数声明「${d[0]}」（库存篇数随目录增长必过期；写法 = 清单=目录本身 / 体量用 find … | wc -l 现算）`)
      }
    })
  }
  if (!navCountBad) ok(`nav-count-claims ×${navCountFiles.length}（导航面零页签/文档篇数/preset 计数声明；数量随切片增长必过期）`)
}
