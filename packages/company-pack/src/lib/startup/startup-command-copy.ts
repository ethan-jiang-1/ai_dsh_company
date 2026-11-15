/**
 * `/company-settings` 的宿命令文案（zh/en 成对；2026-11-12，BUG-083）。
 *
 * 为什么住 `lib/` 而不是 `client/locales.ts`：命令描述/用法/解析错误由 **host** 在注册与执行时
 * 产生；client 字典是 React 面的 typed 字典，host 不能反向 import。这里给一个 host/client 都能
 * 消费的 typed 小字典，命令注册时按当前语言取值，语言切换时重注册（`commands.register` 的
 * description 是字符串，vendor 不支持 per-locale provider）。
 */

/** 一条 zh/en 成对的用户可见文案。 */
export interface BilingualCopy {
  readonly zh: string
  readonly en: string
}

/** `/company-settings` 的全部宿命令文案（字段/值名是 machine token，不翻译）。 */
export const STARTUP_COMMAND_COPY = {
  description: {
    zh: '项目启动策略：产品类型 / 交付模式 / 参考资料 wiki（auto = 不约束）',
    en: 'Project startup strategy: product type / delivery mode / reference wiki (auto = no constraint)',
  },
  hint: {
    zh: 'show | set <field> <value|auto> | reset',
    en: 'show | set <field> <value|auto> | reset',
  },
  usage: {
    zh: '用法：/company-settings [show | set <productType|deliveryMode|wiki> <值|auto> | reset]',
    en: 'Usage: /company-settings [show | set <productType|deliveryMode|wiki> <value|auto> | reset]',
  },
  unknownField: (field: string, available: string): BilingualCopy => ({
    zh: `未知字段「${field}」；可用：${available}`,
    en: `Unknown field "${field}"; available: ${available}`,
  }),
  noWorkspace: {
    zh: '未指定 workspace；先选 workspace 再设置。',
    en: 'No workspace yet; pick a workspace before editing startup settings.',
  },
} as const
