---
status: 待落地
opened: 2026-11-12
---

# 推敲：高复杂度面的持续探索（培养 / 委派 / run-bundle / 账本 / 客户端流）

> 立卡：2026-11-12 ｜ 状态：待落地 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 本卡执行多轮探索 + 证据（发现缺陷另开 `_backlog/bugs/` 卡，从 BUG-090 起）；本卡不改产品代码。
>
> **授权边界**：静态 / keyless / 真挂载 / 真页面可自主；live 模型轮按每轮小预算、隔离 workspace 跑（入口与预算写在 Round 头）。不修产品代码；不改 vendor。

## 问题与期望结果

前十张 BUG（080–089）已在 `50878cd6` 收口，活跃缺陷清零。但**修完已知缺陷不等于高复杂度面已经可信**：本仓真正难的面是那些**有状态、有派生、有并发/生命周期、且测试只在固定夹具上绿**的部分。本轮起按宪章轮转，每轮只打一个面，目标是找出「下一个 080」而不是再跑一遍已知绿。

**期望结果：** 每轮有：选面理由、期望表（独立 oracle）、实跑证据、H 判决（confirmed / refuted / unverified）、缺陷卡或观察、未跑面与 owner。没有「没有 bug」的结论；单场 live 不写稳定。

**当前情况（2026-11-12 修复后）：**

- 起点 = `50878cd6`（BUG-080..089 修复）｜Note = [startup/wiki bug sweep](../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)｜十张卡已迁 [fixed_bugs](../_archive/fixed_bugs/README.md)｜活跃缺陷 = 空。
- 修复后基线（Note 实测）：`pnpm test` 236 files/1761 tests；typecheck/lint/dup 绿；`verify` ALL PASS；`ui-scene-smoke --isolated --lang en` 10/10；`release-smoke` ALL PASS。本卡不重复这些全量门禁，只在需要的面抽样。
- 已知开放点（Note「剩余风险」）：`fs.watch` 平台降级；内容包新增类型仍需重启；其它 host 命令仍中文；`/req` `/prd` 的 workspace 仍 boot 优先——都可作为后续宪章的种子，但不在本卡第一轮抢修。
- 宪章的「低置信」判据：代码体量大 / 状态跨 home+workspace / 派生文件无新鲜度契约 / 有多进程或并发 / 测试只固定夹具 / 只在真页面或真 team 才暴露。

## 范围与排除项

**范围（轮转宪章）：**

| ID | 面 | 为什么低置信 | 首批入口 |
|---|---|---|---|
| C1 | **培养状态机 + 存储**（propose / adopt / reject / revoke / verify / archive / purge / check / journal / 方法层 / context） | 最大单文件 713 + storage 512 + client actions 726；跨 home 方法层与 workspace records；人侧命令 / GUI / 模型提案三条入口；append-only 与撤回并存 | `tests/host/cultivation/`、`tests/client/cultivation/`、`probes/session-context/cultivation-*`、[contract](./../../docs/contracts/cultivation.md) |
| C2 | **委派 / team / workflow 生命周期** | seat、depth、spawn/wait/interrupt/send_message、member scope、task board、workflow durable view；多进程与冷恢复 | `checks/smoke/product-team-e2e-smoke.mjs`、`probes/team/`、`tests/host/delegation/`、[contract](./../../docs/contracts/delegation.md) |
| C3 | **run-bundle / workspace / lease / upgrade** | v3 身份、seed 只补缺、home 与 workspace 双轴、writer lease、外部盘、二次启动、迁移/回滚 | `checks/smoke/release-smoke.mjs`、`external-workspace-smoke`、`company-entry-smoke`、`tests/host/run-bundle/` |
| C4 | **账本 / 成品 / 治理导出** | presented ledger 派生、catalog、final.md、审计哈希、治理导出幂等/重建 | `tests/host/ledger/`、`probes/browser-visual/deliverables-catalog-probe.mjs`、[data-model](./../../docs/contracts/data-model.md) |
| C5 | **任务板 / 在场 / DAG / 客户端流** | 文件派生 + 实时 follow + 多窗口/浮动/会话切换；stale/empty/error 三态 | `probes/fs-taskboard/`、`tests/client/`、`ui-scene-smoke --steps` |
| C6 | **命令 / 解析 / 数据命令的 workspace** | `/req` `/prd` `/delivery` `/deliverables` 仍在 boot 优先；解析器与回执/locale 各写一份 | `tests/host/commands/`、`tests/content/`、`company-entry-smoke` |
| C7 | **发布 / 安装 / 隔离** | tarball、plugin add/remove/upgrade、多 home、profile 共享、content 打包 | `release-smoke`、`multi-install-smoke`、`isolation-matrix-smoke`、`concurrent-home-smoke` |

**排除：**

- 修产品代码、改 contract / content / presets / vendor；发现缺陷只开卡或记录。
- 重跑已闭合的启动策略/wiki 全量矩阵；除非宪章把它当**回归参考**（不与 C1–C7 同时展开）。
- 把「跑绿」当结论；把单场 live 写成稳定；把未跑折成 PASS。
- 发布声明 / 公有 registry；release-smoke 只作安装形状证据。

## 方法（每轮固定）

1. **选面 + 写期望**：从宪章选一个面，先写 8–12 条可证伪假设与独立 oracle（合同/归档验收/内容文件/vendor 行为），不拿实现当 oracle。
2. **静态取证**：读代码、测试、probe、Note 的「未跑/剩余风险」；列出测试只在固定夹具上成立的判据。
3. **对抗夹具**：优先 keyless 真文件/真 Cordis/真装配；为每条关键断言做一次最小破坏，看现有 spec/门禁是否真会红。
4. **真实入口**：`preset-smoke` / `client-load-smoke` / `ui-scene-smoke --isolated --steps` / `release-smoke` 按面选择；live 只在必须回答模型行为时跑，用隔离 workspace/home。
5. **判决 + 证据**：每格 PASS / FAIL / 未证 + 原因；FAIL 立刻开 `_backlog/bugs/` 卡（BUG-090 起）；观察标 owner。
6. **回填**：本卡追加 `## Round N`（已跑面、H 判决、BUG 卡、未跑面）；不覆盖旧结论。

