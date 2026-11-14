/**
 * 测试资产的 lane 注册表（唯一家）。
 *
 * 为什么在这：`tests/` 的分层守卫禁止 spec import `checks|probes|tools` 下的驱动脚本，
 * 但允许 `tools/lib/`（无副作用纯逻辑）。注册表既要被三个 runner 读（fast / 按面 pre-push / 每周全量），
 * 又要被 `tests/repo/asset-lanes.spec.ts` 机械校验，所以住这里——数据 + 纯匹配函数，
 * import 无副作用、不起进程、不读盘。
 *
 * 唯一家纪律：lane 成员只在本文件出现一次；runner 从 FAST / SURFACE_RULES / ASSETS / PROBES 读，
 * 文档只链接本文件。手抄第二份清单必漂（2026-11-13 研究实测：33 个冒烟只有 6 条在 fast 里，
 * 其余只靠头注散文，坏了没人知道）。
 *
 * 字段：
 * - name       冒烟文件名去掉 `.mjs`（必须对应 checks/lanes/<name>.mjs）
 * - kind       classic（纯 node）| browser（playwright）| model（要 DEEPSEEK_API_KEY）| tool（非自跑检查）
 * - lanes      参与的自动 lane：fast | surface | weekly；空数组 = 明确手动
 * - nodeArgs   启动参数（要读 TS 源码/workspace 包时带 --import tsx/esm）
 * - ciSafe     能否在干净 CI（macOS 全量 setup 之后）跑；只在 classic + weekly 时有意义
 * - why        一句话：它守住什么（给人看，不参与判据）
 * - manualReason  lanes 为空时必填：为什么不进自动 lane
 * - shape       example | generator | model | meta（v2；当前默认 example，生成器/模型接上后改）
 * - lastRed     最近一次真红日期（— = 未接运行日志，不伪造）
 * - replaceBy   被哪个资产替代（— = 无）
 * - retireWhen  退役条件（— = 未排期）
 */

export const LANES = ['fast', 'surface', 'weekly']

export const KINDS = ['classic', 'browser', 'model', 'tool']

const TSX = ['--import', 'tsx/esm']

/** @returns {{name:string,kind:string,lanes:string[],nodeArgs:string[],ciSafe:boolean,shape:string,lastRed:string,replaceBy:string,retireWhen:string,why?:string,manualReason?:string}} */
function define(name, kind, lanes, extra = {}) {
  return {
    name,
    kind,
    lanes,
    nodeArgs: extra.nodeArgs ?? [],
    ciSafe: extra.ciSafe ?? kind === 'classic',
    shape: extra.shape ?? 'example',
    lastRed: extra.lastRed ?? '—',
    replaceBy: extra.replaceBy ?? '—',
    retireWhen: extra.retireWhen ?? '—',
    ...(extra.why ? { why: extra.why } : {}),
    ...(extra.manualReason ? { manualReason: extra.manualReason } : {}),
  }
}

