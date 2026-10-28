---
status: 已结
opened: 2026-10-28
---

# 推敲：FAQ 24 二轮审计的残余数据边界

> 立卡：2026-10-28 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：做；0.4.1 实施 = [二轮削洋葱 Note](../../../notes/implemented/2026-10-28-data-design-round2.md)；8 项中 5 项修、3 项明确边界；卡按章程关闭，不阻塞后续验收。

**问题与期望结果：** 0.4.0 把账本、方法层、client-errors、records、数据卡与发布收口后，按 FAQ 24 的
01–10 再走一遍：交付面/数据面已闭合，但仍有 8 个**结构性残余**。期望逐项决定「做 / 不做 / 明确边界」，
避免“机器全绿、实际漏掉写通道或读信任”。

**当前情况（2026-10-28，0.4.0 @ c826191）：** 主交付 = [数据设计硬化 Note](../../../notes/implemented/2026-10-28-data-design-hardening.md)；
合同 = [data-model.md](../../../docs/data-model.md)。同期清理运行态 714M → 643M（旧 startup 日志 / diagnosis /
ux-shots / tmp / member/probe evidence / cache / session_projcache / rehearsal sessions/workspace / web-logs /
空 legacy 方法目录），保留 `harness-home/b`（登记的第二 home，含凭据）、公司 sessions、公司盘业务数据、
旧 W 账本（只读审计备份）与 0.4.0 产物。

**未决问题：** 见下表；其中 1–3 是“做不做”的选择，4–6 是“是否接受为边界”。

**下一步：** 用户逐项拍板；批准后按 0.4.1 小版本（或仅在卡上登记边界）处理。

## 残余与证据

| # | 严重级 | 残余 | 现状 / 证据 | 选项 |
|---|---|---|---|---|
| 1 | **P1 写通道** | `cultivation_propose` 是模型发起的写，但 host 用 `node:fs`（同目录 temp + `link wx`）而不是 `ctx.fs` | 不会盲覆盖，但绕过 fs 观测策略/版本守卫；见 [cultivation.ts](../../../packages/company-pack/src/host/cultivation.ts) 与 data-model 写矩阵 | A) 改 `ctx.fs.writeText` + `createIfAbsent`（异步、需 fallback/测试）；B) 保持现状，写清显式例外 |
| 2 | **P1 读信任** | `kb/deliverables-index.json` 是 W 派生视图，客户端直接读；模型可改写，host 只在启动/present/audit 重生成 | 审计权威已在 domain；但 UI 读的是可写文件，可能显示到下次重生成；见 [company-data-plane.ts](../../../packages/company-pack/src/client/company-data-plane.ts) / [catalog.ts](../../../packages/company-pack/src/host/catalog.ts) | A) 加 host 读模型 RPC（客户端不再直读 W）；B) UI 标「派生/以 domain 为准」+ 显示 generatedAt；C) 接受边界 |
| 3 | **P2 缓存落点** | `session-search.db` 在 `<profile>/`，是派生 K；未用 `dshCachePath` | `session-query-sqlite` 单进程 owner；跨 profile 共享会争用；见 [cordis.patch.yml](../../../packages/company-pack/cordis.patch.yml) | A) 迁 `$DSH_HOME/cache/company/session-search-<profile>.db`（保留 per-profile 文件）；B) 保持，文档已标 K |
| 4 | **P2 指令面** | `AGENTS.md` / `owners.md` / CHARTER 是 W、可写；模型改它会影响后续会话，并被基部哈希视为“用户改过” | 已补进 [data-model §六](../../../docs/data-model.md)；没有 ACL | A) 保持约定 + 文档（当前）；B) 把治理面移出模型可写区（需新机制） |
| 5 | **P2 日志** | `logs/company-pack-upgrade.log` 无自动轮转（client-errors 已有 256 KiB 轮转） | 当前 2.8K；人工清理；见 [bundle-manifest.ts](../../../packages/company-pack/src/host/bundle-manifest.ts) | A) 同款 256 KiB `.1` 轮转（0.4.1）；B) 保持人工 |
| 6 | **P3 命名空间** | 只有 `company/methods/` 进了 `$DSH_HOME/company/`；`bundle.json`/lease/logs 仍在 home 根 | 刻意避免身份/恢复路径迁移；见 [README Data](../../../packages/company-pack/README.md#data) | A) 全量 `company/`（大迁移）；B) 维持边界（当前） |
| 7 | **P2 验证面** | 数据路径改动后没有新增 T4 replay / 真浏览器视觉；`preset-smoke` 只证明 skills catalog，UI 读 index 未做视觉回归 | 数据不进入 prompt；`release --verify` 已跑其自带套件；见 [presets.spec.ts](../../../tests/presets/presets.spec.ts) / data-model | A) 补 T4/T7 场景；B) 记录为边界 |
| 8 | **P2 发布面** | `dsh.client.inject` 的 8 个包未全部进 peerDependencies（仅 workspace 在 peer） | web profile 真装通过；但非 web 组合无声明；见 [package.json](../../../packages/company-pack/package.json) | A) 补齐 peer + 受控 lock；B) 只对 web profile 承诺并写清 |

处置（0.4.1）：#1 `ctx.fs` 写通道、#2 派生显示标注、#3 K cache 落点、#5 日志轮转、#8 client inject peers 已修；
#4 指令/治理面文档边界、#6 `company/` 命名空间边界、#7 T4/T7 证据边界。证据 = [二轮削洋葱 Note](../../../notes/implemented/2026-10-28-data-design-round2.md)。

## 已在本轮处理的（不算残余）

- **指令/治理面**：`AGENTS.md` / `owners.md` / CHARTER 的“W 可写、非 ACL、改后影响基部哈希”已进 data-model §六。
- **运行态清理**：旧 startup 日志、diagnosis、ux-shots、tmp、member/probe evidence、cache、session_projcache、
  rehearsal sessions/workspace、web-logs、空 legacy 方法目录已清；保留 `harness-home/b` 与公司 sessions。
- **0.4.0**：账本 domain、方法层 home、client-errors、records schema、数据卡 v2、peer/lock、发布检查全部已交付。

## 范围与排除项

- 范围：表 1–8 的逐项决定与（若批）0.4.1 实施。
- 排除：多租户/跨机器、改 vendor、E1 依赖、把 `bundle.json` 迁 domain、全仓改名、per-role 数据 ACL。

## 验收标准（若批准实施）

- #1：模型工具写记录走 `ctx.fs`（有 fallback），既有 `link wx` 不覆盖语义保持；spec 覆盖成功/拒绝/冲突。
- #2：客户端不再把 W 索引当审计权威（RPC 或 UI 明示 + generatedAt）；无第二权威。
- #3：搜索索引落 K 且仍单进程 owner；删缓存可重建。
- #5：升级日志 256 KiB 轮转 `.1`，测试覆盖。
- #8：peer 声明与 lock 受控更新；release-smoke 仍通过。
- 全量：`pnpm verify` + `pnpm test` + `pnpm typecheck` + `release-smoke`/`lifecycle-smoke`；0.4.1 `release --check` READY。

## 关闭条件

结论已确认（做）且 0.4.1 实施记录/downstream 去向已记录；不做的项写清边界。本卡按章程关闭，不等后续验收。
