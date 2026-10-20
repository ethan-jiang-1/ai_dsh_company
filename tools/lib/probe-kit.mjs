// 探针公共件（2026-10-14 重构轮收拢）：sleep 与两种 check 收集器的单一实现。
// 此前 33 个探针各自定义 sleep（3 种写法同义）、10 处定义「results 收集」版 check 一行、
// 5 处定义「failures 收集」版 check——改一次输出格式要点几十处（probe-window.mjs 头注同款教训）。
// 何时跑：被 probes/**/*-probe.mjs import（keyless 直测 = tests/harness/probe-kit.spec.ts）；
//   改输出格式属行为变更——快照/金样与探针头注里的判据叙述须连带核对。
// 语义合同（与原各探针逐字一致）：输出行 = `  PASS/FAIL <label>`，detail 非空时附 `（<detail>）`。

/** 等待 ms 毫秒（Promise 版 setTimeout；原 3 种同义写法收敛于此）。 */
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** 造「results 收集」版 check：push {label, ok} 后打一行 PASS/FAIL——判分探针的形状（exit 码从 results 数）。 */
export const makeCheck = results => (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
}

/** 造「failures 收集」版 check：只记失败 label（浏览器/视觉探针的轻量形状，不打扰 results）。 */
export const makeFailingCheck = failures => {
  const check = (label, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
    if (!ok) failures.push(label)
  }
  // 第三态：显式跳过。不要把 SKIP 写成 PASS（审计 2026-10-20：绿的含义被稀释）。
  check.skip = (label, detail = '') => {
    console.log(`  SKIP ${label}${detail === '' ? '' : `（${detail}）`}`)
  }
  return check
}
