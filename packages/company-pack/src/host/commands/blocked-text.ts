/**
 * 停写回执的统一措辞（2026-11-10 BUG-058）。
 *
 * 为什么单独成件：`/req`、`/prd`、`/deliverables`、`/cultivation` 都把 `dataBlocked` 压成布尔，
 * 回执硬编码「无 workspace/身份/lease 问题」——真实原因恰恰是其中之一。这里只做**原因可见**，
 * 不改变停写守卫本身（守卫是期望语义）。
 */
export function blockedCompanyText(reason: string | undefined, action: string): string {
  const why = reason === undefined || reason.trim() === '' ? '运行前提未满足' : reason.trim()
  return `公司数据已停写（原因：${why}）；先处理该原因再${action}。`
    + '若已选 workspace 仍停写，重启宿主让运行前提重新解析（当前命令读的是启动时的前提）。'
}

/**
 * 停写回执的**两种语言**版本（BUG-326：命令面已按 locale 出文案，停写回执不能还是中文）。
 * @param reason - 运行前提不满的原因（原话上行）。
 * @param actionZh - 中文动词短语（如「培养」「审计」）。
 * @param actionEn - 对应英文动词短语（如 "cultivating"）。
 * @returns 中英两句。
 */
export function blockedCompanyTextPair(
  reason: string | undefined,
  actionZh: string,
  actionEn: string,
): { readonly zh: string, readonly en: string } {
  const whyEn = reason === undefined || reason.trim() === '' ? 'runtime preconditions are not met' : reason.trim()
  return {
    zh: blockedCompanyText(reason, actionZh),
    en: `Company data writes are paused (reason: ${whyEn}); resolve it before ${actionEn}.`
      + ' If a workspace is selected and writes are still paused, restart the host so the runtime preconditions are re-resolved.',
  }
}
