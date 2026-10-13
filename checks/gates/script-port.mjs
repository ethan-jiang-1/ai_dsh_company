// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { scriptInspection } from './script-triggers.mjs'

// ── 2h. 脚本默认端口门禁（2026-09-29 立，fresh-agent 入场摩擦整治）─────────────
// 负例留证 2026-09-29：把 preset-smoke 的 `arg('port', '0')` 改回 `'3099'` → script-port 红；还原 → 绿。
// 为什么：端口是**环境状态不是仓库事实**（multi-human.md §端口不是仓库事实），但 5 个脚本曾把
// `arg('port', '30xx')` 当默认——整治当天实测 3099 正被别的实例占用，跑冒烟要先撞上再手改端口。
// 本仓另有 11 个脚本早就是 `'0'`：规范存在而无人守，文档与实现打架正是新代理的静默翻车点。
// 解法：**自起 web 实例的脚本一律 `--port 0`**（系统分配；真实端口从启动横幅读——这些脚本本就这么取）。
// 它们 spawn 实例、用完即杀，不需要稳定 origin；给人开的观察窗不受本条约束（稳定 origin 有回报）。
export function run({ ok, fail }) {
  const offenders = scriptInspection.fixedPorts
  offenders.length === 0
    ? ok('script-port（脚本默认端口一律 --port 0：端口是环境状态，真实端口从启动横幅读）')
    : fail('script-port', `这些脚本把固定端口当默认（一律改 '0'）：${offenders.join(', ')}`)
}
