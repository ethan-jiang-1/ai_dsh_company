/**
 * 测试资产的 lane 注册表（唯一家）。
 *
 * 为什么在这：`tests/` 的分层守卫禁止 spec import `checks|probes|tools` 下的驱动脚本，
 * 但允许 `tools/lib/`（无副作用纯逻辑）。注册表既要被三个 runner 读（fast / 按面 pre-push / 每周全量），
 * 又要被 `tests/repo/asset-lanes.spec.ts` 与 `tests/repo/test-census.spec.ts` 机械校验，所以住这里——
 * 数据 + 纯匹配函数，import 无副作用、不起进程、不读盘。
 *
 * 唯一家纪律：lane 成员与失败类只在本文件出现一次；runner 从 FAST / SURFACE_RULES / ASSETS / PROBES 读，
 * 文档只链接本文件。手抄第二份清单必漂。
 *
 * 字段：
 * - name          冒烟文件名去掉 `.<suffix>.mjs`（对应 `checks/lanes/<name>.<suffix>.mjs`）或探针名
 * - kind          classic（纯 node）| browser（playwright）| model（要 DEEPSEEK_API_KEY）| tool（非自跑检查）| probe
 * - lanes         参与的自动 lane：fast | surface | weekly；空数组 = 明确手动
 * - nodeArgs      启动参数（要读 TS 源码/workspace 包时带 --import tsx/esm）
 * - ciSafe        能否在干净 CI（macOS 全量 setup 之后）跑；只在 classic + weekly 时有意义
 * - why           一句话：它守住什么（给人看，不参与判据）
 * - manualReason  lanes 为空时必填：为什么不进自动 lane
 * - shape         example | generator | model | meta
 * - lastRed       最近一次真红日期（— = 未接运行日志，不伪造）
 * - replaceBy     被哪个资产替代（— = 无）
 * - retireWhen    退役条件（— = 未排期）
 */

export const LANES = ['fast', 'surface', 'weekly']

export const KINDS = ['classic', 'browser', 'model', 'tool']

const TSX = ['--import', 'tsx/esm']

/** 12 类失败词表（DSH 05 的本仓投影）+「未分类」；失败类决策表 = tests/failure-classes.md。 */
export const FAILURE_CLASSES = [
  '纯逻辑',
  '注册生命周期',
  '导出形态',
  '工具定义',
  '模型可见文本',
  '会话持久化',
  'provider',
  '子进程并发',
  'client UI',
  '配置组合',
  '性能',
  '文档指针',
  '未分类',
]

