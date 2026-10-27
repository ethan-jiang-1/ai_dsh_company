/**
 * 浮窗几何记忆（RFC [proposed/2026-09-28-float-geometry-memory](../../notes/proposed/2026-09-28-float-geometry-memory.md)）：
 * 平台 `float(tabId, rect?)` 本就带可选 rect（vendor `ui-sidebar-right/service.ts:227/648`，缺省 =
 * 「上一个浮窗」级联位）——这里补 pack 侧的「记住上次摆位」：浮出期间采集（拖拽/缩放手势结束）
 * → localStorage 按 tabId 存 → 下次浮出还原并钳入当前视口。
 *
 * 纯函数与 storage 解耦（keyless 可测）。localStorage 按 **origin** 隔离：同一次服务运行内
 * （含页面刷新）完整有效；服务重启换端口（`--port 0`）即新 origin、记忆清零——UI 偏好的
 * 合理语义。localStorage 不可用（隐私模式/超限）时静默降级为「不记忆」（回平台默认位），
 * 不报错——这是 UI 偏好不是机制数据，丢了无损失。
 */

/** 浮窗矩形（与 vendor `FloatRect` 同形 {x,y,width,height}，CSS 像素；自声明避免 client 面引 vendor 内部路径）。 */
export interface FloatRectLike {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** 最小可见面积（对齐 vendor 拖拽钳制下限 220×140，company-tabs.tsx 头注——还原本不引入更小的窗）。 */
export const MIN_VISIBLE = { width: 220, height: 140 } as const

/** 存档 key 前缀（tabId = 平台页签 key，如 `dsh-company-pack/board`，跨会话稳定）。 */
export const STORAGE_PREFIX = 'dsh-company-pack/float/v1/'

/** 0.3.11 前的旧前缀：只读迁移，不再写。 */
export const LEGACY_STORAGE_PREFIX = 'dsh-company-pack/float/'

/** 存档 key：前缀 + tabId。 */
export function storageKey(tabId: string): string {
  return STORAGE_PREFIX + tabId
}

/** 旧版 key（迁移读用）。 */
export function legacyStorageKey(tabId: string): string {
  return LEGACY_STORAGE_PREFIX + tabId
}

/**
 * 把矩形钳进当前视口：超出视口的宽高先收缩到视口，宽高不足最小可见面积则抬到下限
 * （下限本身再被小视口收缩），最后 x/y 钳入 `[0, 视口−宽高]`。
 * @param rect - 存档矩形（可能来自上一窗口尺寸，或被写坏的值）。
 * @param viewportWidth - 当前视口宽。
 * @param viewportHeight - 当前视口高。
 * @param minVisible - 最小可见面积下限。
 * @returns 可直接交给 `float(tabId, rect)` 的有限矩形（输入非法也不产生 NaN/负尺寸）。
 */
export function clampRect(rect: FloatRectLike, viewportWidth: number, viewportHeight: number,
  minVisible: { readonly width: number; readonly height: number } = MIN_VISIBLE): FloatRectLike {
  const finite = (value: number, fallback: number): number => Number.isFinite(value) ? value : fallback
  const vw = Math.max(1, finite(viewportWidth, 1))
  const vh = Math.max(1, finite(viewportHeight, 1))
  const width = Math.min(Math.max(finite(rect.width, minVisible.width), Math.min(minVisible.width, vw)), vw)
  const height = Math.min(Math.max(finite(rect.height, minVisible.height), Math.min(minVisible.height, vh)), vh)
  const x = Math.min(Math.max(finite(rect.x, 0), 0), vw - width)
  const y = Math.min(Math.max(finite(rect.y, 0), 0), vh - height)
  return { x, y, width, height }
}

/**
 * 采集并持久化浮窗矩形。
 * @param storage - `localStorage`（测试注入假实现）。
 * @param tabId - 平台页签 key。
 * @param rect - 浮窗当前矩形。
 */
export function saveFloatRect(storage: Pick<Storage, 'setItem'>, tabId: string, rect: FloatRectLike): void {
  try {
    storage.setItem(storageKey(tabId), JSON.stringify(rect))
  } catch {
    /* 静默降级：隐私模式 / 配额超限 ⇒ 不记忆，回平台默认位 */
  }
}

/**
 * 读存档矩形。
 * @returns 无存档 / JSON 损坏 / 字段缺失或非有限数 ⇒ null（调用方回平台默认位）。
 */
export function loadFloatRect(storage: Pick<Storage, 'getItem' | 'setItem'>, tabId: string): FloatRectLike | null {
  try {
    let raw = storage.getItem(storageKey(tabId))
    let migrated = false
    if (raw === null) {
      raw = storage.getItem(legacyStorageKey(tabId))
      migrated = raw !== null
    }
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const fields = value as Record<string, unknown>
    const { x, y, width, height } = fields
    const finite = (entry: unknown): entry is number => typeof entry === 'number' && Number.isFinite(entry)
    if (!finite(x) || !finite(y) || !finite(width) || !finite(height)) return null
    const rect = { x, y, width, height }
    if (migrated) saveFloatRect(storage, tabId, rect)
    return rect
  } catch {
    return null
  }
}
