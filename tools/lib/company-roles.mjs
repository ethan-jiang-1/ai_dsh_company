// 公司五角色 id 的唯一事实家（2026-10-14 重构轮立：此前同形字面量在 10 个 mjs 里各写一份——
// authorship / candidate-scan / deliverables / converge / presets 门禁（checks/gates/presets.mjs）/ 四个 smoke / journal-audit，
// 加第 6 角色要改 10 处）。pack src 内的 CULTIVATION_ROLES / PRESET_KEYS **有意不迁**：
// pack 的发布面自包含（files = lib/presets/workspace/cordis.patch.yml，不含 tools/），
// 不许反向依赖仓内维护工具层；测试侧（presets.spec 的 ROLES）也持独立字面量作独立事实源。

/** 公司五角色 preset id（顺序 = 语义序：lead 在前 → VP → Officers，**非字母序**；
 *  在场板/培养面的显示序与 presets 门禁（checks/gates/presets.mjs）枚举序沿用它；需要字母序的调用方自行 sort（journal-audit 先例）。 */
export const COMPANY_ROLE_IDS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']

/** 非角色的**委派子人格** preset id（0.2.1 起委托 child 的人格只能由 agentPreset 给）：
 *  `researcher` 是 CEO 通用委托的默认 child（只读调研手）——不是第五个职能，
 *  所以**不进** COMPANY_ROLE_IDS（在场板/培养面/交付物署名都不该出现它），但它是本包声明并发布的一个 preset，
 *  故声明面门禁（presets 门禁的声明文件检查、preset-smoke 的真挂载）要一起覆盖。 */
export const COMPANY_SUPPORT_PRESET_IDS = ['researcher']
