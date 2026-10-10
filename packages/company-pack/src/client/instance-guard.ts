/**
 * 多实例探活横幅（卡②，2026-10-10 用户拍板：警告横幅）：同一浏览器的多个观察窗实例
 * 共享 localStorage——心跳互见即并存。并存 + 同写共享盘 = 静默互踩（E2 实证）⇒ 明确告知。
 * 检测面 = 同浏览器标签页（跨浏览器实例不在此列，已知边界，卡②已登记）。
 */

const KEY = 'dsh-instance-heartbeats'
const STALE_MS = 20_000
const BANNER_ID = 'dsh-instance-guard-banner'

/** 纯判据：心跳簿里是否有别人（非 selfId）的新鲜（<20s）心跳。有 ⇒ 返回横幅文案。 */
export function shouldWarn(raw: string | null, now: number, selfId: string): string | null {
  let beats: Record<string, number> = {}
  try {
    beats = raw ? JSON.parse(raw) as Record<string, number> : {}
  } catch {
    return null
  }
  const others = Object.entries(beats).filter(([id, ts]) => id !== selfId && typeof ts === 'number' && now - ts < STALE_MS)
  if (others.length === 0) return null
  return `⚠ 检测到另有 ${others.length} 个观察窗实例在运行——多实例同写共享盘会静默互踩（E2 实证），建议只保留一个。`
}

function writeBeat(selfId: string): void {
  try {
    const win = window
    let beats: Record<string, number> = {}
    try { beats = JSON.parse(win.localStorage.getItem(KEY) ?? '{}') as Record<string, number> } catch { beats = {} }
    beats[selfId] = Date.now()
    win.localStorage.setItem(KEY, JSON.stringify(beats))
  } catch { /* localStorage 不可用（隐私模式等）＝探活静默退场 */ }
}

function upsertBanner(doc: Document, message: string): void {
  let el = doc.getElementById(BANNER_ID)
  if (el === null) {
    el = doc.createElement('div')
    el.id = BANNER_ID
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;padding:6px 12px;font-size:13px;text-align:center;'
    doc.body.appendChild(el)
  }
  el.textContent = message
}

function removeBanner(doc: Document): void {
  doc.getElementById(BANNER_ID)?.remove()
}

/** 启动探活：心跳每 5s 一跳、判据每 10s 一查；返回清理函数（卸载/单实例时移除横幅）。 */
export function startInstanceGuard(doc: Document = document): () => void {
  const selfId = `tab-${Math.random().toString(36).slice(2, 10)}`
  writeBeat(selfId)
  const beatTimer = window.setInterval(() => writeBeat(selfId), 5_000)
  const check = () => {
    const message = shouldWarn(doc.defaultView?.localStorage?.getItem(KEY) ?? null, Date.now(), selfId)
    message === null ? removeBanner(doc) : upsertBanner(doc, message)
  }
  check()
  const checkTimer = window.setInterval(check, 10_000)
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
    win()?.removeEventListener('beforeunload', onUnload)
    onUnload()
    removeBanner(doc)
  }
}

function win(): Window | null {
  return typeof window === 'undefined' ? null : window
}
