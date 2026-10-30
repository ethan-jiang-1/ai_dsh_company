// 在场板的**状态与显示名词汇**（2026-10-16 第三轮结构收敛自 presence.ts 拆出）。
//
// 本模块只管「有哪些状态、每个状态叫什么、谁是 lead、成员名怎么显示」——**闭表 + 纯映射**；
// 「事件流怎么折成板」住 ./presence.ts（它 re-export 本模块，外观零变化，见该文件头注）。
//
// 为什么单开一个家：这两张表是**对外呈现的合同面**（客户端直接显示它们；`STATUS_LABEL` 的
// 「未知值落未知」与 `PRESET_DISPLAY_NAMES` 与各 `presets/<role>/agent.cordis.yml` 的 `config.name` 同源，
// 有防漂移断言钉着）——与 300 多行事件折算混住时，改文案的人要翻整个读模型。
//
// 依赖：本文件**零 import**（叶子模块）；presence.ts → 本文件单向。
// 为什么 `PRESET_KEYS` 留在这里而不引 `tools/lib/company-roles.mjs`：pack 发布面自包含
// （`files` 不含 tools/），不许反向依赖维护工具层——同名决定见 notes/archived/2026-10-14-code-restructure.md
// 「输掉的方案」（`CULTIVATION_ROLES`/`PRESET_KEYS` 同理）。

/**
 * D-c：状态文案。`status` 是 agent driver 的**团队内**忙闲，不等于"这个人此刻在工作"——
 * 值一律走中文映射，未知值落「未知」，不直显英文裸值。
 */
export type PresenceStatus = 'running' | 'idle' | 'inactive' | 'provisioning' | 'failed' | 'unknown'

export const STATUS_LABEL: Record<PresenceStatus, string> = {
  running: '执行中',
  idle: '待命',
  inactive: '未上线',
  provisioning: '启动中',
  failed: '故障',
  unknown: '未知',
}

/**
 * 0.1.7 投影的成员生命周期 → 本读模型的状态（未知值落 `unknown`，不抛）。
 * `active` 落 `idle`（待命）：投影不表达 live turn 活动，别把它读成"正在工作"。
 * @param phase - `TeamMemberPhase`（或任意字符串）。
 * @returns 本仓的在场状态。
 */
export function presenceStatusFromPhase(phase: string): PresenceStatus {
  switch (phase) {
    case 'provisioning': return 'provisioning'
    case 'active': return 'idle'
    case 'failed': return 'failed'
    default: return 'unknown'
  }
}

/** 状态 → 文案（未知值不抛）。 */
export function statusLabelFor(status: string): string {
  return STATUS_LABEL[status as PresenceStatus] ?? STATUS_LABEL.unknown
}

/**
 * 五个 preset id——**pack 内名册唯一事实家**（2026-10-21 收拢：cultivation 的 CULTIVATION_ROLES 与
 * host 培养工具串改为从这里派生；pack/tools 边界仍由 tools/lib/company-roles.mjs 自持，互不依赖）。
 * 有限键，索引安全；与 `presets/<role>/agent.cordis.yml` 一一对应。
 */
export const PRESET_KEYS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'] as const

/** 培养域沿用的名册别名（2026-10-27 R3-22：从 `lib/cultivation.ts` 的 barrel 定义点搬来——
 *  那里既 `export *` 又定义常量，和 `cultivation-context` 构成三元环。事实仍只有 PRESET_KEYS 一份。） */
export const CULTIVATION_ROLES = PRESET_KEYS

type PresetRoleId = typeof PRESET_KEYS[number]

function isPresetRole(name: string): name is PresetRoleId {
  return (PRESET_KEYS as readonly string[]).includes(name)
}

/**
 * D-a：显示名映射。member.name 命中 preset id → 系列化显示名；`role === 'lead'` → CEO
 * （本组织 lead 恒为 CEO）；未命中原样显示（任意组队名不崩）。与各 `presets/<role>/agent.cordis.yml`
 * 的 `config.name` 同源——`tests/company/presence-board.spec.ts` 有防漂移断言。
 */
export const PRESET_DISPLAY_NAMES: Record<PresetRoleId, string> = {
  ceo: '梦之队 CEO',
  'vp-eng': '梦之队 VP-Eng',
  'vp-sales': '梦之队 VP-Sales',
  coo: '梦之队 COO',
  cfo: '梦之队 CFO',
}

/** 成员名 → 显示名（lead 行特殊：name 恒为 'lead'，按角色映射）。 */
export function displayNameFor(name: string, role: 'lead' | 'teammate'): string {
  if (role === 'lead') return PRESET_DISPLAY_NAMES.ceo
  return isPresetRole(name) ? PRESET_DISPLAY_NAMES[name] : name
}

/** 角色 → 短标签（培养面板/记录署名用；与 PRESET_DISPLAY_NAMES 分层——短标签不含公司名前缀；
 *  2026-10-21 自 lib/cultivation.ts 的 ROLE_LABELS 收进词汇层，单一事实家）。 */
export const PRESET_SHORT_LABELS: Record<PresetRoleId, string> = {
  ceo: 'CEO',
  'vp-eng': 'VP-Eng',
  'vp-sales': 'VP-Sales',
  coo: 'COO',
  cfo: 'CFO',
}

/** 角色 → 显示名（未知角色原样返回；2026-10-21 随短标签收进词汇层——培养域 facade 再导出）。 */
export function roleLabel(role: string): string {
  return PRESET_SHORT_LABELS[role as PresetRoleId] ?? role
}

/** 状态 → 官方 StateDot 语义（client 渲染用；2026-10-20 从 tabs/panels 两份局部映射收进词汇层）。 */
export function memberDot(status: PresenceStatus): 'done' | 'ongoing' | 'warning' | 'error' | 'idle' {
  switch (status) {
    case 'running': return 'ongoing'
    case 'provisioning': return 'warning'
    case 'failed': return 'error'
    case 'idle': return 'done'
    default: return 'idle'
  }
}
