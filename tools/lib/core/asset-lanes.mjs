/**
 * 测试资产的 lane 注册表（唯一家）。
 *
 * 为什么在这：`tests/` 的分层守卫禁止 spec import `checks|probes|tools` 下的驱动脚本，
 * 但允许 `tools/lib/`（无副作用纯逻辑）。注册表既要被三个 runner 读（fast / 按面 pre-push / 每周全量），
 * 又要被 `tests/repo/budget/asset-lanes.spec.ts` 与 `tests/repo/budget/test-census.spec.ts` 机械校验，所以住这里——
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

  // ── analyze 探针（7，2026-11-16 自旧的 observe 目录迁入）──────────────────────
  'ask-latency-probe': '会话持久化',
  'diagnose-probe': '会话持久化',
  'explore-evidence-probe': '会话持久化',
  'notes-audit-probe': '文档指针',
  'orient-probe': '会话持久化',
  'propose-sampler-probe': '模型可见文本',
  'session-log-export-probe': '会话持久化',

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
  // ── fast lane（按改动面在 pre-push 触发；只收 ≤10s、稳定、keyless）───────────
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
  // ── surface lane（改到对应面时由 pnpm smoke:surface 收口验证 + release:verify 强制兜底；见 SURFACE_RULES）──
  define('client-load', 'browser', ['surface', 'weekly'], {
    why: '真页面零挂载失败（client 装配/入口改动的完成定义一部分）',
  }),
  define('preset', 'classic', ['surface', 'weekly'], {
    why: 'preset 真挂载、六角色 + 五 support 的完成定义',
    // ciSafe:false（2026-11-17 weekly --ci 实证 11 红）：需要已装 pack 的 dev home company profile，
    // 干净 CI 无安装态。按 fresh-clone.yml 头注「按实际结果标 ciSafe:false + 理由，不删资产」。
    ciSafe: false,
    manualReason: '需要已装 pack 的 dev home profile（干净 CI 无安装态）；本地 smoke:surface / release:verify / smoke:all 不受影响',
  }),
  define('replay', 'classic', ['surface', 'weekly'], {
    why: '合成回放场景的会话日志 + workspace 判据',
  }),

  // ── weekly lane（每周全量 keyless；不在 push 时跑，但最多陈旧 7 天）──────────
  define('company-entry', 'classic', ['weekly'], {
    why: '真 tarball 装 profile → dsh --profile company → workspace/公司状态（1–2 分钟）',
    // ciSafe:false（2026-11-17 weekly --ci 实证）：需要 _dist 发布 tarball，CI 不导出 _dist。
    ciSafe: false,
    manualReason: '需要 _dist 发布 tarball（CI 不导出 _dist）；本地跑法与证据面不变',
  }),
  define('concurrent-home', 'classic', ['weekly'], {
    why: '两个 writer 同 home 的 lease 与停写行为',
    // ciSafe:false（2026-11-17 weekly --ci 实证）：需要 DSH_HOME dev 态，干净 CI 无。
    ciSafe: false,
    manualReason: '需要 DSH_HOME dev 态（干净 CI 无）；本地跑法与证据面不变',
  }),
  define('external-workspace', 'classic', ['weekly'], {
    why: 'DSH_COMPANY_HOME / 外部盘 / 搬家逻辑',
    ciSafe: false,
    manualReason: '需要 DSH_HOME + DSH_COMPANY_HOME dev 态（干净 CI 无）；本地跑法与证据面不变',
  }),
  define('interrupted-install', 'classic', ['weekly'], {
    why: 'install/remove/upgrade 的失败与恢复路径',
    ciSafe: false,
    manualReason: '需要安装态前置（已装 pack / dev home；干净 CI 无）；本地跑法与证据面不变',
  }),
  define('isolation-matrix', 'classic', ['weekly'], {
    why: 'workspace 解析 / 身份落点 / 停写的隔离矩阵',
    ciSafe: false,
    manualReason: '需要 DSH_HOME dev 态（干净 CI 无）；本地跑法与证据面不变',
  }),
  define('multi-install', 'classic', ['weekly'], {
    why: 'profile 组合 / 安装形状 / 多 pack 共存',
    ciSafe: false,
    manualReason: '需要已装 pack 的 profile 组合前置（干净 CI 无安装态）；本地跑法与证据面不变',
  }),
  define('permissions-recovery', 'classic', ['weekly'], {
    why: 'bootstrap/catalog 的文件权限与坏索引恢复',
    ciSafe: false,
    manualReason: '需要 dev home/catalog 前置（干净 CI 无 dev 态）；本地跑法与证据面不变',
  }),
  define('profile-row', 'classic', ['weekly'], {
    why: 'profile patch / 组合行 / 第二 bundle 的装配',
    ciSafe: false,
    manualReason: '需要 dev home profile 前置（干净 CI 无安装态）；本地跑法与证据面不变',
  }),
  define('revoke-recovery', 'classic', ['weekly'], {
    why: 'revoke / pending journal / 方法层恢复',
    ciSafe: false,
    manualReason: '需要 DSH_HOME（实证：缺 DSH_HOME 即抛「先 source run/env.sh」）；干净 CI 无 dev home',
  }),
  define('upgrade-while-running', 'classic', ['weekly'], {
    why: '运行中升级的边界（旧实例继续工作、数据不丢）',
    // ciSafe:false（2026-11-17 weekly --ci 实证）：需要 _dist 发布 tarball + 运行中实例。
    ciSafe: false,
    manualReason: '需要 _dist 发布 tarball + 运行中实例（实证缺 tgz 即抛）；本地跑法与证据面不变',
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
 * pre-push hook 每次都跑的无条件步骤（封闭词表）。
 *
 * 2026-11-27（BUG-406）：热路径收敛为「verify 无条件 + 其余按出站改动面由 planPrePush 精准触发」，
 * 全量覆盖率棘轮 `coverage:ratchet` 下沉至 `release:verify`、每周 CI 与手动执行，不再每次 push 重扫全量 305 份 spec。
 * 词表（UNCONDITIONAL_STEPS + SCOPED_STEPS）与 `.githooks/pre-push` 及 `planPrePush` 机械核对（asset-lanes.spec）。
 */