## Round 1（C1 培养状态机/存储）

**选面理由：** C1 是体量最大、状态最跨轴（workspace records / home 方法层 / journal / 人侧命令 / 模型提案 / GUI）、且同时在 client 与 host 两侧有 700+ 行动作逻辑的面；已知测试多，但「记录 + 方法层 + 撤回 + 迁移」的组合容易在固定夹具外失效。

**首轮假设（先写死）：**

| ID | 假设 | oracle |
|---|---|---|
| H1 | 记录/提案 slug 或 ID 可碰撞：两个来源不同的采纳写同一方法层 slug，后写覆盖前写；revoke 其中一个会删掉另一条仍在用的方法 | 合同「按角色隔离、公司级、pack 升级不擦」+ 记录与方法的对应 |
| H2 | 跨角色采纳/拒收/撤回没有角色闸：A 角色可以采纳 B 的提案，或撤回别人的方法 | 合同「目标角色本人采纳」+ propose guard |
| H3 | `revoke` 只删方法层目录，但 `check` / 记录 / 客户端的「已采纳」仍把它算作有效；或 revoke 不幂等 | 合同「撤回删目录；记录历史只追加」 |
| H4 | 记录/方法层写入不是原子或没有并发保护：两个 adopt 同毫秒/同文件竞态，留下半份/临时文件 | 数据落点 + 原子写先例 |
| H5 | `--context` 的 base64url / JSON / 文件引用 / 超大 excerpt 可把坏数据写进 frontmatter，或让 host 读任意路径 | 合同「host 读后写 contexts；只取用户/助手文字」+ 沙箱 |
| H6 | 旧 `company-cultivation/` 迁移不幂等或有冲突：重复迁移覆盖新方法、半份目录、旧路径仍被消费 | 合同「旧目录只读留一版」+ 迁移 spec |
| H7 | `archive` / `purge` / `check` 对坏记录、缺 frontmatter、重复 ID、CRLF 的处理不一致，导致「不可达 ≠ 0」被折成 0 | 合同「数据诚实：不可达 ≠ 0」 |
| H8 | client actions 把失败回执解析成成功，或刷新时机错：命令成功但面板不更新 / 失败仍显示已采纳 | `cultivation-actions` + 面板状态 |
| H9 | 模型提案（`cultivation_propose`）可越权：目标角色/来源角色/正文自由字段没有 guard，或 support/child 能提案到名册角色 | 合同「分身只能提案；CEO 仅建议权」+ 名册 |
| H10 | 同一 home 顺序服务多个 workspace 时，records（workspace）与方法层（home）的归属错位：A 项目的采纳出现在 B 项目，或 lead 映射把 teammate 的记录记到错的角色 | 合同「记录 = 公司盘；方法层 = home；teammate 按 Lead 记账」 |

**首批证据入口：** `docs/contracts/cultivation.md`、`tests/host/cultivation/`、`tests/client/cultivation/`、`tests/lib/cultivation.spec.ts`、`tests/support/cultivation-harness.ts`、`probes/session-context/cultivation-{propose,method-layer,context}-probe.mjs`。先静态逐条对照，再 keyless 对抗夹具；live 只用于 H8/H9 的模型行为（小预算）。

**结果：** 跑后在此追加；BUG 卡从 BUG-090 起。

### Round 1 结果（2026-11-12）

**状态：** C1 首轮跑完；4 张 BUG 卡（BUG-090..093），无产品代码改动。

| H | 判决 | 证据 / BUG |
|---|---|---|
| H1 slug/ID 碰撞覆盖 | **refuted（keyless）** | `installMethod` 对已存在方法目录返回 false、记录用 `writeNewFile` 独占 + `newRecordId` 重试；现有 collision spec 覆盖。未跑多进程并发。 |
| H2 跨角色采纳/拒收/撤回 | **refuted** | `ceo` 采纳/拒收 `cfo` 的记录均 error「仅建议权 / 请在该角色会话」；`cfo` 采纳成功。证据 = `runtime/tmp/c1-role-guards.mts`。 |
| H3 revoke 后 check/记录一致性 | **confirmed** | [BUG-091](../_archive/fixed_bugs/BUG-091-cultivation-check-revoked-broken-unsafe.md)：revoke 后记录仍 status adopted，check 报「记录缺方法」。 |
| H4 原子/并发 | **部分 pass** | 记录 CAS（expectedText + 二次读）、sibling-temp rename、方法 mkdir 独占均有 spec；未跑真多进程/断电。 |
| H5 `--context` 边界 | **unverified** | 未造 base64url 坏形状、超大 excerpt、deliverable 索引缺/坏、sessionQuery 缺失的真实命令；代码有 `CONTEXT_COMMAND_MAX_BYTES`/`clipExcerpt` 但未逐格判。 |
| H6 迁移幂等/冲突 | **confirmed + 部分 pass** | 合法输入幂等（marker + copy EXCL）；**非法 slug 被原样搬进方法层** → [BUG-093](../_archive/fixed_bugs/BUG-093-cultivation-legacy-migration-invalid-slug.md)。 |
| H7 archive/purge/check 坏记录 | **confirmed** | [BUG-091](../_archive/fixed_bugs/BUG-091-cultivation-check-revoked-broken-unsafe.md)：check 不计 `loadRecords.broken`，坏记录被当成 0 条。 |
| H8 client actions 失败/刷新 | **unverified** | `cultivation-actions.spec` 覆盖命令构造/失败上行，但未跑真实面板「采纳后刷新/失败仍显示已采纳」的 steps。 |
| H9 proposal guard | **部分 pass / confirmed** | 角色/kind/self-target guard 命中（`c1-role-guards`）；**空 expectation/body 不拒** → [BUG-092](../_archive/fixed_bugs/BUG-092-cultivation-propose-empty-fields.md)。 |
| H10 同 home 多 workspace | **confirmed** | [BUG-090](../_archive/fixed_bugs/BUG-090-cultivation-revoke-unreachable-records-deletes-method.md)：B workspace 把 A 的方法报 orphan，revoke 删掉 A 的方法且「标记 0 条记录」；records 目录缺失同样删。 |

