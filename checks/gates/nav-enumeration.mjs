// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 2d-quater-2. 导航枚举复发门（nav-enumeration，2026-10-12 立）──────────────────
// 为什么：增长型清单写进导航文档必漂（D28），本仓三代实证——2026-09-26 六份清单同病立教义、
// 2026-10-04 已结卡（doc-snr-cleanup-audit）诊断「页签 5 vs 8」却未修、2026-10-12 清扫轮再抓五处
// （tests/README 四区表列 9/21 spec、页签「五个」计数等）——诊断与修复之间没有执行通道，
// 符合门禁升格判据（复发过 + 可机械判定 + 负例可证）。规则只钉**最小复发面**：tests/README §四区
// 表行不得出现「 / 」分隔的标识符清单（≥3 项）或 spec 文件名——spec 清单的家 = 目录本身
// （该文件自己也是这么写的）。范围仅 §四区 一节：tests/README 头部对 layering.spec 的守卫点名、
// 尾部对 navigation-assets.spec 的骨架声明是**单点合法引用**（守卫机制的家），不在本节、不受本门约束。
// 形状锚 = `## 四区` **整行锚**（`^## 四区$` /m，改名/加字即报缺失——2026-10-12 实测前缀匹配「## 四区X」
// 竟仍绿，弱锚当场抓住）；节缺失报「缺失」不中断整个 run（doc-budget 2026-10-09 教训）。
// 负例留证 2026-10-12（实跑原话）：把旧 harness 枚举行（「结构与合同守卫：layering / keyless-imports /
// pack-exports / …」9 项）临时写回 §四区 →
//   `FAIL nav-enumeration: tests/README.md:17 → 枚举清单/spec 名（清单的家 = 目录本身，D28）：| [tests/harness](./harness/) | 结构与合同守卫：layering / keyless-imports / pack-export…`；
//   还原即绿。豁免方向：现行 §四区（职责描述 + 指针）→ 绿。
// 负例留证 2026-10-12（缺节方向）：「## 四区」临时改名「## 四区X」→
//   `FAIL nav-enumeration: tests/README.md 缺「## 四区」节——导航骨架被破坏`；还原即绿。
//   这条红还抓出首版前缀匹配的弱锚（见上）——两个方向的负例各证明一支分支真的会红。
export function run({ root, ok, fail }) {
  const navRel = 'tests/README.md'
  if (!existsSync(join(root, navRel))) {
    fail('nav-enumeration', `${navRel} 不在盘上——导航文档不许消失（内容该搬去哪就搬，文件本身留着）`)
  } else {
    const navText = readFileSync(join(root, navRel), 'utf8')
    const hdrIdx = navText.search(/^## 四区$/m)
    if (hdrIdx < 0) {
      fail('nav-enumeration', `${navRel} 缺「## 四区」节——导航骨架被破坏（navigation-assets.spec 同观）`)
    } else {
      const secStartLine = navText.slice(0, hdrIdx).split('\n').length // 「## 四区」所在行（1 基）
      const nextHdr = navText.indexOf('\n## ', hdrIdx + 1)
      const secText = navText.slice(hdrIdx, nextHdr < 0 ? navText.length : nextHdr)
      const bad = secText.split('\n')
        .map((line, i) => ({ line, no: secStartLine + i }))
        .filter(({ line }) => /(?:^|[\s|（(])[a-z0-9-]+(?: \/ [a-z0-9-]+){2,}/.test(line) || /[a-z0-9-]+\.spec\.ts/.test(line))
      bad.length === 0
        ? ok('nav-enumeration（§四区 无枚举清单/spec 名——D28 复发门；清单的家 = 目录本身）')
        : fail('nav-enumeration', `${navRel}:${bad[0].no} → 枚举清单/spec 名（清单的家 = 目录本身，D28）：${bad[0].line.trim().slice(0, 80)}`)
    }
  }
}