/** 冒烟与探针的失败类唯一映射（W4 起全量显式分类，零「未分类」负债；新增资产必须同 diff 判定）。 */
export const FAILURE_CLASS_BY_NAME = {
  // ── 冒烟（30）───────────────────────────────────────────────────────────────
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
  'generative': '文档指针',

  // ── browser-visual 探针（14）────────────────────────────────────────────────
  'attention-panel-probe': 'client UI',
  'board-drift-probe': 'client UI',
  'browser-behavior-probe': 'client UI',
  'budget-panel-probe': 'client UI',
  'cdp-probe': 'client UI',
  'cultivation-ux-scenarios-probe': 'client UI',
  'cultivation-ux-walkthrough-probe': 'client UI',
  'dag-midflight-probe': 'client UI',
  'dag-visual-probe': 'client UI',
  'deliverables-catalog-probe': 'client UI',
  'ledger-summary-probe': 'client UI',
  'presence-panel-probe': 'client UI',
  'sidebar-role-mark-probe': 'client UI',
  'tasks-panel-probe': 'client UI',

  // ── fs-taskboard 探针（10）──────────────────────────────────────────────────
  'collaboration-oracle-probe': '纯逻辑',
  'converge-e2e-probe': '会话持久化',
  'cross-process-fs-probe': '子进程并发',
  'fs-guard-probe': '工具定义',
  'motion-taskboard-probe': '模型可见文本',
  'observed-write-conflict-probe': '子进程并发',
  'review-staleness-probe': '模型可见文本',
  'task-discovery-probe': '模型可见文本',
  'taskboard-presence-probe': '会话持久化',
  'taskboard-scope-probe': '会话持久化',

  // ── session-context 探针（15）───────────────────────────────────────────────
  'ask-user-timed-probe': '配置组合',
  'budget-signoff-probe': '模型可见文本',
  'ceo-assembly-probe': '模型可见文本',
  'cultivation-context-probe': '会话持久化',
  'cultivation-method-layer-probe': '配置组合',
  'date-rule-probe': '模型可见文本',
  'dual-ceo-probe': '配置组合',
  'dual-signoff-probe': '模型可见文本',
  'hitl-dispatch-order-probe': '模型可见文本',
  'human-exits-probe': '模型可见文本',
  'journal-boundary-probe': '模型可见文本',
  'member-bounceback-probe': '模型可见文本',
  'reconcile-round-probe': '模型可见文本',
  'team-taskbook-probe': '模型可见文本',
  'time-context-probe': '配置组合',

  // ── team 探针（20）──────────────────────────────────────────────────────────
  'claim-race-probe': '子进程并发',
  'delegation-contract-probe': '配置组合',
  'delegation-depth-probe': '配置组合',
  'delegation-lifecycle-probe': '注册生命周期',
  'dissent-preservation-probe': '模型可见文本',
  'member-inquiry-probe': '工具定义',
  'member-interrupt-probe': '注册生命周期',
  'member-reject-in-team-probe': '模型可见文本',
  'member-rescue-probe': '模型可见文本',
  'member-stale-write-probe': '子进程并发',
  'multi-user-e2e-probe': '配置组合',
  'quality-loop-r2-probe': '模型可见文本',
  'subagent-retry-probe': '工具定义',
  'team-atomicity-probe': '子进程并发',
  'team-claim-loser-probe': '子进程并发',
  'team-concurrency-probe': '子进程并发',
  'team-recovery-probe': '会话持久化',
  'vp-eng-workflow-probe': '配置组合',
  'worker-orchestrator-probe': '配置组合',
  'worker-researcher-probe': '配置组合',
}

/** 某资产的失败类；未登记返回「未分类」（census 与 test-census.spec 会直接判红）。 */
export function failureClassOf(name) {
  return FAILURE_CLASS_BY_NAME[name] ?? '未分类'
}

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

