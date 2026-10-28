---
status: 推敲中
opened: 2026-10-28
---

# 推敲：数据设计的硬软边界、权威归位与写通道

> 立卡：2026-10-28 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：做；RFC = [data-design-hardening](../../notes/proposed/2026-10-28-data-design-hardening.md)（批准：用户 2026-10-28「你发现的问题我都想修复」）；实施按 M1→M4，完成有证据后归档。

**问题与期望结果：** 对照 FAQ 24（发布/定义/数据 6+2/原生能力/T0–T8）与 FAQ 26（数据家/承诺），我们的
数据平面大体选对，但**写权限边界**没有落地：审计账本在模型可写的工作区、派生索引被 UI 当权威、方法层
按 profile 路径而非公司归位、数据卡缺“写者/通道/可见性/硬软/版本”。期望把每条事实的“谁写、走哪条通道、
谁看得见、坏了谁负责”写成可执行合同，并让测试/备份/卸载同 diff 收口。

**当前情况（只读审计，2026-10-28）：** 详见下表；现合同 = [data-model.md](../../docs/data-model.md)，
用户侧摘要 = [pack README Data](../../packages/company-pack/README.md#data)。基线实跑：`pnpm verify`
ALL PASS；`pnpm test` 111 files / 980 tests 全绿（RFC 写入前的基线）。

**M1 进度（2026-10-28）：** records `schema: 1`、client-errors 迁 `$DSH_HOME/logs/company-client-errors.log`
（256 KiB 轮转，旧路径只读留一版）、T4 措辞、`preset-smoke` 数据感知（临时方法 fixture 真红→绿）、
data-model 数据卡 v2/硬软表/六版本/标识符、README Data 6+2 与 Backup、home 白名单测试已落地。
`pnpm test` 111 files / 983 tests、`pnpm verify`、`pnpm typecheck` 全绿。M2 账本、M3 方法层、M4 收口待做。

**未决问题：** 无阻断项。M2/M3 动数据路径前按 RFC 再呈一页迁移/回滚；账本 H 的“用户不再直接手改
JSON”与版本 0.4.0 的备份/手册成本已登记在 RFC「风险」节。

**下一步：** 按 RFC M1（合同+低风险）→ M2（账本迁 domain）→ M3（方法层归 home）→ M4（收口/发布）
实施；每条一个 commit，完成发六行回执。

## 事实与判据（显性化清单）

| # | 严重级 | 事实 | 现在 | 证据 |
|---|---|---|---|---|
| 1 | **P0 权威** | `presented` 账本是操作员审计权威，却在公司盘 W，模型可写 | 每个角色挂 `tool-fs`；账本在 `company-workspace/kb/deliverables-presented.json`；bash 同样可写 | [data-model.md](../../docs/data-model.md)（账本行）、[ceo preset](../../packages/company-pack/presets/ceo/agent.cordis.yml#L67)、[catalog.ts](../../packages/company-pack/src/host/catalog.ts#L8-L10) |
| 2 | **P0 信任** | `kb/deliverables-index.json` 是派生视图，客户端直接读它展示 `presented` | 索引可被模型改写；host 只在启动/present/audit 重生成 | [company-data-plane.ts](../../packages/company-pack/src/client/company-data-plane.ts#L28-L30)、[catalog.ts](../../packages/company-pack/src/host/catalog.ts#L86-L88) |
| 3 | **P1 作用域** | 方法层住 `<profile>/company-cultivation/<role>/`，跟 profile 而非公司 | 换 profile 丢方法；同 home 两 profile 各一份；dev home 已实测 2 个 profile 告警 | [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml#L71)、[preset customSkillDirs](../../packages/company-pack/presets/ceo/agent.cordis.yml#L58-L64)、[agent-cultivation-loop](../../notes/implemented/2026-10-13-agent-cultivation-loop.md) |
| 4 | **P1 混居** | 浏览器诊断日志写进公司盘 `cultivation/client-errors.log`；home 根散落 bundle/lease/logs | 运维日志混进公司内容；所有权不一眼可见 | [client-diagnostics.ts](../../packages/company-pack/src/host/client-diagnostics.ts#L16)、[release-smoke.mjs](../../checks/smoke/release-smoke.mjs) |
| 5 | **P2 数据卡** | 现表缺“谁拥有/关于谁、谁必须看见、谁可以写、哪条通道、硬/软、版本/测试” | 账本问题在表里看不见；方法层隔离强度无“沙箱模式”列 | [data-model.md](../../docs/data-model.md)（事实表） |
| 6 | **P2 口径** | “分身写不了方法层”“角色私有”被写成绝对句 | 只在 `workspace-write`/`read-only` 成立；`danger-full-access` 无围栏；角色目录只是约定 | [run/env.sh](../../run/env.sh#L47)、[fs-sandbox README](../../vendor/dsh/packages/fs/fs-sandbox/README.md) |
| 7 | **P2 测试** | `preset-smoke` 断言 `skills/list` 恰好等于包内技能；T4 说“catalog 没有模型可见路径” | dev home 有 adopt 方法就假红；索引在 workspace 内、fs 可读 | [preset-smoke.mjs](../../checks/smoke/preset-smoke.mjs#L147-L165)、[presets.spec.ts](../../tests/presets/presets.spec.ts#L69) |
| 8 | **P2 发布** | `files`/`exports`/技能发现/`dsh.client.inject` peers 与数据路径耦合 | 改数据路径/资源时缺一条 T0 断言 | [release-smoke.mjs](../../checks/smoke/release-smoke.mjs#L205-L255) |

## 硬软边界（本卡的核心结论）

| 边界 | 现在靠什么 | 硬吗 | 处置 |
|---|---|---|---|
| 包目录只读 | 安装器 | 硬 | 保持 |
| 公司盘写入 | fs-sandbox / bash 沙箱 | `workspace-write` 下硬；`danger-full-access` 下无 | 文案限定模式 |
| 审计账本 | W 文件 | 软（模型 fs/bash 可写） | 迁 H domain |
| 成品索引 | W 文件 | 软且派生 | 只当显示缓存 |
| 方法层 | workspace 外 profile 目录 | `workspace-write` 下硬；`danger-full-access` 下软 | 迁 home + 声明模式 |
| 角色私有 | `kb/<role>` 约定 / writeScopes advisory | 软 | 写清不是数据隔离 |
| 签字线 | prompt + `request_signoff` | 只有工具被调用时硬 | 改文案，不改机制 |
| session 事件 | 读取方校验 | 硬 | 保持 |
| storage domain | schema/version | 硬 | 用起来（账本） |

## 写矩阵（数据卡 v2 的新维度）

| 通道 | 可以写 | 不该写 |
|---|---|---|
| 模型工具 | 内容：records/journal/drafts/final、`present` 声明 | 审计账本、方法层、`bundle.json`、lease |
| 人命令 | adopt/revoke/audit/archive/diagnostics | 内容正文（可走 fs，但应是人改） |
| host apply | 骨架 seed/upgrade、catalog、从事件记 ledger | 用户正文（除 seed/upgrade） |

## 范围与排除项

- 范围：RFC 的 M1–M4（合同、账本、方法层、日志/版本/测试/发布同 diff）。
- 排除：多租户/跨机器同步、session 删除 API、改 vendor、E1 依赖、per-role 数据隔离、全仓改名
  `run bundle`/`bundle.json`/`agent.cordis.yml`、`bundle.json` 迁 domain、公司内容搬 H。

## 验收标准

按 RFC 的「## 验收」执行，关键判据：

| 段 | 判据（先红后绿） |
|---|---|
| M1 | `pnpm verify`、`pnpm test tests/presets tests/company tests/client`、`preset-smoke`、home 白名单 diff；records schema 与 client-errors 迁移各有红样 |
| M2 | domain `company_deliverables`（`UNIT_NAME_RE` 只认下划线）schema/迁移；删 index/domain 后 `true` 可回扫、`false` 保留；模型 fs 写旧 W 账本不改变权威；business 备份/restore |
| M3 | 六份 preset + host config 新路径；旧 profile 方法迁移；双 profile 看到同一方法；探针（含 `workspace-write` 写隔离红/绿） |
| M4 | `verify`/`test`/`typecheck`/`release-smoke`/`lifecycle-smoke`；0.4.0 手册/CHANGELOG/`release --check`；回滚演练 |

## 关闭条件

RFC 的 M1–M4 有实跑证据（含红样）且同 diff 更新合同/README/安装手册；本卡写 `可关闭：是` 并
`git mv` 到 [settled_issues](../_archive/settled_issues/README.md)。实现前不关闭。
