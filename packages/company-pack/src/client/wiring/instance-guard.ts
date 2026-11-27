/**
 * 多实例探活横幅（卡②，2026-10-10 用户拍板：警告横幅）：同一浏览器的多个观察窗实例
 * 共享 localStorage——心跳互见即并存。并存 + 同写共享盘 = 静默互踩（E2 实证）⇒ 明确告知。
 * 检测面 = 同浏览器标签页（跨浏览器实例不在此列，已知边界，卡②已登记）。
 */

import { zh, type CompanyT } from '../locales.ts'

export const HEARTBEAT_KEY = 'dsh-company-pack/instances/v1'
const KEY = HEARTBEAT_KEY
const STALE_MS = 20_000
/** 允许的时钟偏差：超过 now + SKEW 的心跳视为「不存在」（时钟回拨/换机残留），不告警（BUG-364）。 */
const SKEW_MS = 5_000
const BANNER_ID = 'dsh-instance-guard-banner'

const fallbackWarning = (count: number): string =>
  zh['instanceGuard.warning'].replace('{count}', String(count))

/** 纯判据：心跳簿里是否有别人（非 selfId）的新鲜（<20s）心跳。有 ⇒ 返回横幅文案。 */
export function shouldWarn(raw: string | null, now: number, selfId: string, t?: CompanyT): string | null {
  let beats: Record<string, number> = {}
  try {
    beats = raw ? JSON.parse(raw) as Record<string, number> : {}
  } catch {
    return null
  }
  // 双边窗口：既不能太旧，也不能来自未来（负年龄不是新鲜，BUG-364）。
  const others = Object.entries(beats).filter(([id, ts]) => id !== selfId
    && typeof ts === 'number' && Number.isFinite(ts)
    && ts <= now + SKEW_MS && now - ts < STALE_MS)
  if (others.length === 0) return null
  return t ? t('instanceGuard.warning', { count: others.length }) : fallbackWarning(others.length)
}

function writeBeat(selfId: string): void {
  try {
    const win = window
    let beats: Record<string, number> = {}
    try { beats = JSON.parse(win.localStorage.getItem(KEY) ?? '{}') as Record<string, number> } catch { beats = {} }
    const now = Date.now()
    beats[selfId] = now
    // 顺手裁掉过期/超前邻居：坏记录不再长期留在存储里反复判真（BUG-364）。
    for (const [id, ts] of Object.entries(beats)) {
      if (id === selfId) continue
      if (typeof ts !== 'number' || !Number.isFinite(ts) || ts > now + SKEW_MS || now - ts >= STALE_MS) delete beats[id]
    }
    win.localStorage.setItem(KEY, JSON.stringify(beats))
  } catch { /* localStorage 不可用（隐私模式等）＝探活静默退场 */ }
}

function upsertBanner(doc: Document, message: string): void {
  let el = doc.getElementById(BANNER_ID)
  if (el === null) {
    el = doc.createElement('div')
    el.id = BANNER_ID
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:900;background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label);border-bottom:0.5px solid var(--dsw-alias-state-warn-primary);padding:6px 12px;font-size:13px;text-align:center;'
    doc.body.appendChild(el)
  }
  el.textContent = message
}

function removeBanner(doc: Document): void {
  doc.getElementById(BANNER_ID)?.remove()
}

/** 启动探活：心跳每 5s 一跳、判据每 10s 一查；支持语言热切换即时重译（BUG-397）。 */
export function startInstanceGuard(
  doc: Document = document,
  t?: CompanyT,
  subscribeLocale?: (onChange: () => void) => () => void,
): () => void {
  const selfId = `tab-${Math.random().toString(36).slice(2, 10)}`
  writeBeat(selfId)
  const beatTimer = window.setInterval(() => writeBeat(selfId), 5_000)
  const check = () => {
    const message = shouldWarn(doc.defaultView?.localStorage?.getItem(KEY) ?? null, Date.now(), selfId, t)
    if (message === null) {
      removeBanner(doc)
    } else {
      upsertBanner(doc, message)
    }
  }
  check()
  const checkTimer = window.setInterval(check, 10_000)
  const offLocale = subscribeLocale?.(check)
  const onUnload = () => {
    try {
      const win = window
      const beats = JSON.parse(win.localStorage.getItem(KEY) ?? '{}') as Record<string, number>
      delete beats[selfId]
      win.localStorage.setItem(KEY, JSON.stringify(beats))
    } catch { /* 同上，静默退场 */ }
  }
  win()?.addEventListener('beforeunload', onUnload)
  return () => {
    window.clearInterval(beatTimer)
    window.clearInterval(checkTimer)
    offLocale?.()
    win()?.removeEventListener('beforeunload', onUnload)
    onUnload()
    removeBanner(doc)
  }
}

function win(): Window | null {
  return typeof window === 'undefined' ? null : window
}