**额外发现（H 表外）：**

- **`/cultivation revoke` 在 records 目录不可达时删除方法**：`loadRecords` 返回 `reachable:false`，revoke 只看 `.records` 不看 reachable；`check` 同场景会 error，形成「check 说不可达、revoke 说删成功」的对照。→ 并入 BUG-090（同一根因）。
- **`/cultivation check` 的非法 methodSlug 抛普通 Error**：adopted 记录 `methodSlug: ../evil` → `readMethod` 抛 `不安全的方法路径`，command handler 只 catch `UnsafeCultivationPathError`，命令面没有可读回执。→ BUG-091。

**证据脚本（gitignored，可复跑）：**

- `runtime/tmp/c1-check-revoke.mts`：adopt → check → revoke → check。
- `runtime/tmp/c1-guards.mts`：非法 methodSlug、空 proposal、非法 legacy slug。
- `runtime/tmp/c1-role-guards.mts`：跨角色采纳/拒收/self-target。
- `runtime/tmp/c1-cross-workspace.mts`：同 home 两 workspace 的 adopt/check/revoke。
- `runtime/tmp/c1-revoke-norecords.mts`：records 目录缺失时 revoke。

**未跑（留待后续 C1 轮或别的面）：**

- H5 背景 token 的坏形状/超大/索引缺失/ sessionQuery 缺失逐格；H8 真面板 steps；方法层在真会话的加载/撤回目录刷新；多进程并发与断电恢复；`archive`/`purge` 的坏记录边界；`verify` 在 revoke 之后的语义。

## Round 2（C3 run-bundle / workspace / lease）

**选面理由：** v3 身份、seed 只补缺、home 与 workspace 双轴、writer lease、v2→v3 升级都跨盘且输入来自 workspace（模型可写）；测试多在固定夹具上，路径/身份字段的边界最容易漏。

| H | 判决 | 证据 / BUG |
|---|---|---|
| C3-1 v2 legacy `id` 路径穿越 | **confirmed P1** | [BUG-094](../_archive/fixed_bugs/BUG-094-bundle-manifest-id-path-traversal.md)：`id: ../../../pwn` → `identityBackupPath` 穿出 home，`writeBundleManifest` 在 tmp 根写 `pwn.json`，v3 保留穿越 id。 |
| C3-2 系统 tmp 根当 workspace | **confirmed P2** | [BUG-095](../_archive/fixed_bugs/BUG-095-workspace-resolution-accepts-tmp-root.md)：`/tmp`、`/private/tmp` 都被 `resolveWorkspace` 接受为 `source:'cwd'`；注释说应排除。 |
| C3-3 lease stale / PID 复用 | **unverified / 观察** | `isAlive(pid)` 只看 PID；锁里的 `startedAt` 不参与判定。未造「旧 PID 被无关进程复用」的可复现样本；可能永久挡写，标观察。 |
| C3-4 合法 v2 → v3 升级 | **pass（spec）** | `bundle-manifest.spec` 的 legacy 升级用例 + 身份备份；本轮只额外测了非法 id。 |
| C3-5 无 workspace 零写 | **pass（spec）** | `runtime-guard.spec`「DSH_COMPANY_HOME 不存在 → 无 workspace/停写/不建目录」；resolve 在 env 缺失时提前返回。 |
| C3-6 同 home 多 profile / 多 workspace | **unverified** | `prepareCompanyRuntime` 只 warn；方法层/账本/records 的跨 workspace 面已在 C1 撞到 [BUG-090](../_archive/fixed_bugs/BUG-090-cultivation-revoke-unreachable-records-deletes-method.md)，本面未重测。 |
| C3-7 `writeSavedWorkspace` 原子性 | **unverified** | 非原子 writeFileSync；坏 JSON 读取会折 undefined，但未造崩溃/半写盘样本。 |

**额外发现（H 表外）：**

- `validateBundleManifest` 对 **v3 的 `id` 也不校验**；当前 v3 ok 时 plan=skip，不走 identity 写，所以未直接利用，但任何未来「v3 也写 identity」的改动会复现同一路径穿越。已写进 BUG-094 修复方向。
- `cwdIsUsable` 与 `validateCompanyHome` 各有一份「危险落点」判断；tmp 根只在注释里，代码没有。这正是 BUG-095 的失败类。

**证据脚本：**

- `runtime/tmp/c3-manifest-traversal2.mts`：v2 legacy id `../../../pwn` → plan backupPath / write / pwn.json。
- `runtime/tmp/c3-workspace-tmp.mts`：`/tmp`、`/private/tmp`、`tmpdir()`、`/` 的 resolve 结果。

**未跑：**

- 真双进程 lease 竞争 / stale PID 复用；bundle v2 坏类型（id 非字符串、createdAt 坏）逐格；`DSH_COMPANY_HOME` 为 symlink / 大小写 / 带空格路径；`writeSavedWorkspace` 崩溃半写；多 profile 同 home 的 lease/身份备份；release 安装后的 identity backup 路径。

## Round 3（C4 账本 / 成品目录 / 治理导出）

**选面理由：** presented 账本是「true 来自会话事件、false 只来自人审」的双源派生；目录是盘上 meta/final + 账本的派生视图；导出又是 home 权威的 workspace 快照。三层都靠 `existsSync`/JSON 手写，且 boot 时 fire-and-forget，最容易被坏形状打穿。

