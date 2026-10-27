// 纯逻辑：--attach 的端口守卫（无 I/O，供 driver 与 keyless spec 共用）。
// 0/NaN/越界不许静默进 CDP 连接——那会连到错误端口或永远超时。

/** @param {unknown} port @returns {number} valid port @throws {Error} */
export function assertAttachPort(port) {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid CDP port: ${String(port)}`)
  }
  return port
}
