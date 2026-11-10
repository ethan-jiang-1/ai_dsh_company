# 2026-11-10 · 动议级产品类型：meta 优先，company.md 只做默认

状态：implemented（2026-11-10 落地；验证见下）

上游 = [动议级产品类型卡](../../_backlog/_archive/settled_issues/2026-11-10-motion-product-type.md)；
证据 = [产品类型模型 §4](../../_backlog/research/org-coordination-topology/2026-11-10-product-type-model.md)。

## 问题

`company.md` 的 `productType` 是部署级唯一来源；`/req check` 只读它。用户 2026-11-10 要求按动议切换：
硬软一体用 `hardware-software`，纯软用 `business-software`。若只改角色提示，检查器仍按公司默认，
口径会漂。

## 决定

1. `meta.md` 增加可选字段 `产品类型: hardware-software|business-software`；用户声明优先。
2. `/req check` 解析顺序：动议 `meta.md` 的 `产品类型` → `company.md` 的 `productType` → 五层默认。
3. 声明了类型但盘上没有 `check-rules.json` → **报错**并列可用类型（不静默回落错规则）。
4. 模板占位 `<...>` 视为未声明（复制模板不会误报）。
5. `company.md` 不逐动议改写：它是公司身份，client 也读它显示公司信息。
6. CEO 开局在 `meta.md` 写类型；`product-definition` 先读 meta 再选 playbook；手册/指南/README 同步。

## 输掉的方案

- **每个动议改 `company.md`**：污染公司身份；并发动议互相踩；client 显示跟着漂。
- **`产品类型` 必填**：旧动议/模板迁移成本；小动议被挡。选可选 + 回落。
- **未知类型静默回落五层**：会用错编号规则，错误更隐蔽；选报错。
- **只写角色 skill、不改 checker**：角色说一套、机械检查另一套；不选。

## 后果

- 旧动议没有 `产品类型` → 回落 `company.md`，行为不变。
- 新动议写错类型会在 `/req check` 明确报错，不会拿五层规则硬跑。
- `meta.md` 模板多一行；`content/AGENTS.md` 多一条事实；CEO/CMO/VP-Eng 的 skill 多一条开局动作。
- `company.md` 仍是公司默认；未来加 `project-services` 等类型只需加包。

## 验证

- 已跑：`pnpm vitest run tests/host/commands/req-command.spec.ts tests/presets` → **7 files / 113 tests passed**
  （含 meta 优先、company 回落、未知类型、占位 `<...>`、business-software 三层、custom custom-layers）。
- 已跑：`node ./node_modules/typescript/bin/tsc -b packages/company-pack` → 无输出（绿）。
- 已跑：`pnpm verify` → **ALL PASS**；`pnpm test` → **170 files / 1409 tests passed**；
  `pnpm typecheck` → 绿；`preset-smoke` → **ALL PASS**（6 角色 + 5 support）。
- 红形态：把 `meta.md` 的 `产品类型` 写成 `nope` → `/req check` 报「未知产品类型」；删 meta 的类型 →
  回落 `company.md`；把 `company.md` 的类型删掉 → 五层默认。
