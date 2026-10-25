---
status: 推敲中
opened: 2026-10-25
---

# 推敲：部署身份与盘守卫（不同公司共用同一产品）

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> 条件已满足：Q2 = 不同公司（2026-10-25 goal 裁决），本卡启用；同公司多人只保留 owners/multi-human 文档。

**问题与期望结果：** 如果这个插件要装给不同公司，出厂内容现在写的是“梦之队”一家：品牌硬编码、org 是具体样例、没有公司名/编制的配置缝；同时没有“这个会话的 cwd 是不是公司盘”的守卫。期望：不同公司不改源码就能部署；角色不会在错盘上半空运行；dev 符号链接策略不会把用户改动写回产品源。

**当前情况：**
- 品牌硬编码在 [Brand.tsx](../../packages/company-pack/src/client/Brand.tsx)（`DSH 梦之队`）；手册标题也是“梦之队”。
- 出厂 org（[org.md](../../packages/company-pack/workspace/kb/org.md)）是具体样例（50 人 / 9 客户 / $ 数字）；[owners.md](../../packages/company-pack/workspace/kb/owners.md) 是待填起动件。
- 一个 home 可注册多个 workspace；插件不校验会话 cwd 是否为 bundle 的 workspace；错盘时页签会半空。
- dev 形状用符号链接把手册/模板/org 指回 pack（[bundle-init.mjs](../../tools/bundle-init.mjs)）；非维护者跑 dev 形状会写产品源。
- `bundle.json` 的 workspace 在盘内记相对、盘外记绝对（[bundle-manifest.ts](../../packages/company-pack/src/host/bundle-manifest.ts)）。

**未决问题：**
- Q2：不同公司（启用本卡）还是同公司多人（关闭本卡）？
- “梦之队”是产品名还是公司名？推荐：产品默认名，部署的公司名走配置。
- 配置放哪：`kb/company.md`、`bundle.json` 字段、还是 env？要可备份、可迁移、可被角色读到。
- 错盘 guard 的强度：提示 / 禁用 company 页签 / 拒绝 company preset 会话？不能误伤维护者的 coding 会话。
- dev 链接策略：保持 maintenance-only 并写清，还是给 `bundle:init --copy` 给独立环境用？

**下一步：** 等 Q2；若启用，写 RFC；先定义“部署身份”数据形状与 guard 行为，再改 Brand/手册/启动件。

## 范围与排除项
- 范围（启用时）：公司名/品牌配置缝、样例标注、workspace guard、dev 链接策略、文档。
- 排除：多租户 SaaS、同一 home 多公司、角色编制重设计。

## 已知与未决
- 已知：DSH 本身没有“公司”概念；这是 pack 加的语义。
- 未决：配置是否要进 `bundle.json`（身份文件）还是 workspace（业务数据）；guard 是否要 host 侧还是 client 侧。

## 方案与取舍
- A 产品名固定 + 公司名配置（推荐）：品牌仍是产品，公司事实走 workspace；改动小。
- B 完全品牌可配置：不同公司有自己的皮肤；需要 client 配置面，成本高。
- C 不做：只适合“同公司多人”；若 Q2 是不同公司，会在第三方产生“这是谁家公司”的困惑。

## 验收标准

（初稿；Q2 启用后定稿。）

- 配置公司名后，手册/UI 显示该公司名（或“产品名 · 公司名”），不改源码。
- 用 company preset 在非 bundle workspace 开会话：明确提示/降级，不显示半套公司数据。
- `bundle:init` 的符号链接策略在文档里明确“维护者专用”；独立环境默认 copy，门禁防止静默写 pack。
- 出厂 org/owners 首屏标“样例/待填”。

## 关闭条件
- Q2 已决；若启用，RFC 已批且验收实跑；若关闭，写明“同公司多人”的边界与替代文档。

## 裁决（2026-10-25）

- Q2 = 不同公司各自部署，本卡启用。
- 产品名固定（梦之队），公司名走部署配置；guard 先做“提示/降级”，不误伤维护者会话；dev 符号链接标维护者专用。
- 去向：`notes/proposed/2026-10-25-standalone-deployment.md`。
