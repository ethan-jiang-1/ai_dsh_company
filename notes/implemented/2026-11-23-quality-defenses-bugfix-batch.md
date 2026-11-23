状态：implemented（2026-11-23）；批准：用户 2026-11-23 批准 `BUG-333..350` 批次计划并启动 `/goal` 推进｜上游 = [BUG-342](../../_backlog/_archive/fixed_bugs/BUG-342-handbook-override-follows-symlinks-and-crashes-on-dir.md)、[BUG-341](../../_backlog/_archive/fixed_bugs/BUG-341-cold-boot-company-identity-skipped-and-quoted-empty-product-name.md)

# 质量防线审查与探查批次收口（BUG-333..350 伞形记录）

## 决定

针对 2026-11-23 质量防线审查与构造探查发现的系统性问题，按根因聚类分 6 顺位收口（不逐卡打症状补丁）：

1. **顺位 1 · P1 安全读面收口（[BUG-342](../../_backlog/_archive/fixed_bugs/BUG-342-handbook-override-follows-symlinks-and-crashes-on-dir.md)）**：
   [`readHandbook`](../../packages/company-pack/src/host/prompt/handbook.ts) 读取 `.dsh-company/overrides/AGENTS.md` 改走共享安全读面 [`readCompanyFile`](../../packages/company-pack/src/host/run-bundle/company-root.ts)，拒绝叶子/中间段 symlink、目录及越界路径；遇 `unsafe` 时安全回退到 pack 默认 `content/AGENTS.md`，并在 [`registerHandbook`](../../packages/company-pack/src/host/prompt/handbook.ts) 记录 `logger.warn` 而非抛 `EISDIR` 打崩 `apply()`。
2. **顺位 1 · P1 冷启动身份订阅与 YAML 标量同源（[BUG-341](../../_backlog/_archive/fixed_bugs/BUG-341-cold-boot-company-identity-skipped-and-quoted-empty-product-name.md)）**：
   [`registerSidebarIdentity`](../../packages/company-pack/src/client/index.ts) 改为通过 `scoped.effect` 订阅 `sessions.list`（优先 `retainedBy.mainView > 0`、其次非 `subagent` 根会话），按 `${sessionId}:${cwd}` 变化触发读取并在卸载时中止在途请求且重置缓存；[`parseCompanyIdentity`](../../packages/company-pack/src/client/data/company-identity.ts) 复用共享 [`yamlScalar`](../../packages/company-pack/src/lib/docs/yaml-scalar.ts) 解引号与行尾注释并过滤 `<...>` 占位符，确保出厂 `productName: ''` 正常回退出厂词标。
3. **顺位 2 · host 独立缺陷收口（[BUG-345](../../_backlog/_archive/fixed_bugs/BUG-345-lease-reentrant-release-leaks-heartbeat-interval.md) / [BUG-346](../../_backlog/_archive/fixed_bugs/BUG-346-presented-ledger-concurrent-write-lost-update.md) / [BUG-344](../../_backlog/_archive/fixed_bugs/BUG-344-subagent-retry-reports-zero-attempts-when-second-start-aborts.md) / [BUG-343](../../_backlog/_archive/fixed_bugs/BUG-343-req-command-delivery-mode-bypasses-safe-content-id.md) / [BUG-349](../../_backlog/_archive/fixed_bugs/BUG-349-cultivation-revoke-overwrites-already-revoked-records.md)）**：
   租约重入释放抽共享 `releaseLease` 统一清理心跳定时器；账本 store 写操作按实例串行化并给临时文件补 UUID 后缀；`subagent_retry` 启动取消时以 `childIds.length` 上报 `attempts`；`/req check` 的 `deliveryMode` 改走 `isSafeContentId` + 目录枚举（与 `/delivery check` 同口径）；撤回与完整性核对共用 `isActiveAdoptedRecord` 谓词，历史已撤回记录不再被覆盖 `revokedAt`。

## 输掉的方案

- **在 `readHandbook` 内局部手写 `lstatSync` + `statSync`**：会与 [`company-root.ts`](../../packages/company-pack/src/host/run-bundle/company-root.ts) 形成第二套路径安全实现并漏掉 `.dsh-company/` 或 `overrides/` 中间段 symlink 校验；统一消费 `readCompanyFile`。
- **遇到非法 override 时直接 throw 打断注册**：会让模型可写面上的一个误建目录或链接整宿主砖掉；回退默认手册并告警既守住安全边界又不致砖。
- **在 `parseCompanyIdentity` 局部剥单引号 / 在 `loadIdentity` 用轮询重试**：局部剥引号会再度与 `yamlScalar` 的双引号/注释/占位符规则脱节；轮询不如直接订阅 `sessions.list` 并在 fiber 退出时精确清理。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 手册覆盖安全读面 | [`readCompanyFile`](../../packages/company-pack/src/host/run-bundle/company-root.ts) | [`readHandbook`](../../packages/company-pack/src/host/prompt/handbook.ts) 消费；`registerHandbook` 经 `ctx.logger.warn` 上报 `unsafe` |
| 冷启动部署身份订阅与标量解析 | [`registerSidebarIdentity`](../../packages/company-pack/src/client/index.ts) + [`yamlScalar`](../../packages/company-pack/src/lib/docs/yaml-scalar.ts) | [`parseCompanyIdentity`](../../packages/company-pack/src/client/data/company-identity.ts) 消费；`DreamTeamBrandName` 订阅展示 |

## 验证（真跑过）

- **BUG-342**：`pnpm test tests/host/prompt/handbook.spec.ts` —— 修复前 2 failed / 6 passed（外部 symlink 透传 `OUTSIDE_SECRET`、目录抛 `EISDIR`）；修复后 8/8 passed，联动 `pnpm typecheck`、`pnpm lint`（`company-static-audit` 141 文件 0 违规）及 `tests/host/contract/file-shape-agreement.spec.ts`（94/94）全绿。
- **BUG-341**：`pnpm test tests/client/ui/brand.spec.ts tests/client/company-client-composition.spec.ts` —— 修复前双红（`expected '\'\'' to be ''`、冷启动 `readCount` 为 `0`）；修复后 11/11 passed，`pnpm typecheck`、`pnpm lint`、`node tools/dev/build-client.mjs` 全绿。
- **BUG-345/346/344/343/349**（并行进程与接管人实跑）：各 spec 修复前 1 failed（心跳定时器泄漏 / 并发写丢更 / `attempts: 0` 与 `childIds` 矛盾 / `..` 被放行），修复后 26/26、对应 host spec 全绿；`pnpm typecheck`、`pnpm lint` 随批复核。

## 未覆盖轴

- [covered] `readHandbook` 对叶子 symlink、中间段 symlink、目录及合法 override 的行为与 `registerHandbook` 降级日志 → [`tests/host/prompt/handbook.spec.ts`](../../tests/host/prompt/handbook.spec.ts)
- [covered] `parseCompanyIdentity` 对出厂 `productName: ''`、引号/注释/占位符及 `bootClient` 冷启动 `sessions.list` 到达触发读取 → [`tests/client/ui/brand.spec.ts`](../../tests/client/ui/brand.spec.ts) 与 [`tests/client/company-client-composition.spec.ts`](../../tests/client/company-client-composition.spec.ts)
- [policy] pack 自身只读 `content/AGENTS.md` 仍假定安装形态受包边界保护，不走 workspace `.dsh-company` 校验 → [`packages/company-pack/src/host/prompt/handbook.ts`](../../packages/company-pack/src/host/prompt/handbook.ts)
