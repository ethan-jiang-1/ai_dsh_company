# 2026-11-06 · CEO 汇报线补 CMO：MRD → CMO、PRD → VP-Eng

状态：implemented（2026-11-06；用户实证：要求 MRD/PRD 时 CEO 把 MR 派给 VP-Sales；根因 = CEO persona 仍是六角色前的「四个职能 / 市场与定价派 VP-Sales」）

## 决定

- CEO persona 改五职能并写死路由：新市场/新产品定义/MRD → CMO；技术/可行性/PRD → VP-Eng；
  现有客户/销售/定价 → VP-Sales；落地/承接 → COO；钱/合规 → CFO。
- 汇报线补 `vp_cmo` 命名委托（`agentPreset: cmo`，与 vp_eng/vp_sales 同形）——单职能 CMO 出稿
  有直接路径，不再让模型退到 VP-Sales。
- 客户端同步：`DELEGATION_TOOL_KEYS` 加 `vp_cmo`、`DelegationCard` 的 `ROLE_LABEL` 加 CMO——
  否则委派卡永不渲染（keyed slot 拼错不报错）；`client-face` 守卫会把 preset 与 client 钉在一起。
- 同 diff 修 0.2.1 事实：单职能委派是 activation（终稿由完成通知送回），删掉「前台等结果」。

## 输掉的方案

- **只改 assembling-the-team skill**：persona 是每次请求都注入的常驻面，skill 按需加载；用户实证
  persona 的「市场与定价派 VP-Sales」压过 skill 的 CMO 路由。
- **保留四职能、CMO 只走 team**：单职能 MRD 没有直接委派路径，模型会继续落到唯一带「市场」标签的
  VP-Sales（正是本次 bug）。
- **加 vp_cmo 不改 persona**：工具在目录里但路由句仍写「市场与定价派 VP-Sales」，模型仍可能选错。

## 验证（实跑）

- `pnpm test tests/presets` → 32 passed（含新增的五职能路由断言 + vp_cmo 委托行）
- `pnpm test tests/client tests/presets` → 364 passed（client-face 的 key↔preset 逐字守卫 + 委派卡）
- `pnpm verify` → ALL PASS（preset-row-deps / preset-required-config 认新行）
- `source run/env.sh && node checks/lanes/preset.entry.mjs` → ALL PASS（6 角色 + 1 委派子人格可挂载）
- `source run/env.sh && node checks/lanes/delegation.entry.mjs` → ALL PASS（模型可见 75 工具，含 vp_cmo）
- `source run/env.sh && node checks/lanes/client-load.entry.mjs` → ALL PASS（零挂载失败）
- **待人复测**：新会话问 MRD/PRD，CEO 应组 CMO+VP-Eng；旧会话的系统提示不变，必须新开会话。

## 后果

- 新会话生效；旧会话仍按旧 persona。
- 模型可见目录多一个 `vp_cmo`（named delegation 的 activation 边界不变；delegation-smoke 已同步断言）。
- 六角色迁移的内容面（手册 / CMO preset / CEO skill）原本已正确，本条补的是 persona 这处漏改。
