// 署名核对的纯逻辑（2026-09-26 立；IO 在 checks/audit/authorship-audit.mjs）。
// 为什么抽出来：判据本身值得单测（三档 + 文件名归属不判红），而完整审计要读会话日志（有 DSH_HOME
// 依赖、秒级），不进 `pnpm test` ⇒ 纯逻辑放这里，keyless 可测。
import { COMPANY_ROLE_IDS } from './company-roles.mjs'

/** 稿首署名行（兼容两种形状：早期模板 `出稿：CFO（wochen 财务职能）…` 与新形状 `出稿：<角色>｜版本 vN`）。 */
export const SIG = /出稿[:：]\s*(?:(VP-Eng|VP-Sales|COO|CFO|CEO)|(vp-eng|vp-sales|coo|cfo|ceo))/

/** 复核收回署名的更正行。 */
export const RECLAIM = /本稿由\s*(vp-eng|vp-sales|coo|cfo|ceo)\s*根会话复核并署名/

/** 文件名里的名义角色（`<角色>.md` / `<角色>-review.md`）。 */
export function nominalRoleOf(fileName) {
  return COMPANY_ROLE_IDS.includes(fileName.replace(/\.md$/, '').replace(/-review$/, ''))
    ? fileName.replace(/\.md$/, '').replace(/-review$/, '')
    : undefined
}

/**
 * 写入者 preset → 基础角色（**只抹掉团队实例后缀**，BUG-018，2026-10-16）。
 *
 * 为什么需要：团队插件给同角色的第 2、3 个成员发的 preset 带实例后缀（`coo-2` / `vp-eng-3`），
 * 这些 id 不在 `packages/company-pack/presets/` 的五个 preset 里。署名行写的是角色名
 * （`出稿：coo`），而写入者归属在「队友会话 → 成员名」映射缺失时会回落到 preset 原文 ⇒
 * 精确字符串相等把**同一角色的两个实例**判成「署名不实」（真盘实测 10 条假阳性）。
 *
 * ⚠ 规范化**只作用在实例后缀这一维**：比较仍要求角色相等 ⇒ `vp-eng-2` 写 `coo` 稿照旧判红
 * （守卫断言见 tests/harness/authorship.spec.ts「规范化只抹实例后缀，不吞跨角色差异」）。
 * @param preset - 会话的 agentPreset（或任意字符串）。
 * @returns 去掉 `<角色>-<数字>` 后缀的 preset；不含实例后缀时原样返回。
 */
export function baseRoleOf(preset) {
  for (const id of COMPANY_ROLE_IDS) {
    if (new RegExp(`^${id}-\\d+$`).test(preset)) return id
  }
  return preset
}

/** 稿首署名行里的当前版号（`版本 v<N>`）；无版号行 = undefined。 */
export const DRAFT_VERSION = /版本\s*v(\d+)/

export function currentVersionOf(body) {
  const m = DRAFT_VERSION.exec(body)
  return m === null ? undefined : Number(m[1])
}

/**
 * final 对稿版号的引用抽取（R0-3 版本一致交叉核对的引用半边）。
 * 认 quote-z-2026 盘上的两种真实形状（粗体/括号噪声容忍，同一行 60 字符内配对）：
 *   ① 引用行：`drafts/cfo.md`（T1，**本定稿以 v2 为准**）
 *   ② 审批记录表：**`deliverables/<slug>/drafts/cfo.md` v2**
 * 同一稿被引多次（含不同版号）逐条保留——冲突引用本身就是要暴露的事实。
 * @returns {{draft: string, cited: number}[]} draft = `drafts/<name>.md`（相对该 slug 目录）。
 */
export function citedVersionsOf(finalBody) {
  const CITE = /`((?:deliverables\/[\w.-]+\/)?drafts\/[\w.-]+\.md)`[^`\n]{0,60}?v(\d+)/g
  const out = []
  for (const m of finalBody.matchAll(CITE)) {
    const tail = m[1].match(/drafts\/[^/]+$/)[0]
    out.push({ draft: tail, cited: Number(m[2]) })
  }
  return out
}

/**
 * 版本一致交叉核对（R0-3；quote-z-2026 失败模式的仪器化：双签锚 v2、盘面已 v3）。
 * 危险方向双向判红：引用版号 ≠ 稿面当前版号 ⇒ final 的依据无法按所引版号在盘上复核。
 * 稿面无版号行（历史稿）⇒ 观察不判红（同署名档的「证据不可考不判红」精神）。
 */
export function crossCheckVersions(finalBody, currentByDraft) {
  return citedVersionsOf(finalBody).map(({ draft, cited }) => {
    const current = currentByDraft.get(draft)
    return { draft, cited, current, stale: current !== undefined && current !== cited }
  })
}

/**
 * 判档：一份稿的署名情况 vs 实际写入者。
 * @param body  稿全文（抽署名/更正行用）。
 * @param fileName 稿文件名（抽名义归属用）。
 * @param writerPreset 实际写入该文件的会话的 agentPreset；null = 不可考。
 * @returns 档位：
 *   'match'    署名行与写入者一致；
 *   'reclaimed' 署名≠写入但有更正行（已收回，观察）；
 *   'fail'     **真写了署名行**且不符且无更正行（判红）；
 *   'unsigned-mismatch' / 'unsigned'  无署名行（观察；mismatch = 名义归属≠写入者）；
 *   'unknown'  有署名行但写入者不可考（观察——证据不可考不判红）。
 * 返回的 `writer` = **基础角色**（`coo-2` → `coo`，BUG-018 起）；`writerRaw` = 原始 preset。
 */
export function classifyAuthorship(body, fileName, writerPreset) {
  const sig = SIG.exec(body)
  const reclaim = RECLAIM.exec(body)
  const claimed = sig === null ? undefined : String(sig[1] ?? sig[2]).toLowerCase()
  const byName = nominalRoleOf(fileName)
  // writer = 基础角色（判档与显示都用它）；writerRaw = 原始 preset（保留实例信息，如 coo-2）。
  const writer = writerPreset === null ? null : baseRoleOf(writerPreset)
  const writerRaw = writerPreset
  if (claimed === undefined) {
    return writer !== null && byName !== undefined && byName !== writer
      ? { level: 'unsigned-mismatch', claimed: undefined, byName, writer, writerRaw }
      : { level: 'unsigned', claimed: undefined, byName, writer, writerRaw }
  }
  if (writer === null) return { level: 'unknown', claimed, byName, writer: null, writerRaw }
  if (claimed === writer) return { level: 'match', claimed, byName, writer, writerRaw }
  if (reclaim !== null && String(reclaim[1]).toLowerCase() === claimed) {
    return { level: 'reclaimed', claimed, byName, writer, writerRaw }
  }
  return { level: 'fail', claimed, byName, writer, writerRaw }
}
