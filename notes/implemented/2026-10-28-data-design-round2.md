# 2026-10-28 · 数据设计二轮削洋葱：写通道、读信任与 K 落点（0.4.1）

状态：已交付（2026-10-28；0.4.1 + 0.4.2 迁移竞态修复；上游 = [二轮审计卡](../../_backlog/_archive/settled_issues/2026-10-28-data-design-round2.md)）

## 问题

0.4.0 已把账本迁 domain、方法层归公司级、数据卡/发布收口；二轮按 FAQ 24 的 01–10 再走一遍，
仍有 8 个残余：模型发起的 `cultivation_propose` 仍走 `node:fs`；客户端把 W 索引当 presented 展示；
session-search 索引仍在 profile；升级日志无轮转；client inject 包未全进 peer；指令/治理面可写；
`company/` 只收方法层；数据路径改动缺 T4/T7 证据。前五个是代码/发布面，后三个是边界。

## 决定

1. **模型发起的写走 `ctx.fs`**：`writeRecordViaFs` 用 `resolve` + `writeText({createIfAbsent})`，
   并传会话 `sandboxPolicy`（`ctx.sandboxPolicy.resolve({ session })`）；既有文件零覆盖，
   `FS_NOT_OBSERVED` 视为 id 碰撞重试；`ctx.fs` 缺席才回退 `node:fs` link wx。
   真 `fs-local` 测试覆盖 createIfAbsent / `FS_NOT_OBSERVED`；假 fs 集成测 tool 的通道选择。
2. **索引读信任明示**：成品页签脚注写「本索引是 host 生成的派生显示，presented 以 domain 审计账本为准」，
   并保留 `generatedAt` 静态标签；静态渲染测试钉住。**不**在 0.4.1 引入自定义 host RPC（成本/收益不划算，
   审计结论仍以 domain + `/deliverables audit` 为准）。
3. **session-search 索引落 K cache**：`<DSH_HOME>/cache/company/session-search-<profile>.db`；
   仍 per-profile 文件（`session-query-sqlite` 单进程 owner），不跨 profile 共享；`preset-smoke`
   用真 `session/search` 断言新路径存在、旧 profile 路径不出现。
4. **日志有界**：`client-errors` 与 `upgrade log` 共用 `appendRotatingLine`，256 KiB 轮转 `.1`。
5. **client inject peers 补齐**：`dsh.client.inject` 的 8 个包全进 `peerDependencies`；devDeps 已在，
   受控 lock 不变，frozen install 通过。
6. **边界（不做）**：`AGENTS.md`/owners/CHARTER 是 W、可写、非 ACL（data-model §六已写）；
   `bundle.json`/lease/logs 保持 home 既有位置（避免身份/恢复迁移）；T4/T7 只补静态/真 search
   证据，不新起 replay 场景（数据路径不进入 prompt；`presets.spec` T4 已钉“未注入指令面”）。

## 输掉的方案

- **为 catalog 加 host RPC**：能彻底移除 UI 对 W 的信任，但要新 remote 面/客户端读取路径；0.4.1 先用
  明示派生 + generatedAt，RPC 留给有真实需求时另立卡。
- **session-search 跨 profile 共享一份**：与 `session-query-sqlite` 单进程 owner 冲突；保留 per-profile 文件。
- **全量 `$DSH_HOME/company/` 迁移**：`bundle.json`/lease 是身份与恢复锚，搬动风险大于收益。
- **给 AGENTS/owners 做数据 ACL**：DSH 没有 per-role 文件 ACL；只能靠 sandbox/命令，不冒充隔离。
- **升级日志继续人工清理**：现文件小，但轮转是同一套代码，成本低；做掉。

## 后果

- `cultivation_propose` 在 `ctx.fs` 可用时受会话 sandbox policy 约束；`fs` 缺席仍可用 node:fs fallback。
- UI 不再暗示索引是审计权威；presented 的权威仍是 domain。
- 搜索索引可随 cache 清理重建；删 cache 不影响审计/会话。
- client inject peers 完整；非 web 组合仍不承诺（`platform: web`）。

## 追加（同日，0.4.2）：迁移 copy 的 check-then-copy 竞态

- 旧实现 `existsSync(dest)` + `copyFileSync(source, dest)` 在双进程/外部并发下可能覆盖新方法；改为
  `copyFileSync(..., COPYFILE_EXCL)` 发布，`EEXIST` 后再比较内容/落冲突备份；冲突备份也 EXCL。
  marker `wx` 与旧文件只读保留不变。
- 测试：`method-migration.spec.ts` 新增“已有 `.legacy` 冲突备份不被覆盖”；4 tests 全绿。
- 版本：0.4.2（0.4.1 之后的补丁）。

## 验证（实跑，2026-10-28）

| 检查 | 结果 |
|---|---|
| `pnpm test` | **115 files / 999 tests** 全绿 |
| `pnpm verify` | ALL PASS（data-model 75/76；dist-manual 0.4.1；release-ready） |
| `pnpm typecheck` | exit 0 |
| `preset-smoke` | ALL PASS（含 `session/search` → K cache + 旧 profile 路径缺席） |
| `release --prepare` / `--verify` | 0.4.1 tarball（125 条目）/ verify 全绿 |
| 专项 spec | `fs-record-write`（真 fs-local）、`fs-record-sandbox`（真 fs-sandbox policy）、`cultivation`（ctx.fs 通道）、`bundle-manifest`（日志轮转）、`deliverables-catalog`（派生显示） |

**未验 / 边界**：`fs-sandbox` 的 per-call policy 已有真 `fs-sandbox + sandboxPolicy` 测试
（根内可写、根外 `FS_SANDBOX_DENIED`；平台 temp 是 writableRoots 允许面，不拿它当反例）；
catalog 仍是 W 派生显示；全量 namespace/指令 ACL 不做；T4/T7 无新 replay/视觉场景。

## 范围 / 排除

- 范围：二轮 8 项的代码/文档/发布收口（0.4.1）。
- 排除：多租户/跨机器、改 vendor、E1 依赖、`bundle.json` 迁 domain、全仓改名、per-role ACL。
