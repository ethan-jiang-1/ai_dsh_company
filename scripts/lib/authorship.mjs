// 署名核对的纯逻辑（2026-09-26 立；IO 在 scripts/authorship-audit.mjs）。
// 为什么抽出来：判据本身值得单测（三档 + 文件名归属不判红），而完整审计要读会话日志（有 DSH_HOME
// 依赖、秒级），不进 `pnpm test` ⇒ 纯逻辑放这里，keyless 可测。

/** 五角色 id（与 `kb/<role>/` 目录名同轴）。 */
export const ROLE_IDS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']

/** 稿首署名行（兼容两种形状：早期模板 `出稿：CFO（wochen 财务职能）…` 与新形状 `出稿：<角色>｜版本 vN`）。 */
export const SIG = /出稿[:：]\s*(?:(VP-Eng|VP-Sales|COO|CFO|CEO)|(vp-eng|vp-sales|coo|cfo|ceo))/

/** 复核收回署名的更正行。 */
export const RECLAIM = /本稿由\s*(vp-eng|vp-sales|coo|cfo|ceo)\s*根会话复核并署名/

/** 文件名里的名义角色（`<角色>.md` / `<角色>-review.md`）。 */
export function nominalRoleOf(fileName) {
  return ROLE_IDS.includes(fileName.replace(/\.md$/, '').replace(/-review$/, ''))
    ? fileName.replace(/\.md$/, '').replace(/-review$/, '')
    : undefined
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
 */
export function classifyAuthorship(body, fileName, writerPreset) {
  const sig = SIG.exec(body)
  const reclaim = RECLAIM.exec(body)
  const claimed = sig === null ? undefined : String(sig[1] ?? sig[2]).toLowerCase()
  const byName = nominalRoleOf(fileName)
  if (claimed === undefined) {
    return writerPreset !== null && byName !== undefined && byName !== writerPreset
      ? { level: 'unsigned-mismatch', claimed: undefined, byName, writer: writerPreset }
      : { level: 'unsigned', claimed: undefined, byName, writer: writerPreset }
  }
  if (writerPreset === null) return { level: 'unknown', claimed, byName, writer: null }
  if (claimed === writerPreset) return { level: 'match', claimed, byName, writer: writerPreset }
  if (reclaim !== null && String(reclaim[1]).toLowerCase() === claimed) {
    return { level: 'reclaimed', claimed, byName, writer: writerPreset }
  }
  return { level: 'fail', claimed, byName, writer: writerPreset }
}