| H | 判决 | 证据 / BUG |
|---|---|---|
| C4-1 成品目录扫描的坏形状 | **confirmed P2** | [BUG-096](../_archive/fixed_bugs/BUG-096-deliverables-catalog-directory-eisdir.md)：`meta.md` / `kb/motion-ledger.md` 是目录 → `readFileSync` EISDIR，`regenerateCatalog` 抛；boot 的 `void initializeCatalog` 无 catch；`final.md` 目录被算成成品。 |
| C4-2 presented false/slug 语义 | **pass（spec）** | `catalog.spec` 的 false 只认精确 path、同 slug 新件不继承；`presentedOf` 实现一致。 |
| C4-3 导出幂等 | **pass（部分）** | ledger.json 内容不变不重写（`governance-export.spec`）；`methods/` 每次 cpSync 重建（内容等价但 mtime 变），未作为缺陷。 |
| C4-4 导出原子性/符号链接 | **unverified** | `atomicReplaceDir` 先 rm 再 rename；staging 失败残留、methods 内 symlink、target 是 symlink 未造样本。 |
| C4-5 presented 回扫范围 | **pass（spec）** | 只扫 companyHome 内会话、释放 observation；cwd 子目录包含。 |
| C4-6 目录幂等/坏 JSON | **pass（spec）** | 空盘二次生成不写；坏 catalog 重建且不留 .tmp；schema 2 unsupported。 |

**证据脚本：**

- `runtime/tmp/c4-catalog-dirs.mts`：`final.md` / `meta.md` / `motion-ledger.md` 是目录。
- `runtime/tmp/c4-catalog-finaldir.mts`：`final.md` 目录进入 catalog 的完整 JSON。

**未跑：**

- 导出 `atomicReplaceDir` 在 cp/rename 中途失败、methods 内 symlink、target 是 symlink；`writePresentedLedger` 与 domain store 的双写竞态；presented 回扫大日志/超时；`deliverables` 命令的 present/audit 路径在坏目录上的真实 RPC 回执；catalog `presented` 由 corrupt 账本降级为 null 的显示语义。

## Round 4（C2 委派 / team / workflow 生命周期）

**选面理由：** `workflow_runs` 的 durable 视图、`list_subagents` 的 catalog/终态、`subagent_retry` 的深度/取消、seat 矩阵都是「事件流折叠 + 多服务共用」的复杂面；测试多，但事件流配对/失败分支最容易漏。

| H | 判决 | 证据 / BUG |
|---|---|---|
| C2-1 workflow call→run 配对 | **confirmed P2** | [BUG-097](../_archive/fixed_bugs/BUG-097-workflow-runs-mispair-failed-call.md)：第一次同名调用在 run-start 前失败，第二次成功 → r2 被归到 c1，jobId 丢失，jobKnown 为 true 仍报 `lost`。 |
| C2-2 `list_subagents` 终态/身份 | **pass（spec）** | `delegation-control.spec` 覆盖 unavailable/inferred-open-turn/身份降级；本轮未跑真 durable 失败。 |
| C2-3 `send_to_subagent` 归属 | **unverified** | 实现只转发 `ctx.subagents.sendMessage`；vendor manager 是否按 parent/authority 拒绝越权未造跨 root 样本。 |
| C2-4 seat 矩阵 / support guard | **pass（spec）** | `seat.spec` / `team-seat-guard.spec`：support root 不组队、teammate 按 child 预算、未知 preset 不猜；本轮未改代码。 |
| C2-5 `subagent_retry` 深度/取消 | **pass（spec）** | `subagent-retry.spec` 覆盖 depth-exceeded、abort→interrupt、refusal/max-tokens 不重试；未跑真 activation。 |
| C2-6 `workflow_runs` per-agent 安装 | **pass（spec）** | 只有工具面有 `workflow` 的 scope 拿到工具；`ctx.set` re-provide 语义由既有 inject 守卫覆盖，未在本轮重跑真 Cordis。 |
| C2-7 team/workflow 真生命周期 | **unverified** | 本轮无 live；durable team 冷恢复、member stale write、workflow 后台 job 重启后的 `running/lost` 未跑。 |

**证据脚本：**

- `runtime/tmp/c2-workflow-mispair.mts`：失败 call + 同名成功 call 的事件序列。

**未跑：**

- 真 vendor `tool-workflow` 事件序列（失败在 run-start 前是否确有此形状；本卡用 spec 的合成事件，形状来自 vendor 测试的 run-start/result 组合）；
- 跨 root `send_to_subagent` 越权；真 team 冷恢复 / member scope；workflow 后台 job 重启后的 job 注册表；`subagent_retry` 真 activation 的 interrupted/lost 分类；`list_subagents` 的 team address 与 durable header 读失败。

## Round 5（C5 任务板 / 在场 / DAG / 客户端流）

**选面理由：** 任务状态是官方 team 投影 + 本地派生层的多源折叠；看板、DAG、在场动态各自消费同一批 status，但动态文案（live 差分/事件折算）是手写状态迁移，最容易在「非主干状态」上撒谎。

| H | 判决 | 证据 / BUG |
|---|---|---|
| C5-1 任务回退 `pending` 的动态 | **confirmed P2** | [BUG-098](../_archive/fixed_bugs/BUG-098-presence-pending-transition-shows-deleted.md)：`diffActivity` 与 `presenceFromEvents` 都把 pending 落进 `else`，显示「已删除」；首次 deleted 事件还会先报「新任务」。 |
| C5-2 board ready 语义/依赖悬空 | **pass（spec）** | `board.spec`：`readyOf` 不含自身 pending、`tasksFromTeamView` 用 `task.ready ?? (pending && readyOf)` 与官方同义；悬空 id 未就绪。 |
| C5-3 声明 vs 板面 drift | **pass（spec）** | `dependencyDrift` 覆盖 missing/unmapped/「不依赖」假阳性；本轮未造新文本形态。 |
| C5-4 DAG 成环/悬空/跨层车道 | **pass（spec）** | `dag.spec`：成环层级有界、悬空不出边、跨层走边缘、边不穿节点。 |
| C5-5 rowsFromTeamView owner/当前任务 | **pass（spec）** | `presence-board.spec`：ownerName 关联、lead 映射、未知值不崩。 |
| C5-6 真页面任务/在场面板带数据 | **unverified** | 金样只覆盖空壳；未跑有任务/成员的真页面 steps（多窗口/会话切换/浮动）。 |
| C5-7 client 流/注意力/预算 | **unverified** | `follow` 快照分页、nameById 补充、attention pending、budget 空/大值未跑真页面。 |