export const UNCONDITIONAL_STEPS = ['verify']

/** pre-push 按出站改动面精准触发的步骤（每项均须是根 package.json 可直接 `pnpm <step>` 复跑的脚本，BUG-200）。 */
export const SCOPED_STEPS = ['typecheck', 'lint', 'dup', 'smoke:fast', 'test:checks', 'test:spec']

/**
 * 按面触发规则：改到 globs 命中的路径时，记为命中 `assets`（真入口面由开发收口 `pnpm smoke:surface` 与发版门 `pnpm release --verify` 执行，`pre-push` 仅打印非阻塞提醒）；
 * 没有额外 lane 的面必须写 `coveredBy`（取自 UNCONDITIONAL_STEPS ∪ SCOPED_STEPS）+ `why`，不许留空。
 *
 * 为什么有两种证据而不是只有 assets：选择器对未命中**静默返回空**，于是「这个面不需要额外
 * 真入口」与「这个面忘了登记」同形（BUG-186：src/lib 搬移没有触发 replay）。`coveredBy`
 * 让豁免也变成登记项：每条都要能对到 hook 无条件步骤或 `planPrePush` 对该面真实触发的窄步骤，
 * `asset-lanes.spec` 机械核对覆盖面完备且真实触发。
 * **进阶（2026-11-17 BUG-206）**：能对到步骤还不够——步骤必须真的加载/解析该面。
 * `probes/**` 的 coveredBy 含 `test:spec`（`planPrePush` 精准运行 `entry-import-graph.spec.ts` 逐条解析
 * 每个探针的本地 import）；只写 `verify` 而 verify 不加载探针，就是「有登记 ≠ 被执行」。
 * 规则从窄到宽排列；同一 asset 被多条命中只跑一次。
 * 成本纪律：assets 合计应 ≤ 30s；更贵的真入口（company-entry ~1–2 min、release 分钟级）
 * 与全量覆盖率棘轮（`coverage:ratchet`）留在发布前 / weekly / 手动档，不塞进 push 热路径。
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
  {
    globs: ['packages/company-pack/src/lib/**'],
    assets: ['replay'],
    why: 'lib 是回放车道的读模型来源（replay 直接 import presence 构建产物）；源码分组搬移会在这里炸（BUG-185）',
  },
  {
    globs: ['packages/company-pack/src/index.ts', 'packages/company-pack/cordis.patch.yml'],
    assets: ['preset'],
    why: '包入口 / bundle 组合行改动 → preset 真挂载（注册面/组合行的完成定义）',
  },
  {
    // 盲审 S5 / B2：源码/工具/门禁/测试/探针目录的说明与生成物索引归 docs-only 快速路径（与 planPrePush 一致），
    // 须排在 src/host/**、tools/**、checks/**、tests/**、probes/** 之前，避免先命中宽规则的 coveredBy。
    globs: [
      'packages/company-pack/src/**/README.md',
      'checks/README.md', 'checks/AGENTS.md', 'checks/INDEX.generated.md', 'checks/lib/**/*.md',
      'tools/README.md', 'probes/README.md',
      'tests/README.md', 'tests/AGENTS.md', 'tests/failure-classes.md',
      'tests/CENSUS.generated.md', 'tests/BUG-COVERAGE.generated.md', 'tests/fixtures/README.md',
    ],
    coveredBy: ['verify'],
    why: '源码/工具/门禁/测试/探针目录的说明与生成物索引 = 结构门禁 verify 覆盖（docs-only 快速路径，不触发代码步骤）',
  },
  {
    globs: ['packages/company-pack/src/host/**'],
    coveredBy: ['smoke:fast', 'test:spec', 'typecheck', 'verify'],
    why: 'host 由按面触发的 fast lane（present-catalog / company-root-process）+ vitest related 窄测 + 增量 typecheck + verify 覆盖；全量覆盖率与 company-entry 归发布前/weekly',
  },
  {
    globs: ['tools/**', 'checks/**'],
    coveredBy: ['test:checks', 'test:spec', 'verify'],
    why: '工具/门禁面：按面触发门禁自测 test:checks + vitest related/入口图 spec + 结构门禁 verify；盘上没有更便宜的真入口',
  },
  {
    globs: ['tests/checks/**'],
    coveredBy: ['test:checks', 'verify'],
    why: '门禁自测文件改动由按面触发的 test:checks（node:test）+ verify 覆盖',
  },
  {
    globs: ['tests/**'],
    coveredBy: ['test:spec', 'verify'],
    why: '测试树（含夹具与测试支撑模块）改动由按面触发的 vitest 覆盖；再加 lane = 同一检查跑两遍',
  },
  {
    globs: ['packages/company-pack/locale/**'],
    assets: ['client-load'],
    why: '用户可见文案面：真页面仍要零挂载失败；文案断言由按面触发的 tests/client/i18n 覆盖',
  },
  {
    globs: ['packages/company-pack/package.json', 'packages/company-pack/tsconfig*.json', 'packages/company-pack/tsdown.config.ts', 'packages/company-pack/scripts/**'],
    coveredBy: ['test:spec', 'typecheck', 'verify'],
    why: '包元数据/构建配置/发布前脚本：按面触发 tests/repo/{pack,release} + 增量 typecheck + 结构门禁；发布档 release 是手动分钟级',
  },
  {
    globs: ['packages/company-pack/LICENSE', 'packages/company-pack/icon.svg'],
    coveredBy: ['verify'],
    why: '随包静态资产：pack-shape 与发布面门禁',
  },
  {
    globs: ['.oxlintrc.json', '.jscpd.json'],
    coveredBy: ['lint', 'dup', 'verify'],
    why: 'lint / dup 配置文件改动 → 触发 lint + dup + 结构门禁',
  },
  {
    globs: ['market-index*.json', '_dist/**', 'runtime/harness-home/README.md', '.*'],
    coveredBy: ['verify'],
    why: '市场索引暂存/生成手册/runtime 白名单/根 dotfile：结构与发布面门禁 verify 覆盖',
  },
  {
    // 2026-11-17 BUG-206：`coveredBy` 不是口头豁免——它必须点名一条**真执行/解析该面**的步骤。
    // 2026-11-27 BUG-406：planPrePush 命中 probes/** 时精准触发 tests/repo/structure/entry-import-graph.spec.ts，
    // 逐条解析每个探针的本地 import（可解析 ≠ 运行时跑通），不再为此重跑全量 305 份 spec 覆盖率。
    globs: ['probes/**'],
    coveredBy: ['test:spec', 'verify'],
    why: '探针入口图由 planPrePush 精准触发 tests/repo/structure/entry-import-graph.spec.ts 逐条解析本地 import（可解析 ≠ 运行时跑通）；verify 管头注/结构；真探针按头注手动跑',
  },
  {
    // 2026-11-18 BUG-228：源码侧 shipped 面由 shipped-links 门禁在 verify 下检查；真实 tarball 由 release:shape 判。
    globs: ['packages/company-pack/README.shipped.md'],
    coveredBy: ['verify'],
    why: '源码侧 shipped shape（README.shipped 链接/pnpm、presets/cordis/content dev 限定、patch 目标）由 checks/gates/shipped-links.mjs 在 verify/run-gates 下检查；真实 tarball 由 release:shape 判',
  },
  {
    globs: ['docs/**', 'notes/**', '_backlog/**', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'tests/README.md', 'packages/company-pack/README.md', 'packages/company-pack/AGENTS.md', '.agents/**', '.claude/**', 'run/**', 'snapshots/**', 'CHANGELOG.md', 'runtime/README.md', 'packages/company-pack/src/README.md'],
    coveredBy: ['verify'],
    why: '文档/指针/技能/运行配置/快照 = 结构门禁 verify 的射程（docs-only 快速路径不跑 tsc/vitest）',
  },
  {
    globs: ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig*.json', 'vitest.config.ts', '.github/**', '.githooks/**', 'vendor/**'],
    coveredBy: ['verify', 'typecheck', 'test:spec'],
    why: '根配置/锁文件/CI/hook/vendor 指针 = verify + 增量 typecheck + tests/repo 合同回归；vendor 内容只读（双门禁）',
  },
]
// 为什么后若干条用 coveredBy 而不是 assets：它们的证据是 hook 的无条件 verify 或按面精准触发的
// fast lane / typecheck / test:checks / 窄 vitest，再列一次 = 同一检查跑两遍；而昂贵的真入口
// （company-entry ~1–2 min、release 分钟级）与全量覆盖率棘轮（coverage:ratchet）属发布前/weekly/手动档，
// 塞进 push 热路径违背成本边界。写下 `coveredBy` 是为了让「有意不进 push」不再与「忘了登记」同形。

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
 * 从变更路径选出要跑的 surface 资产，并返回「显式豁免」与「完全未分类」两种结果。
 * @param {string[]} paths 变更路径。
 * @param {{ globs: string[], assets?: string[], coveredBy?: string[], why?: string }[]} [rules] 规则表（spec 注入用）。
 * @returns {{
 *   assets:string[],
 *   matches:{asset:string, glob:string, path:string, why?:string}[],
 *   covered:{glob:string, path:string, coveredBy:string[], why?:string}[],
 *   unseen:string[],
 * }}
 */
export function selectSurfaces(paths, rules = SURFACE_RULES) {
  const assets = []
  const matches = []
  const covered = []
  const seen = new Set()
  const coveredPaths = new Set()
  for (const rule of rules) {
    for (const path of paths) {
      if (!matchesAny(rule.globs, path)) continue
      const glob = rule.globs.find(entry => globToRegExp(entry).test(path))
      for (const asset of rule.assets ?? []) {
        const key = `${asset}\u0000${path}`
        if (seen.has(key)) continue
        seen.add(key)
        matches.push({ asset, glob, path, ...(rule.why ? { why: rule.why } : {}) })
        if (!assets.includes(asset)) assets.push(asset)
      }
      // 规则从窄到宽排列：已由更窄规则显式 covered 的路径不再叠加更宽规则的 coveredBy（盲审 S5）。
      if (rule.coveredBy && rule.coveredBy.length > 0 && !coveredPaths.has(path)) {
        coveredPaths.add(path)
        covered.push({ glob, path, coveredBy: [...rule.coveredBy], ...(rule.why ? { why: rule.why } : {}) })
      }
    }
  }
  const classified = new Set([...matches.map(match => match.path), ...covered.map(entry => entry.path)])
  const unseen = paths.filter(path => !classified.has(path))
  return { assets, matches, covered, unseen }
}

/**
 * 按出站变更路径生成 pre-push 热路径的精准执行计划（BUG-406，纯逻辑）。
 *
 * 原则：
 * - `verify` 永远无条件在 hook 首步执行；
 * - docs-only 变更不跑 tsc / lint / dup / smoke:fast / test:checks / vitest（秒级放行）；
 * - 代码/测试/工具/门禁/探针变更只跑受影响面的检查 + `vitest related` / 定向 spec，不重跑全量 V8 覆盖率；
 * - `probes/**` 必触发 `tests/repo/structure/entry-import-graph.spec.ts`（保持 BUG-206 真解析入口图承诺）。
 *
 * @param {readonly string[]} paths 本次出站变更路径。
 * @returns {{ docsOnly: boolean, steps: string[], relatedFiles: string[], targetedSpecs: string[] }}
 */
export function planPrePush(paths) {
  const stepSet = new Set()
  const relatedFiles = new Set()
  const targetedSpecs = new Set()

  for (const path of paths) {
    if (path.startsWith('packages/company-pack/src/') && !path.endsWith('/README.md')) {
      stepSet.add('typecheck')
      stepSet.add('lint')
      stepSet.add('dup')
      stepSet.add('smoke:fast')
      stepSet.add('test:spec')
      relatedFiles.add(path)
      if (path === 'packages/company-pack/src/index.ts' || path === 'packages/company-pack/src/client/index.ts') {
        targetedSpecs.add('tests/repo/pack/pack-exports.spec.ts')
      }
      continue
    }
    if (path.startsWith('packages/company-pack/presets/') || path === 'packages/company-pack/cordis.patch.yml') {
      stepSet.add('smoke:fast')
      stepSet.add('test:spec')
      targetedSpecs.add('tests/presets')
      continue
    }
    if (path.startsWith('packages/company-pack/content/')) {
      stepSet.add('smoke:fast')
      stepSet.add('test:checks')
      stepSet.add('test:spec')
      targetedSpecs.add('tests/content')
      // 盲审 S3：content 改动同时影响 host 注入与自举合同，补齐 handbook/bootstrap-content 窄测。
      targetedSpecs.add('tests/host/prompt/handbook.spec.ts')
      targetedSpecs.add('tests/host/run-bundle/bootstrap-content.spec.ts')
      continue
    }
    if (path.startsWith('packages/company-pack/locale/')) {
      stepSet.add('test:spec')
      targetedSpecs.add('tests/client/i18n')
      continue
    }
    if (
      path === 'packages/company-pack/package.json'
      || /^packages\/company-pack\/tsconfig.*\.json$/.test(path)
      || path === 'packages/company-pack/tsdown.config.ts'
      || path.startsWith('packages/company-pack/scripts/')
    ) {
      stepSet.add('typecheck')
      stepSet.add('test:spec')
      targetedSpecs.add('tests/repo/pack')
      targetedSpecs.add('tests/repo/release')
      continue
    }
    if (path.startsWith('tests/checks/')) {
      stepSet.add('test:checks')
      continue
    }
    if (path.startsWith('tests/') && path.endsWith('.spec.ts')) {
      stepSet.add('typecheck')
      stepSet.add('lint')
      stepSet.add('test:spec')
      targetedSpecs.add(path)
      continue
    }
    // 盲审 B1(R2)：tests/fixtures/**（含 .md 与 .json 夹具，除 README.md）不得落 docsOnly，
    // 必须按盘上 5 组真实夹具定向映射到实际读取它们的消费者 spec。
    if (path.startsWith('tests/fixtures/') && path !== 'tests/fixtures/README.md') {
      stepSet.add('test:spec')
      targetedSpecs.add('tests/repo/budget/fixture-provenance.spec.ts')
      if (path === 'tests/fixtures/catalog.contract.json') {
        targetedSpecs.add('tests/client/data/catalog-contract.spec.ts')
      } else if (path.startsWith('tests/fixtures/companies/')) {
        targetedSpecs.add('tests/host/run-bundle/company-fixture.spec.ts')
        targetedSpecs.add('tests/host/run-bundle/bootstrap.spec.ts')
        targetedSpecs.add('tests/client/ui/brand.spec.ts')
        targetedSpecs.add('tests/presets/product-type-coverage.spec.ts')
      } else if (path.startsWith('tests/fixtures/deliverables-r1/')) {
        targetedSpecs.add('tests/tools/deliverables-audit.spec.ts')
      } else if (path.startsWith('tests/fixtures/methods/')) {
        targetedSpecs.add('tests/tools/quality-loop.spec.ts')
      } else if (path === 'tests/fixtures/bundle-manifest-v1.json') {
        targetedSpecs.add('tests/host/run-bundle/bundle-manifest.spec.ts')
      } else {
        targetedSpecs.add('tests/host/run-bundle')
        targetedSpecs.add('tests/tools')
      }
      continue
    }
    if (path.startsWith('tests/') && path.endsWith('/bug-coverage-baseline.json')) {
      stepSet.add('test:spec')
      targetedSpecs.add('tests/repo/budget/bug-coverage.spec.ts')
      continue
    }
    if (path.startsWith('tests/') && !path.endsWith('.md')) {
      stepSet.add('typecheck')
      stepSet.add('lint')
      stepSet.add('test:checks')
      stepSet.add('test:spec')
      relatedFiles.add(path)
      continue
    }
    if ((path.startsWith('checks/') || path.startsWith('tools/')) && !path.endsWith('.md')) {
      stepSet.add('lint')
      stepSet.add('dup')
      stepSet.add('smoke:fast')
      stepSet.add('test:checks')
      stepSet.add('test:spec')
      // 盲审 B2：tools/lib 与 checks/lib 同样必须跑 entry-import-graph.spec.ts，防止改名/删除破坏探针或入口 import。
      targetedSpecs.add('tests/repo/structure/entry-import-graph.spec.ts')
      if (path === 'checks/lib/coverage-baseline.json') {
        targetedSpecs.add('tests/tools/coverage-baseline.spec.ts')
      } else if (path.startsWith('checks/lib/') || path.startsWith('tools/lib/')) {
        relatedFiles.add(path)
        if (path.endsWith('.json')) targetedSpecs.add('tests/tools')
      }
      if (path === 'checks/pre-push-surfaces.mjs' || path.startsWith('checks/lanes/')) {
        targetedSpecs.add('tests/repo/budget/asset-lanes.spec.ts')
      }
      continue
    }
    if (path.startsWith('probes/') && !path.endsWith('.md')) {
      stepSet.add('lint')
      stepSet.add('test:spec')
      targetedSpecs.add('tests/repo/structure/entry-import-graph.spec.ts')
      if (path.startsWith('probes/lib/')) relatedFiles.add(path)
      continue
    }
    if (path === '.oxlintrc.json' || path === '.jscpd.json') {
      stepSet.add('lint')
      stepSet.add('dup')
      continue
    }
    if (
      path === 'package.json'
      || path === 'pnpm-lock.yaml'
      || path === 'pnpm-workspace.yaml'
      || /^tsconfig.*\.json$/.test(path)
      || path === 'vitest.config.ts'
      || path.startsWith('.github/')
      || path.startsWith('.githooks/')
      || path.startsWith('vendor/')
    ) {
      stepSet.add('typecheck')
      stepSet.add('test:spec')
      targetedSpecs.add('tests/repo')
    }
  }

  const steps = SCOPED_STEPS.filter(step => stepSet.has(step))
  return {
    docsOnly: steps.length === 0,
    steps,
    relatedFiles: [...relatedFiles],
    targetedSpecs: [...targetedSpecs],
  }
}

/** `planVitestRun` 从窄测回退到单次全量 `vitest run` 的阈值（BUG-407：避免窄测冷启/展开耗时倒挂单次全量 ~29s）。 */
export const VITEST_FULL_FALLBACK_RELATED = 10
export const VITEST_FULL_FALLBACK_TARGETED = 20

/**
 * 将 `relatedFiles` 与展开后的 `expandedTargeted`（具体 `.spec.ts` 文件）规划为**最多一次** Vitest 调用（BUG-407）。
 *
 * 为什么：此前 `pre-push-surfaces` 分别冷启 `vitest related` 与 `vitest run`，导致多面改动时大量重叠 spec 跑两遍（实测 84.8s，
 * 反超单次全量 `pnpm test` 29.6s 近 3 倍）。这里保证：
 * - 单侧非空 → 单次 `vitest run`（targeted）或单次 `vitest related`（related，超阈值直接回退 `vitest run`）；
 * - 两侧均非空 → 小改动合进单次 `vitest related --run --passWithNoTests ...merged`（Vitest 4 实证同时跑关联 spec 与显式 spec 且天然去重）；
 *   超阈值直接回退单次全量 `vitest run`（100% 超集、零重复、耗时封顶 ~29s）。
 *
 * @param {{ existingRelated?: readonly string[], expandedTargeted?: readonly string[] }} input
 * @returns {{ mode: 'none'|'targeted'|'related'|'merged'|'full', args: string[] }}
 */
export function planVitestRun({ existingRelated = [], expandedTargeted = [] } = {}) {
  const related = [...new Set(existingRelated)]
  const targeted = [...new Set(expandedTargeted)]
  if (related.length === 0 && targeted.length === 0) return { mode: 'none', args: [] }
  if (related.length === 0) {
    if (targeted.length >= VITEST_FULL_FALLBACK_TARGETED) return { mode: 'full', args: ['run'] }
    return { mode: 'targeted', args: ['run', ...targeted] }
  }
  if (related.length >= VITEST_FULL_FALLBACK_RELATED || targeted.length >= VITEST_FULL_FALLBACK_TARGETED) {
    return { mode: 'full', args: ['run'] }
  }
  if (targeted.length === 0) {
    return { mode: 'related', args: ['related', '--run', '--passWithNoTests', ...related] }
  }
  const merged = [...new Set([...related, ...targeted])]
  return { mode: 'merged', args: ['related', '--run', '--passWithNoTests', ...merged] }
}

/** 所有在 SURFACE_RULES 里登记过的真入口面资产（去重保序；`smoke:surface --all` 与 `release --verify` 对齐源）。 */
export const SURFACE_LANE_ASSETS = [...new Set(SURFACE_RULES.flatMap(rule => rule.assets ?? []))]

/** 按名字取注册项；未登记返回 undefined（调用方据此报错，不猜）。 */
export function assetByName(name) {
  return ASSETS.find(asset => asset.name === name)
}

// ── 探针（66 个；调试面，不进自动 lane；上限由 test-census.spec 棘轮封顶）─────
export const PROBES = [
  defineProbe('ask-latency-probe', 'analyze'),
  defineProbe('diagnose-probe', 'analyze'),
  defineProbe('explore-evidence-probe', 'analyze'),
  defineProbe('notes-audit-probe', 'analyze'),
  defineProbe('orient-probe', 'analyze'),
  defineProbe('propose-sampler-probe', 'analyze'),
  defineProbe('session-log-export-probe', 'analyze'),
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