export const ASSETS = [
  // ── fast lane（pre-push 每次跑；只收 ≤10s、稳定、keyless）────────────────────
  define('workflow-contract', 'classic', ['fast', 'surface', 'weekly'], {
    nodeArgs: TSX,
    why: 'workflow/subagent 引擎的 schema 分支与重试语义',
  }),
  define('present-catalog', 'classic', ['fast', 'surface', 'weekly'], {
    nodeArgs: TSX,
    why: 'present 事件 → catalog/账本接线',
  }),
  define('company-root-process', 'classic', ['fast', 'surface', 'weekly'], {
    why: 'company-root 原子写 / lease 接管 / 同文件并发写',
  }),
  define('snapshot-motion', 'classic', ['fast', 'weekly'], {
    why: 'snapshot-motion CLI 与 workspace capture 接线',
  }),
  // ── surface lane（改到对应面时 pre-push 必跑；见 SURFACE_RULES）──────────────
  define('client-load', 'browser', ['surface', 'weekly'], {
    why: '真页面零挂载失败（client 装配/入口改动的完成定义一部分）',
  }),
  define('preset', 'classic', ['surface', 'weekly'], {
    why: 'preset 真挂载、六角色 + 五 support 的完成定义',
  }),
  define('replay', 'classic', ['surface', 'weekly'], {
    why: '合成回放场景的会话日志 + workspace 判据',
  }),

  // ── weekly lane（每周全量 keyless；不在 push 时跑，但最多陈旧 7 天）──────────
  define('company-entry', 'classic', ['weekly'], {
    why: '真 tarball 装 profile → dsh --profile company → workspace/公司状态（1–2 分钟）',
  }),
  define('concurrent-home', 'classic', ['weekly'], {
    why: '两个 writer 同 home 的 lease 与停写行为',
  }),
  define('external-workspace', 'classic', ['weekly'], {
    why: 'DSH_COMPANY_HOME / 外部盘 / 搬家逻辑',
  }),
  define('interrupted-install', 'classic', ['weekly'], {
    why: 'install/remove/upgrade 的失败与恢复路径',
  }),
  define('isolation-matrix', 'classic', ['weekly'], {
    why: 'workspace 解析 / 身份落点 / 停写的隔离矩阵',
  }),
  define('multi-install', 'classic', ['weekly'], {
    why: 'profile 组合 / 安装形状 / 多 pack 共存',
  }),
  define('permissions-recovery', 'classic', ['weekly'], {
    why: 'bootstrap/catalog 的文件权限与坏索引恢复',
  }),
  define('profile-row', 'classic', ['weekly'], {
    why: 'profile patch / 组合行 / 第二 bundle 的装配',
  }),
  define('revoke-recovery', 'classic', ['weekly'], {
    why: 'revoke / pending journal / 方法层恢复',
  }),
  define('upgrade-while-running', 'classic', ['weekly'], {
    why: '运行中升级的边界（旧实例继续工作、数据不丢）',
  }),
  define('client-error-chain', 'browser', ['weekly'], {
    why: '真页面 console.error → 错误环 → host 日志落点',
  }),
  define('multi-window-banner', 'browser', ['weekly'], {
    why: 'client instance-guard 与多实例横幅',
  }),
  define('ui-scene', 'browser', ['weekly'], {
    why: '真页面 9 页签 + 错误环 + 金样（隔离档）',
  }),

  // ── 明确手动（lanes 为空；manualReason 必填）────────────────────────────────
  define('channel-matrix', 'browser', [], {
    why: '安装通道矩阵（global/npm 通道）',
    manualReason: '要真实全局 dsh + 网络 + 已导出 _dist；发布前手动跑 --channel all',
  }),
  define('release', 'classic', [], {
    why: '发布形状：构建 → npm pack → 干净 profile 安装 → built 入口 boot',
    manualReason: '分钟级构建 + pack；由 release --verify 调度，不进每周 sweep',
  }),
  define('probe', 'model', [], {
    why: '角色内容/persona/KB 的连通与内容档',
    manualReason: '真模型档（连通 ~6s / 内容 --full 5–10min），按内容改动触发',
  }),
  define('delegation', 'model', [], {
    why: '模型可见工具目录与 shadow 边界',
    manualReason: '真模型 1 条 prompt（升 pin 或委托边界改动时）',
  }),
  define('presence-e2e', 'model', [], {
    why: '在场板链的端到端',
    manualReason: '真模型 ~$1，按在场/协作面验收触发',
  }),
  define('product-team-e2e', 'model', [], {
    why: 'CEO 组队判据与命名委托快捷路径',
    manualReason: '真模型 ~$1，按组队/判据面验收触发',
  }),
  define('attention-e2e', 'model', [], {
    why: '人机三节点全回路（触线→审批→面板→人批→继续）',
    manualReason: '真模型 + 多用户并发 lane，人工在场时跑',
  }),
  define('human-loop-e2e', 'model', [], {
    why: '人机接口三载体（补料落盘／建议非阻塞落稿／规矩缺口回流）',
    manualReason: '真模型 + 真浏览器 ~$1–2，人工在场时跑',
  }),
  define('entry-probe', 'model', [], {
    why: '入口链 13 题的认证档答卷归档',
    manualReason: '真模型认证档；入口链文档改动后手动跑',
  }),
]

/** fast lane 的成员顺序（保持既有 6 条不变；新增要走评审，不许悄悄变长）。 */
export const FAST = ['workflow-contract', 'present-catalog', 'company-root-process', 'snapshot-motion']

/**
 * 按面触发规则：改到 globs 命中的路径时，pre-push 跑 assets。
 * 规则从窄到宽排列；同一 asset 被多条命中只跑一次。
 * 成本纪律：每条规则的 assets 合计应 ≤ 30s，否则放 weekly 而不是 push。
 */
