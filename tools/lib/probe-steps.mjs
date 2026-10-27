// 纯逻辑：解析 `cdp-probe --steps <file>` 的步骤文件（keyless，可被 spec 直接 import）。
//
// 为什么（R4-07）：真页面车道此前只会“开页签 + 扫文本”，用户说“点这个按钮白了”时无法复现
// 一串交互。这里只做**受控的最小动作集**：按可见文本点击、等待/断言文本、向选择器输入文本。
// 不开放任意 JS（evaluate 仍由 cdp-probe 自己拼），避免把探针变成脚本执行器。

const ACTIONS = new Set(['clickText', 'waitText', 'expectText', 'typeText'])

/** 动作的人类可读名（错误/verdict 用）。 */
export function stepLabel(step) {
  return step.action === 'typeText' ? `typeText ${step.value[0]}` : `${step.action} ${step.value}`
}

/**
 * 解析步骤文件。
 * @param {string} text - JSON 文本。
 * @returns {ReadonlyArray<{action: string, value: string | readonly [string, string], timeoutMs?: number}>}
 * @throws {Error} 形状/动作非法时抛出可读错误（调用方按环境错误 exit 2）。
 */
export function parseProbeSteps(text) {
  let raw
  try {
    raw = JSON.parse(String(text ?? ''))
  } catch (error) {
    throw new Error(`steps: JSON 解析失败（${error instanceof Error ? error.message : String(error)}）`)
  }
  if (!Array.isArray(raw)) throw new Error('steps: 顶层必须是数组')
  if (raw.length === 0) throw new Error('steps: 至少一步')
  return raw.map((step, index) => {
    const at = `steps[${String(index)}]`
    if (step === null || typeof step !== 'object' || Array.isArray(step)) throw new Error(`${at}: 必须是对象`)
    const keys = Object.keys(step).filter(key => key !== 'timeoutMs')
    if (keys.length !== 1) throw new Error(`${at}: 必须恰好一个动作键（可另带 timeoutMs）`)
    const action = keys[0]
    if (!ACTIONS.has(action)) throw new Error(`${at}: 未知动作「${String(action)}」；可用 ${[...ACTIONS].join(' / ')}`)
    const value = step[action]
    if (action === 'typeText') {
      if (!Array.isArray(value) || value.length !== 2 || value.some(item => typeof item !== 'string')) {
        throw new Error(`${at}: typeText 必须是 [选择器, 文本]`)
      }
      if (value[0].trim() === '' || value[1] === '') throw new Error(`${at}: typeText 选择器/文本不能为空`)
    } else if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${at}: ${action} 需要非空字符串`)
    }
    if (step.timeoutMs !== undefined && (!Number.isInteger(step.timeoutMs) || step.timeoutMs <= 0)) {
      throw new Error(`${at}: timeoutMs 必须是正整数`)
    }
    return {
      action,
      value,
      ...(step.timeoutMs === undefined ? {} : { timeoutMs: step.timeoutMs }),
    }
  })
}