**证据脚本：**

- `runtime/tmp/c5-pending-activity.mts`：`diffActivity` 的 in_progress→pending/deleted/completed，以及 `presenceFromEvents` 的同一迁移。

**未跑：**

- 真 `team/task` 事件序列（vendor 是否会产生 pending 回退；即使不产生，read model 也不该把 pending 说成删除）；
- 真页面 tasks/presence/attention/budget 的数据态与多窗口；DAG 大图（>20 节点）视觉；未知 status 的 en 文案；`rowsFromTeamView` 同名成员的任务归属。

## Round 6（C6 命令 / 解析 / 数据命令的 workspace）

**选面理由：** `/req` `/prd` `/delivery` `/deliverables` 都是「人命令 + 盘上文件 + 自由文本字段」的交界；slug/path 安全已有 BUG-057 的守卫，但「路径形状对了、文件不存在/是目录/值来自模型可写 meta」仍容易漏。

| H | 判决 | 证据 / BUG |
|---|---|---|
| C6-1 `/deliverables audit` 的不存在 final | **confirmed P2** | [BUG-099](../_archive/fixed_bugs/BUG-099-deliverables-audit-nonexistent-final.md)：不存在 path 仍写账本；`true` 同时写 `slugs.nope=true`，随后创建同 slug final 即显示 `presented:true`。 |
| C6-2 产品类型/交付模式 id 的读路径 | **unverified / 观察** | `productType` / `deliveryMode` 来自模型可写 meta/company.md，`join(contentDir, product-types, id, ...)` 未校验 id 的单段性，理论上可读 content 外 JSON；当前只读、错误路径不写，未判产品缺陷。 |
| C6-3 slug / 单段路径安全 | **pass（spec）** | `resolveDeliverablePath` 拒绝 `/`、`\`、`.`/`..`、越出 deliverables 根；`req/prd/delivery` 共用；BUG-057 守卫仍绿。 |
| C6-4 产品类型/交付模式 canonical | **pass（spec）** | 旧中文 key 不解析；placeholder 视为未声明；未知类型列可用；meta 优先 company 回落。 |
| C6-5 命令解析空白 | **unverified** | `/deliverables audit` 把 path token 用单空格 join，连续空格路径不可表达（与 settings 的 parser 同族）；未造真实目录样本。 |
| C6-6 数据命令 workspace | **unverified / 观察** | `/req` `/prd` 仍 boot 优先（BUG-081 只改了策略面）；公司数据根与项目策略根是两个事实，未在本轮重判。 |
| C6-7 audit 路径穿越 | **pass（spec）** | `auditRelPath` 拒绝越出 companyRoot、非 `.dsh-company/deliverables[-archive]/<dir>/final.md`；BUG-057 的越界样本仍绿。 |

**证据脚本：**

- `runtime/tmp/c6-audit-nonexistent.mts`：不存在 final 的 true 审计 → 建同 slug final → catalog presented true。

**未跑：**

- `/deliverables audit` 的真实 RPC 回执（handler 层 dataBlocked/账本 store）与目录 final.md 样本；
- `/req` `/delivery` 的 productType/deliveryMode 路径穿越真实读（只在代码层观察）；
- 连续空格路径/带空格归档目录；`/prd` 的 MRD/PRD 目录形状；`/req` 的五层 checker 新文本形态；en 命令回执（已知其它 host 命令仍中文）。

## Round 7（C7 发布 / 安装 / 隔离）

**选面理由：** 发布路径是「源码 → build → pack → tarball → 干净 profile 安装 → 首启」的多步替换；任何一步失败都可能把上一份可用产物/手册弄丢，而 runtime 的 smoke 只证「成功路径绿」。

| H | 判决 | 证据 / BUG |
|---|---|---|
| C7-1 导出失败路径的旧产物 | **confirmed P2** | [BUG-100](../_archive/fixed_bugs/BUG-100-export-dist-deletes-old-before-pack.md)：`export-dist` 先删 `_dist` 旧 tgz/sha/手册，再 `npm pack`；pack 失败后既无新包也无旧包，tracked 手册成 deleted 态。 |
| C7-2 当前 tarball 的发布形状 | **pass（本轮实跑）** | 当前源码 `npm pack` 含 `content/wiki-template/**`、`presets/_shared/wiki/skills/**`；`release-smoke` 在修复后 ALL PASS（Note 实测，本轮未重跑）。 |
| C7-3 安装 profile 的六角色 skill 面 | **unverified / 资产缺口** | `release-smoke` 只证 preset 挂载与 content 清单；没有在 release profile 上跑 `preset-smoke` 的 `skills/list`。共享 skill 的 `node_modules/dsh-company-pack/...` 路径若坏，现有 smoke 不一定红。 |
| C7-4 多安装/并发 home/运行中升级 | **unverified** | `multi-install-smoke` / `concurrent-home-smoke` / `upgrade-while-running-smoke` 本轮未重跑；lease 的 stale PID 面已在 C3 记录观察。 |
| C7-5 路径含空格/unicode 的安装 | **unverified** | `external-workspace-smoke` 有「外部 公司盘」workspace；本轮未造 tarball 路径/安装路径带空格。 |
| C7-6 手册/dist 新鲜度 | **pass（verify）** | `pnpm verify` 的 dist-freshness / release-ready 门绿；本轮未改 `_dist`。 |

**证据：**

- `tools/export-dist.mjs` 的清理块在 build/bundle 后、`npm pack` 前；`install-manual.md` 是 tracked 删除风险。
- 当前源码 tarball 清单 = `tar -tzf` 实跑（含模板与共享 skill）；未在本轮重跑完整 `release-smoke`。

**未跑：**

- 真实 `release-smoke` 重跑（多分钟）；release profile 的 `preset-smoke`/`skills/list` 六角色；multi-install/concurrent-home/upgrade-while-running/interrupted-install/permissions-recovery；带空格/unicode 的 tarball/安装路径；export-dist 失败路径的真实复现（避免破坏 `_dist`，本卡用代码路径与 staging 推演）。

## Round 8（C7 补：真 release profile 的六角色 skill 面）

**选面理由：** 上一轮 C7 的 `release-smoke` 只证 preset 挂载与 content 清单，没证 `presets/_shared/wiki/skills/` 在 **tarball 安装副本**里能被六角色 `skills/list` 看见；这是「dev link 绿 ≠ tarball 绿」的典型缺口。

**实跑：**

1. `node checks/smoke/release-smoke.mjs --keep` → **ALL PASS**（built CLI → npm pack → 干净 `release-check` profile 真安装 → RPC → 首启/幂等/卸载重装）；profile 保留在 `runtime/harness-home/tmp/release-smoke-home/profiles/release-check`。
2. `DSH_HOME=runtime/harness-home/tmp/release-smoke-home node checks/smoke/preset-smoke.mjs --profile release-check` → **ALL PASS**：
   - 6 角色 + 5 support 全部 `session/create` 挂上；
   - 六角色 `只看见自己的 skills` 全 PASS（含 `consulting-the-knowledge-map` 共享根）；
   - client 模块闭包 70 模块、本包缺失 0。
   - 唯一 WARN 是上游模块 `@deepseek-ai/dsh-client-ui-attachment → ...ui-trajectory`，不是本包。

**判定：** C7-3（安装 profile 的六角色 skill 面）**PASS**；未发现新缺陷。C7-4（multi-install/concurrent-home/upgrade-while-running）与 C7-5（路径含空格/unicode 安装）仍未跑；[BUG-100](../_archive/fixed_bugs/BUG-100-export-dist-deletes-old-before-pack.md) 的失败路径仍待修/复现。

**证据：**

- `runtime/tmp/release-keep.log`（release-smoke ALL PASS + `--keep` 路径）。
- `preset-smoke --profile release-check` 的 stdout（上一段引用的逐项 PASS）。
- 未改代码；release profile 是 `runtime/` 下落盘状态，不入 git。

## Round 9（C7 补：multi-install / concurrent-home）

**选面理由：** 安装/隔离的 smoke 长期作为发布前置，但 v3 身份迁移后可能残留 v2 断言；多 writer lease 又依赖启动后半段的输出时序。

**实跑：**

| 检查 | 结果 |
|---|---|
| 当前源码 `npm pack` 到 `_dist`（0.11.5） | 成功；含 `content/wiki-template/**`、`presets/_shared/wiki/skills/**` |
| `multi-install-smoke` | **ALL PASS**（两 home 不串 / 非空 home 后装 / 自定义 profile base-only 预期失败 / 补 web-app 可启动 / 空 bundle 共存 / 同版本重复 add 幂等） |
| `concurrent-home-smoke --keep` | **FAIL**：`up=2 blocked=0` + `ENOENT …/home/bundle.json` → [BUG-101](../_archive/fixed_bugs/BUG-101-concurrent-home-smoke-stale-v2-and-lease-timing.md) |
| 手工两 writer 对照（同 base/profile，等 3s） | 第二个进程确实打印「另一个 writer 正在使用这个 home」；lease 生效，smoke 单次快照读早了 |

**判定：**

- C7-4 multi-install **PASS**。
- C7-4 concurrent-home **检查器陈旧/时序假红**（BUG-101），不是 lease 产品缺陷。
- C7-5（路径含空格/unicode 安装）、upgrade-while-running、interrupted-install、isolation-matrix 仍未跑。

**未跑：** `upgrade-while-running-smoke` / `interrupted-install-smoke` / `isolation-matrix-smoke`；带空格/unicode 的 tarball/安装路径；`export-dist` 失败路径（BUG-100）。

**证据：**

- `runtime/tmp/multi-install.log`（ALL PASS）。
- `runtime/tmp/concurrent-home-keep.log`（FAIL 两项）。
- `runtime/tmp/two-writer-check.mjs` 的 A/B 输出（B 打印 lease 告警）。
- `_dist` 当前 tarball（gitignored）由本轮 `npm pack` 覆盖；为让 `_dist` 与当前 tarball 自洽，又跑了 `node tools/release.mjs --prepare --force --allow-dirty`：tracked `_dist/安装手册.md` 只更新 sha/日期两行，`release-manifest.json`（gitignored）重写；无源码改动。

## Round 10（C7 补：upgrade-while-running / interrupted-install）

**实跑：**

| 检查 | 结果 |
|---|---|
| `upgrade-while-running-smoke` | **ALL PASS**：V1 0.11.5 boot 中 remove/add 0.11.6，旧实例继续 RPC/建会话；重启后 bundle 保留创建版本 0.11.5、profile 到 0.11.6、旧 session/数据仍在 |
| `interrupted-install-smoke` | **ALL PASS**：remove 后坏 tarball/不存在 tarball add 失败且数据/账本/身份仍在；re-add 恢复 roster；坏 profile package 可诊断、修复后 boot 恢复 |

**判定：** C7-4 的 upgrade/interrupted 两项 **PASS**；本轮未发现新缺陷。C7-5（isolation-matrix、带空格/unicode 路径）仍未跑；[BUG-101](../_archive/fixed_bugs/BUG-101-concurrent-home-smoke-stale-v2-and-lease-timing.md) 的检查器陈旧/时序问题仍待修。

**证据：** `runtime/tmp/upgrade-running.log`、`runtime/tmp/interrupted-install.log`；均为 `runtime/` 下落盘状态，不入 git。

## Round 11（C7 补：isolation-matrix / 外部盘 / 搬家）

**实跑：** `node checks/smoke/isolation-matrix-smoke.mjs` → **ALL PASS**：
- no-workspace：不建默认盘、不写 home bundle、输出可操作告警；
- external：`external company`（含空格）workspace 首启落 v3 `bundle.json` 到 workspace，home 不写；
- unsafe：`DSH_COMPANY_HOME=DSH_HOME` 不把公司盘写进 home 根；
- relative / tilde：按 cwd 归一、`~` 展开到 HOME，不造字面 `~` 目录；
- rebind-retired：只告警、manifest 字节不变、不留旧备份；
- move-home / workspace-move：搬 home 或搬 workspace 后 v3 id 不变。

**判定：** C7-5 的 workspace 落点/外部盘/搬家面 **PASS**；本轮未发现新缺陷。仍差：tarball 文件路径本身带空格/unicode、`upgrade-while-running`（Round 10 已 PASS）、`concurrent-home`（BUG-101 检查器假红）、`interrupted-install`（Round 10 已 PASS）。

**证据：** `runtime/tmp/isolation-matrix.log`；运行在 `runtime/`/tmp 下落盘，不入 git。

## Round 12（C6 补：真实命令回执 / 规则 id 边界）

**实跑：** 用真 handler（`registerDeliveryCommand` / `registerReqCommand`）在临时 workspace + content 上跑。

| H | 判决 | 证据 / BUG |
|---|---|---|
| C6-2 productType / deliveryMode 的读路径 | **confirmed P1** | [BUG-102](../_archive/fixed_bugs/BUG-102-req-delivery-rule-path-traversal.md)：`meta.md` 写 `deliveryMode: ../../workspace/evil-mode`、`productType: ../../workspace/evil-type`，workspace 里自造「零要求」规则；`/delivery check` 返回 `success「文档 0 份」`，`/req check` 返回 `success「不走五层」`——检查器被模型自造规则背书。 |
| C6-1 audit 不存在 final | **confirmed P2** | [BUG-099](../_archive/fixed_bugs/BUG-099-deliverables-audit-nonexistent-final.md)（上一轮）。 |
| C6-3 slug/单段路径 | **pass（spec）** | `resolveDeliverablePath` 拒绝 `/`、`\`、`.`/`..`；本轮的穿越发生在 `productType`/`deliveryMode` 的规则 id，不在 slug。 |
| C6-4 canonical 字段 | **pass（spec）** | 旧中文 key 不解析、placeholder 未声明、未知类型列可用（合法 id 分支）。 |
| C6-5 空白路径 | **unverified** | `/deliverables audit` 仍单空格 join；未造连续空格路径。 |
| C6-6 boot 优先 workspace | **观察（未改）** | `/req` `/prd` 仍 boot 优先；与 BUG-081 只改策略面一致。 |

**证据脚本：** `runtime/tmp/c6-rule-path-traversal.mts`（delivery + req 两条穿越）。

**未跑：** 真实 RPC 回执（handler 层已证）、`/delivery` 的 documents.file 路径穿越（content 规则可信，未展开）、连续空格路径、`/prd` 目录形状、en 回执。

## Round 13（C5 真页面数据态 · 首次尝试）

**做了：** 用 dev home + 临时 workspace 起 company 实例，创建 CEO 会话，prompt 让模型只调 `team_task_create` 建 T1「写 PRD」/ T2「复核 PRD（依赖 T1）」；模型确实调了两次 `team_task_create`（args 见 `runtime/tmp/c5-page-results.json`）。随后 cdp-probe 打开「任务板 / 依赖图 / 在场」。

**结果：** 任务创建侧通过；**面板侧未证**——UI 当前选中的是 dev home 里旧会话 `real-ws`，我们通过 RPC 建的新会话 cwd 是未登记的临时 workspace（`runtime/tmp/c5-page-ws`），右侧栏没有它，任务板显示「还没有共享任务」。这是 **测试选址问题**（未登记 workspace + dev home 旧会话），不是产品结论；本轮不新增缺陷卡。

**未跑 / 下一轮：** 用隔离 home（只保留 profile/凭据，seed 一个 workspace registry）+ 单会话重跑，确保 UI 选中测试会话后再看 tasks/DAG/presence；或多窗口/会话切换。C5 真页面数据态仍为 **unverified**。

**证据：** `runtime/tmp/c5-real-page.mjs`、`runtime/tmp/c5-page-results.json`、cdp-probe 证据目录 `runtime/harness-home/diagnosis/cdp-probe-2026-11-12T16-30-09-167Z`。

## Round 14（C5 真页面 · 隔离 home）

**做法：** 复用隔离 home（只保留 `profiles/company` + 凭据 + seed 一个 workspace registry，无旧会话），RPC 建 CEO 会话，prompt 让模型只调 `team_task_create` 建 T1「写 PRD」/ T2「复核 PRD（依赖 T1）」；再 cdp-probe 打开任务板/依赖图/在场。

**结果：**

- 任务创建侧 PASS：两次 `team_task_create` 工具结果 = task-1 / task-2；会话日志有两条 `team/task` 事件。
- **UI 侧 FAIL**：任务板显示「成员：lead(待命) / 还没有共享任务」，`waitText 写 PRD` 失败；依赖图/看板同源为空。
- → [BUG-103](../_archive/fixed_bugs/BUG-103-tasks-tab-empty-despite-team-task-events.md)（P2，真页面读模型/投影不同步）。

**证据：**

- `runtime/tmp/c5-iso-page.mjs`、`runtime/tmp/c5-iso-results.json`、`runtime/tmp/c5-iso-body.txt`。
- 隔离 home 会话 `session-e0b3bd89-f7ea-4405-a202-bc84aef91d5e`；cdp-probe `runtime/harness-home/diagnosis/cdp-probe-2026-11-12T16-32-40-018Z`。
- 未改产品代码；隔离 home/workspace 在 `runtime/tmp/`（gitignored）。

**未跑：** 带 teammate 的任务板真页面（本卡先证「无 teammate 的 CEO root 写了任务但板空」）；多窗口/会话切换。

## Round 15（BUG-090..103 修复后的回归扫：C5/C3/C6/C4）

**背景：** 1b307755 收口了 14 张卡；用户要求继续找更多。本轮按修复面回归 + 相邻边界，一次开 10 张新卡（BUG-104..113），仍不改产品代码。

| 卡 | 面 | 判决 |
|---|---|---|
| [BUG-104](../_archive/fixed_bugs/BUG-104-team-task-merge-no-revision-null-view.md) | C5 merge | 旧 `team/task` 事件覆盖新投影（无 revision 比较）；`view=null` 时事件整段丢 |
| [BUG-105](../_archive/fixed_bugs/BUG-105-stream-error-not-rendered-in-board-dag-tasks.md) | C5 流 | follow 失败只有 PresenceTab 显示 `streamError`；board/dag/tasks 静默空/旧 |
| [BUG-106](../_archive/fixed_bugs/BUG-106-lease-pid-reuse-blocks-writer.md) | C3 lease | PID 复用 + `startedAt` 不参与 → 旧锁永久挡 writer |
| [BUG-107](../_archive/fixed_bugs/BUG-107-deliverables-audit-multi-space-path.md) | C6 parser | `/deliverables audit` 单空格 join，连续空格路径被改成另一路径 |
| [BUG-108](../_archive/fixed_bugs/BUG-108-catalog-symlink-final-outside.md) | C4 catalog | `final.md`/`meta.md` symlink→workspace 外仍算成品（stat 跟随） |
| [BUG-109](../_archive/fixed_bugs/BUG-109-catalog-warnings-dropped-in-audit-present.md) | C4 warnings | 坏形状 warnings 只在 boot 消费；audit/present 静默丢 |
| [BUG-110](../_archive/fixed_bugs/BUG-110-governance-export-rm-before-rename.md) | C4 export | 目录替换先 `rm` 再 rename，失败丢上一份导出 |
| [BUG-111](../_archive/fixed_bugs/BUG-111-saved-workspace-non-atomic-write.md) | C3 settings | `writeSavedWorkspace` 非原子写，崩溃成坏 JSON |
| [BUG-112](../_archive/fixed_bugs/BUG-112-team-task-unassign-keeps-old-owner.md) | C5 task merge | 取消认领（无 ownerId）保留旧 ownerName |
| [BUG-113](../_archive/fixed_bugs/BUG-113-command-doc-symlink-outside-workspace.md) | C6 docs | `/prd` `/req` `/delivery` 跟随 deliverables symlink 读 workspace 外文档 |

**证据脚本：** `runtime/tmp/newbugs-merge.mts`、`newbugs-2.mts`（unassign/catalog symlink/audit spaces）、`newbugs-lease.mts`、`newbugs-doc-symlink.mts`。均为 upstream 生产函数直调或 handler 直调；未改产品代码。

**未跑：** 真页面/真 WebSocket 断流（BUG-105 的视觉证据）；`exportGovernance` rename 失败的真实注入（BUG-110 为代码路径 + 推演）；`writeSavedWorkspace` 崩溃样本（BUG-111 为静态）；`/req` `/delivery` 的 symlink 复验（与 /prd 同 reader）。

## 证据、判据与处置

- **oracle 纪律**：先写期望，再看实现；不拿实现当 oracle；spec 绿只说明覆盖，不说明行为正确。
- **证据落点**：卡内 Round + `runtime/tmp/explore/`（gitignored）+ 需要的真页面/会话 id；文件面记路径/大小/哈希/mtime；命令面记原文。
- **处置**：材料性真缺陷 → `_backlog/bugs/` 卡（severity、复现、红→绿、影响面、与哪个 oracle 冲突）；非材料性 → 记录 + 请示；合同/文档漂移 → 观察 + owner；测试资产缺口 → 记缺口与建议门，不碰产品代码。
- **不写「没有 bug」**：只写已跑面未见 / 未跑面保留。

## 预算与停止

- 每轮 ≤ 90 分钟；keyless 优先；live ≤ 6 parent prompts / 轮，隔离 workspace/home，不碰真盘；证据 ≤ 8 MiB。
- 预算耗尽 → 停新面，保留证据并列未跑；发现越界写/密钥/真盘污染 → 立即停并报告；单个假设失败不阻塞其余。

## 验收标准

1. 每个宪章至少跑一轮，或逐项写「未跑 + 原因 + owner」；每轮有期望 vs 实测与证据坐标。
2. 每轮假设全部判决（confirmed / refuted / unverified + 原因）；confirmed 有 BUG 卡或观察落点；不写「没有 bug」。
3. 发现缺陷立即开 `_backlog/bugs/` 卡（编号从 BUG-090 起），本卡不改产品代码。
4. 每轮回填 `## Round N`，并同步 `_backlog/issues/README.md` 活跃索引；`pnpm verify` 保持 ALL PASS。
5. 用户叫停或所有宪章有明确结论时，按关闭条件收口；审查记录写 `审查：agent｜用户｜跳过 — 理由`。

## 关闭条件

- C1–C7 每面至少一轮，或逐项写未跑原因；每轮 H 全部判决；所有 finding 已分诊。
- 不写「没有 bug」；未覆盖面保留并标 owner；单场 live 不写成稳定。
- 证据可复读；`pnpm verify` + `pnpm test` 绿；审查记录齐后归档。

## 执行记录（Round 追加）

- 每轮：日期 ｜ 宪章 ｜ 命令/会话 id ｜ 期望 vs 实测 ｜ 证据坐标 ｜ 判定。
- BUG 卡链接放这里；未跑面逐条保留。
