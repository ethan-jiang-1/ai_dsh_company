/** Host config 的运行时类型闸（内部模块；不扩大 loader 公开面）。
 *
 * 为什么不做 `export const Config` schema：`@deepseek-ai/schemastery` 不在本包 peer 面，
 * 为一个可选旋钮新增运行时 peer 不划算；类型/空值在 apply 前 fail-loud 已能挡住最常见的错配。
 * 路径存在性仍归运行时（方法层可能尚未创建，不能在这里判死）。
 */
export interface HostConfigLike {
  readonly cultivationRoot?: string
  readonly handbookSkipPresets?: readonly string[]
}

export function validateHostConfig(config: HostConfigLike = {}): void {
  const allowed = new Set(['cultivationRoot', 'handbookSkipPresets'])
  for (const key of Object.keys(config)) {
    if (!allowed.has(key)) throw new Error(`company-pack: 未知 host config 键 ${key}（只认 cultivationRoot / handbookSkipPresets）`)
  }
  if (config.cultivationRoot !== undefined
    && (typeof config.cultivationRoot !== 'string' || config.cultivationRoot.trim() === '')) {
    throw new Error('company-pack: cultivationRoot 必须是非空字符串')
  }
  if (config.handbookSkipPresets !== undefined
    && (!Array.isArray(config.handbookSkipPresets)
      || config.handbookSkipPresets.some(id => typeof id !== 'string' || id.trim() === ''))) {
    throw new Error('company-pack: handbookSkipPresets 必须是非空字符串数组')
  }
}