export const SURFACE_RULES = [
  {
    globs: ['packages/company-pack/src/client/**'],
    assets: ['client-load'],
    why: 'client 装配/入口改动 → 真页面零挂载失败',
  },
  {
    globs: ['packages/company-pack/presets/**'],
    assets: ['preset'],
    why: 'persona/skill/组合行改动 → preset 真挂载完成定义',
  },
  {
    globs: ['packages/company-pack/content/**'],
    assets: ['replay'],
    why: '只读注入面改动 → 合成回放场景的注入/世界判据',
  },
]
// 为什么只有三条：fast lane 已经每次 push 都跑（company-root-process / workflow-contract /
// present-catalog / gates-negative），surface 再列它们 = 同一检查跑两遍。surface 只收
// 「不在 fast 里、但改到对应面必须跑」的真入口证据；成本纪律同文件头注。

/** 把 glob 转成锚定的正则；支持 `**`（跨段）、`*`（段内）、`?`（单字符）。 */
export function globToRegExp(glob) {
  let out = ''
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i]
    if (char === '*') {
      if (glob[i + 1] === '*') {
        // `**/` 吃掉零或多段；裸 `**` 吃掉任意字符
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?'
          i += 2
        } else {
          out += '.*'
          i += 1
        }
        continue
      }
      out += '[^/]*'
      continue
    }
    if (char === '?') {
      out += '[^/]'
      continue
    }
    out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${out}$`)
}

/** 路径是否命中任一条 glob。 */
export function matchesAny(globs, path) {
  return globs.some(glob => globToRegExp(glob).test(path))
}

/**
 * 从变更路径选出要跑的 surface 资产。
 * @returns {{assets:string[], matches:{asset:string, glob:string, path:string, why?:string}[]}}
 */
export function selectSurfaces(paths, rules = SURFACE_RULES) {
  const assets = []
  const matches = []
  const seen = new Set()
  for (const rule of rules) {
    for (const path of paths) {
      if (!matchesAny(rule.globs, path)) continue
      const glob = rule.globs.find(entry => globToRegExp(entry).test(path))
      for (const asset of rule.assets) {
        const key = `${asset}\u0000${path}`
        if (seen.has(key)) continue
        seen.add(key)
        matches.push({ asset, glob, path, ...(rule.why ? { why: rule.why } : {}) })
        if (!assets.includes(asset)) assets.push(asset)
      }
    }
  }
  return { assets, matches }
}

/** 按名字取注册项；未登记返回 undefined（调用方据此报错，不猜）。 */
export function assetByName(name) {
  return ASSETS.find(asset => asset.name === name)
}


// ── 探针（69 个；调试面，不进自动 lane）─────────────────────────────────────
// 为什么也登记：探针是「存在但没人跑」的最大一块（69 个，0 个自动）。登记不改变它们的运行方式，
// 只让盘子可见、让删除/改名必须同 diff 退登记。失败类先记「未分类」——A 件只要求显式，不假装已分类。
export const PROBES = [
  { name: 'attention-panel-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'board-drift-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'browser-behavior-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'budget-panel-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cdp-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'compact-view-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cultivation-main-e2e-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cultivation-ux-scenarios-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cultivation-ux-walkthrough-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'dag-midflight-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'dag-visual-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'deliverables-catalog-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'ledger-summary-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'open-in-app-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'presence-panel-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'sidebar-role-mark-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'tasks-panel-probe', kind: 'probe', domain: 'browser-visual', lanes: [], ciSafe: false, manualReason: '调试探针：browser-visual 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'collaboration-oracle-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'converge-e2e-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cross-process-fs-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'fs-guard-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'motion-taskboard-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'observed-write-conflict-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'review-staleness-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'task-discovery-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'taskboard-presence-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'taskboard-scope-probe', kind: 'probe', domain: 'fs-taskboard', lanes: [], ciSafe: false, manualReason: '调试探针：fs-taskboard 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'ask-user-timed-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'budget-signoff-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'ceo-assembly-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cultivation-context-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cultivation-method-layer-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'cultivation-propose-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'date-rule-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'dual-ceo-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'dual-signoff-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'hitl-dispatch-order-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'human-exits-expression-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'human-exits-nonblocking-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'human-exits-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'journal-boundary-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'member-bounceback-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'reconcile-round-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'team-taskbook-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'time-context-probe', kind: 'probe', domain: 'session-context', lanes: [], ciSafe: false, manualReason: '调试探针：session-context 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'claim-race-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'delegation-contract-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'delegation-depth-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'delegation-lifecycle-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'dissent-preservation-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'member-inquiry-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'member-interrupt-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'member-reject-in-team-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'member-rescue-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'member-stale-write-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'multi-user-e2e-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'quality-loop-r2-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'subagent-retry-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'team-atomicity-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'team-claim-loser-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'team-concurrency-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'team-recovery-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'vp-eng-root-lead-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'vp-eng-teaming-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'vp-eng-workflow-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'worker-orchestrator-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
  { name: 'worker-researcher-probe', kind: 'probe', domain: 'team', lanes: [], ciSafe: false, manualReason: '调试探针：team 域按需跑（触发见头注「何时跑」）', failureClass: '未分类' },
]

/** 12 类失败词表（DSH 05 的本仓投影）+「未分类」；失败类决策表 = tests/failure-classes.md。 */
export const FAILURE_CLASSES = ['纯逻辑', '注册生命周期', '导出形态', '工具定义', '模型可见文本', '会话持久化', 'provider', '子进程并发', 'client UI', '配置组合', '性能', '文档指针', '未分类']

/** 冒烟的失败类（人工判定；改判定要同 diff 改这里的注释）。探针暂记未分类。 */
export const FAILURE_CLASS_BY_NAME = {
  'workflow-contract': '工具定义',
  'present-catalog': '会话持久化',
  'company-root-process': '子进程并发',
  'snapshot-motion': '会话持久化',
  'client-load': 'client UI',
  'preset': '配置组合',
  'replay': '会话持久化',
  'company-entry': '配置组合',
  'concurrent-home': '子进程并发',
  'external-workspace': '子进程并发',
  'interrupted-install': '配置组合',
  'isolation-matrix': '配置组合',
  'multi-install': '配置组合',
  'permissions-recovery': '配置组合',
  'profile-row': '配置组合',
  'revoke-recovery': '注册生命周期',
  'upgrade-while-running': '配置组合',
  'client-error-chain': 'client UI',
  'multi-window-banner': 'client UI',
  'ui-scene': 'client UI',
  'channel-matrix': '配置组合',
  'release': '导出形态',
  'probe': '模型可见文本',
  'delegation': '工具定义',
  'presence-e2e': '模型可见文本',
  'product-team-e2e': '模型可见文本',
  'attention-e2e': '模型可见文本',
  'human-loop-e2e': '模型可见文本',
  'entry-probe': '文档指针',
}

/** 某资产的失败类；未登记返回「未分类」（census 会报数）。 */
export function failureClassOf(name) {
  return FAILURE_CLASS_BY_NAME[name] ?? '未分类'
}

/** 冒烟 + 探针的全集（census 与盘面双向校验用）。 */
export function allAssets() {
  return [...ASSETS, ...PROBES]
}

/** 资产后缀 → lane（后缀是证据类型的唯一声明；file = <name>.<suffix>.mjs）。 */
export const SUFFIX_BY_NAME = {
  'attention-e2e': 'entry',
  'channel-matrix': 'entry',
  'client-error-chain': 'entry',
  'client-load': 'entry',
  'company-entry': 'entry',
  'company-root-process': 'e2e',
  'concurrent-home': 'entry',
  'delegation': 'entry',
  'entry-probe': 'entry',
  'external-workspace': 'entry',
  'human-loop-e2e': 'entry',
  'interrupted-install': 'entry',
  'isolation-matrix': 'entry',
  'multi-install': 'entry',
  'multi-window-banner': 'entry',
  'permissions-recovery': 'entry',
  'presence-e2e': 'entry',
  'present-catalog': 'e2e',
  'preset': 'entry',
  'probe': 'entry',
  'product-team-e2e': 'entry',
  'profile-row': 'entry',
  'release': 'entry',
  'replay': 'e2e',
  'revoke-recovery': 'entry',
  'snapshot-motion': 'e2e',
  'ui-scene': 'entry',
  'upgrade-while-running': 'entry',
  'workflow-contract': 'e2e',
}

export function suffixOf(name) {
  const suffix = SUFFIX_BY_NAME[name]
  if (!suffix) throw new Error(`asset-lanes: ${name} 没有登记后缀（e2e|entry）`)
  return suffix
}