function defineProbe(name, domain) {
  return {
    name,
    kind: 'probe',
    domain,
    lanes: [],
    ciSafe: false,
    manualReason: `调试探针：${domain} 域按需跑（触发见头注「何时跑」）`,
    failureClass: failureClassOf(name),
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
  define('generative', 'classic', ['weekly'], {
    why: '1000 seeded 文档 × mdast 真值差分 + 4 消费者契约差分 + 6 门禁分支级 mutation',
    shape: 'generator',
  }),
]

/** fast lane 的成员顺序（保持既有 4 条不变；新增要走评审，不许悄悄变长）。 */
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
// 为什么只有三条：fast lane 已经每次 push 都跑（workflow-contract / present-catalog /
// company-root-process / snapshot-motion），surface 再列它们 = 同一检查跑两遍。surface 只收
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

// ── 探针（59 个；调试面，不进自动 lane；上限由 test-census.spec 棘轮封顶）─────
export const PROBES = [
  defineProbe('attention-panel-probe', 'browser-visual'),
  defineProbe('board-drift-probe', 'browser-visual'),
  defineProbe('browser-behavior-probe', 'browser-visual'),
  defineProbe('budget-panel-probe', 'browser-visual'),
  defineProbe('cdp-probe', 'browser-visual'),
  defineProbe('cultivation-ux-scenarios-probe', 'browser-visual'),
  defineProbe('cultivation-ux-walkthrough-probe', 'browser-visual'),
  defineProbe('dag-midflight-probe', 'browser-visual'),
  defineProbe('dag-visual-probe', 'browser-visual'),
  defineProbe('deliverables-catalog-probe', 'browser-visual'),
  defineProbe('ledger-summary-probe', 'browser-visual'),
  defineProbe('presence-panel-probe', 'browser-visual'),
  defineProbe('sidebar-role-mark-probe', 'browser-visual'),
  defineProbe('tasks-panel-probe', 'browser-visual'),
  defineProbe('collaboration-oracle-probe', 'fs-taskboard'),
  defineProbe('converge-e2e-probe', 'fs-taskboard'),
  defineProbe('cross-process-fs-probe', 'fs-taskboard'),
  defineProbe('fs-guard-probe', 'fs-taskboard'),
  defineProbe('motion-taskboard-probe', 'fs-taskboard'),
  defineProbe('observed-write-conflict-probe', 'fs-taskboard'),
  defineProbe('review-staleness-probe', 'fs-taskboard'),
  defineProbe('task-discovery-probe', 'fs-taskboard'),
  defineProbe('taskboard-presence-probe', 'fs-taskboard'),
  defineProbe('taskboard-scope-probe', 'fs-taskboard'),
  defineProbe('ask-user-timed-probe', 'session-context'),
  defineProbe('budget-signoff-probe', 'session-context'),
  defineProbe('ceo-assembly-probe', 'session-context'),
  defineProbe('cultivation-context-probe', 'session-context'),
  defineProbe('cultivation-method-layer-probe', 'session-context'),
  defineProbe('date-rule-probe', 'session-context'),
  defineProbe('dual-ceo-probe', 'session-context'),
  defineProbe('dual-signoff-probe', 'session-context'),
  defineProbe('hitl-dispatch-order-probe', 'session-context'),
  defineProbe('human-exits-probe', 'session-context'),
  defineProbe('journal-boundary-probe', 'session-context'),
  defineProbe('member-bounceback-probe', 'session-context'),
  defineProbe('reconcile-round-probe', 'session-context'),
  defineProbe('team-taskbook-probe', 'session-context'),
  defineProbe('time-context-probe', 'session-context'),
  defineProbe('claim-race-probe', 'team'),
  defineProbe('delegation-contract-probe', 'team'),
  defineProbe('delegation-depth-probe', 'team'),
  defineProbe('delegation-lifecycle-probe', 'team'),
  defineProbe('dissent-preservation-probe', 'team'),
  defineProbe('member-inquiry-probe', 'team'),
  defineProbe('member-interrupt-probe', 'team'),
  defineProbe('member-reject-in-team-probe', 'team'),
  defineProbe('member-rescue-probe', 'team'),
  defineProbe('member-stale-write-probe', 'team'),
  defineProbe('multi-user-e2e-probe', 'team'),
  defineProbe('quality-loop-r2-probe', 'team'),
  defineProbe('subagent-retry-probe', 'team'),
  defineProbe('team-atomicity-probe', 'team'),
  defineProbe('team-claim-loser-probe', 'team'),
  defineProbe('team-concurrency-probe', 'team'),
  defineProbe('team-recovery-probe', 'team'),
  defineProbe('vp-eng-workflow-probe', 'team'),
  defineProbe('worker-orchestrator-probe', 'team'),
  defineProbe('worker-researcher-probe', 'team'),
]

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
  'generative': 'e2e',
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

/**
 * `keyless-lane`（weekly sweep）的纯资产筛选函数。
 * @param {typeof ASSETS} assets
 * @param {{ ci?: boolean, withBrowser?: boolean, filter?: string, suffix?: string }} [options]
 */
export function selectWeeklyAssets(assets = ASSETS, { ci = false, withBrowser = false, filter, suffix } = {}) {
  return assets
    .filter(asset => asset.lanes.includes('weekly') && (!ci || asset.ciSafe))
    .filter(asset => asset.kind === 'classic' || (withBrowser && asset.kind === 'browser'))
    .filter(asset => !filter || asset.name.includes(filter))
    .filter(asset => !suffix || suffixOf(asset.name) === suffix)
}
