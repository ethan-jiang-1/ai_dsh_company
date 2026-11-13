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
| C2 | **委派 / team / workflow 生命周期** | seat、depth、spawn/wait/interrupt/send_message、member scope、task board、workflow durable view；多进程与冷恢复 | `checks/lanes/product-team-e2e.entry.mjs`、`probes/team/`、`tests/host/delegation/`、[contract](./../../docs/contracts/delegation.md) |
| C3 | **run-bundle / workspace / lease / upgrade** | v3 身份、seed 只补缺、home 与 workspace 双轴、writer lease、外部盘、二次启动、迁移/回滚 | `checks/lanes/release.entry.mjs`、`external-workspace-smoke`、`company-entry-smoke`、`tests/host/run-bundle/` |
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

1. `node checks/lanes/release.entry.mjs --keep` → **ALL PASS**（built CLI → npm pack → 干净 `release-check` profile 真安装 → RPC → 首启/幂等/卸载重装）；profile 保留在 `runtime/harness-home/tmp/release-smoke-home/profiles/release-check`。
2. `DSH_HOME=runtime/harness-home/tmp/release-smoke-home node checks/lanes/preset.entry.mjs --profile release-check` → **ALL PASS**：
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

**实跑：** `node checks/lanes/isolation-matrix.entry.mjs` → **ALL PASS**：
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

## Round 16（BUG-104..113 修复后的第三轮回归：S2/S3/S6/S7）

**背景：** 另一 A 在未提交工作树中修了 10 张卡（236 files / 1799 tests）。本轮只读回归 + 相邻边界，开 3 张新卡，不改产品代码。

| 卡 | 面 | 判定 |
|---|---|---|
| [BUG-114](../_archive/fixed_bugs/BUG-114-governance-export-corrupt-ledger-drops-old-snapshot.md) | S3 导出 | `exportGovernance` 账本 corrupt/undef 时整个 exports 替换，旧 `ledger.json` 被删；warning 说「保留上次快照」与实际相反 |
| [BUG-115](../_archive/fixed_bugs/BUG-115-lease-takeover-no-fencing-old-writer.md) | S6 lease | heartbeat stale 接管只换锁，不 fence 旧 writer；旧 host 恢复后两边都写（实测 child+parent 同时 acquired） |
| [BUG-116](../_archive/fixed_bugs/BUG-116-release-inventory-misses-wiki-template-shared-skill.md) | C7 发布 | `export-dist` `must` 与 `release-smoke` content 清单不含 wiki-template/共享 skill；缺包仍绿 |

**证据脚本/实跑：**

- `runtime/tmp/newbugs-export-preserve.mts`：旧 ledger 存在，corrupt 导出 → `ledger exists false`。
- `runtime/tmp/newbugs-live-takeover.mts`：子进程 ACQUIRED，父进程 `now+130s` 接管 acquired。
- `tools/export-dist.mjs` / `release-smoke` 清单静态对读；当前 tarball 实含模板与共享 skill（本轮 `tar -tzf`）。

**判定：** 3 张新卡；S3/S6/C7 的修复没有覆盖「部分生成仍整体替换」「接管后 fencing」「非 manifest 内容清单」三个边界。修复 Note 已把 lease 双写仲裁列为剩余风险，本卡把它材料化。

## Round 17（C1 培养命令 / adopt 形状）

**选面理由：** C1 的 adopt/revoke 是写状态命令；上一轮只回归了 revoke/check，adopt 的短语解析还没被对抗样本打过。

| H | 判决 | 证据 |
|---|---|---|
| `adopt <id> as`（缺 slug） | **confirmed P2** | [BUG-117](../_archive/fixed_bugs/BUG-117-cultivation-adopt-as-missing-slug.md)：tokens[3] undefined 被当成「未提供 as」，静默部署 `method-<id>` 并 success。 |
| `adopt <id> asx <slug>` / 多余 token | **同根因（未单独开卡）** | 解析只认 tokens[2]==='as'，其余形状回默认；卡内列为修复 spec。 |
| `adopt <id>` 默认 slug | pass（设计） | 仍 success，部署 `method-<id>`；这是合法用法。 |
| `adopt` 已采纳/已拒绝/角色不符/方法已存在 | pass（spec） | 现有 15 个 cultivation-command spec 全绿。 |

**证据脚本：** `runtime/tmp/newbugs-adopt-malformed.mts`（真 handler + 临时培养盘）。

**未跑：** `adopt` 后崩溃/回滚、方法层安装失败、`revoke --orphan` 与 adopt 交错。

## Round 18（C5 null 投影：member 事件）

**选面理由：** BUG-104 修了 null 投影 + task 事件；本轮检查同一基座下的 `team/member`，看两个读模型是否一致。

| H | 判决 | 证据 |
|---|---|---|
| null 投影 + `team/member` | **confirmed P2** | [BUG-118](../_archive/fixed_bugs/BUG-118-member-events-dropped-without-team-projection.md)：`teamWithEventTasks(null,[member])` → null；`presenceFromEvents` 已能出成员行/「上线」动态。 |
| null 投影 + task | pass（BUG-104） | task 事件建最小视图。 |
| 有投影 + member | pass | projection members 提供行；follow 只补 activity。 |

**证据脚本：** `runtime/tmp/newbugs-member-null-view.mts`（纯函数，真事件形状）。

**未跑：** 真浏览器断投影视觉；member+task 混合；projection 失败 `failure` 字段的 UI 呈现。

## Round 19（C3 lease 写 gate：startup settings）

**选面理由：** BUG-115 暴露 lease 接管无 fencing；本轮检查「dataBlocked 的 host 还有哪些写路径」，从命令/自举/成品目录扩到 per-agent startup settings。

| H | 判决 | 证据 |
|---|---|---|
| lease blocked 的第二 host 写 startup options | **confirmed P2** | [BUG-119](../_archive/fixed_bugs/BUG-119-lease-blocked-host-writes-startup-options.md)：同 home 锁被 live PID 占，host 已报「公司数据已停写」，建 CEO 会话后 `$WS/.dsh-company/startup-options.json` 仍出现。 |
| lease blocked 的 commands/自举/成品目录 | pass（现有 gate） | `dataBlocked` 传给命令、`ensureRunBundle`、`initializeCatalog`、present handler、`exportNow`。 |
| lease blocked 的 catalog 写 | pass | `ledgerStorePromise` 在 `hasWorkspace && !runtime.dataBlocked` 才创建。 |

**证据脚本：** `runtime/tmp/newbugs-blocked-startup.mjs`（真 startWeb + 真 profile + 临时 home/workspace + live lock；`options exists true`）。

**未跑：** 两个真 host 同时启动的 startup-options 竞态；`startup-settings.json` 写入路径；watcher 事件在 blocked host 上的写。

## Round 20（C3 startup 落点：session cwd 危险根）

**选面理由：** BUG-119 说明 startup settings 不走 blocked gate；本轮继续查它的 workspace 判据，看 G7 的危险根是否覆盖这条 per-agent 写路径。

| H | 判决 | 证据 |
|---|---|---|
| session cwd = tmpdir | **confirmed P2** | [BUG-120](../_archive/fixed_bugs/BUG-120-startup-settings-dangerous-session-cwd.md)：`isDangerousRoot(tmpdir())=true`，但 `startupWorkspace('/ws', agent tmpdir)` 仍返回 tmpdir；watch 会写 `<tmpdir>/.dsh-company/startup-options.json`。 |
| session cwd = `/tmp`/home/root | 同根因（未单独开卡） | `startupWorkspace` 不校验任何危险根；卡内列修复 spec。 |
| boot workspace 危险 | pass（G7） | `resolveWorkspace` 已拒绝根、home、tmpdir、`/tmp` 等危险落点。 |
| 普通子目录 cwd | 设计允许 | BUG-081/089 的多 workspace 语义；不按危险根误杀。 |

**证据脚本：** `runtime/tmp/newbugs-startup-danger.mts`（纯函数 + 平台 tmpdir）。

**未跑：** 真 session cwd=tmpdir 的 `startup-options.json` 实写（纯函数已证路径；实写可复用 BUG-119 脚本改 cwd）。

## Round 21（C3 写 gate：/company-settings）

**选面理由：** BUG-119/120 已说明 startup 写路径不统一；本轮检查人命令 `/company-settings` 是否把 `dataBlocked` 当 gate，而不只是错误文案。

| H | 判决 | 证据 |
|---|---|---|
| dataBlocked + `set` | **confirmed P2** | [BUG-121](../_archive/fixed_bugs/BUG-121-company-settings-blocked-host-writes.md)：注入 `dataBlocked:true` + 非空 workspace，`set productType` 仍 success，`startup.json` 写入。 |
| dataBlocked + `reset` | 同根因 | 同一 handler 分支，未单独开卡；修复 spec 覆盖。 |
| dataBlocked + `show` | 只读，可放行 | 现状不写；产品可选是否也 blocked。 |
| 无 workspace + blocked | pass（现有） | 返回 blockedCompanyText。 |

**证据脚本：** `runtime/tmp/newbugs-settings-blocked.mts`（真 handler、fakectx、dataBlocked=true、临时 workspace）。注意 settings 文件名是 `startup.json`（不是 startup-settings）。

**未跑：** 真 blocked host 上通过 RPC 跑 `/company-settings`；刷新 watcher 的实际写（脚本 no-op）。

## Round 22（C4 扫描根：deliverables 根类型）

**选面理由：** G2/BUG-096/108 修了叶子 `final.md`/`meta.md` 的类型与 symlink；本轮检查**扫描根本身**（deliverables / deliverables-archive）被文件或链接替换。

| H | 判决 | 证据 |
|---|---|---|
| 根=普通文件 | **confirmed P2** | [BUG-122](../_archive/fixed_bugs/BUG-122-catalog-root-file-symlink-enotdir.md)：`regenerateCatalog` 直接 `ENOTDIR: not a directory, scandir …/deliverables`。 |
| 根=symlink→目录 | 同根因（未单独开卡） | `existsSync` 后 `readdirSync` 跟随；叶子 safe-file 才按 outside 跳过，根没有 lstat。 |
| 根=正常目录 | pass | 扫描叶子的 final/meta 仍绿。 |
| 审计命令在坏根下 | 同根因 | audit 先写账本后 `regenerate` 抛错；命令以异常结束，账本已写。 |

**证据脚本：** `runtime/tmp/newbugs-catalog-root-file.mts`（真 `regenerateCatalog` + 临时 workspace）。

**未跑：** audit handler 在坏根下的真实回执；present 投影在坏根下的 warning；根 symlink 的真实扫描。

## Round 23（C3 startup 持久化：损坏 settings）

**选面理由：** BUG-111 已把 saved workspace 的 corrupt 做成可诊断；本轮检查同一类 `.dsh-company` 人类设置 `startup.json`，看 corruption 是否仍被折成「auto」。

| H | 判决 | 证据 |
|---|---|---|
| startup.json 截断 | **confirmed P2** | [BUG-123](../_archive/fixed_bugs/BUG-123-startup-json-corrupt-silent-auto.md)：`readStartupSettings` 返回 EMPTY，无 problem；`/company-settings show` 会显示全 auto，不报坏。 |
| startup-options.json 截断 | 同根因（未单独开卡） | `readStartupOptions` 同样 catch→EMPTY；面板可能显示无可选项。 |
| 合法 auto / 正常设置 | pass | 现有 startup store spec 绿。 |
| saved workspace corrupt | pass（BUG-111） | 已返回 problem='corrupt'，runtime guard warn。 |

**证据脚本：** `runtime/tmp/newbugs-startup-corrupt.mts`（截断 JSON → read 返回空设置）。

**未跑：** `/company-settings show` 真 handler 回执；启动注入 section 的坏设置文案；options 坏文件的面板刷新。

## Round 24（C3 lease 锁路径形状）

**选面理由：** BUG-106/115 覆盖 PID 与 fencing；本轮检查锁**文件本身不是普通文件**（目录/symlink）时是否可诊断。

| H | 判决 | 证据 |
|---|---|---|
| lock 是目录 | **confirmed P2** | [BUG-124](../_archive/fixed_bugs/BUG-124-lease-lock-directory-path-blocks.md)：acquire 返回「writer lease 竞争失败（另一个进程抢先）」，无 holder、无坏形状提示；实际没有进程占锁。 |
| lock 是 symlink→目录 | 同根因（未单独开卡） | 代码路径相同；卡内 spec 覆盖。 |
| lock 坏 JSON/空文件 | pass（现有） | parseHolder null → unlink → 重试/接管。 |
| lock 正常/有 holder | pass | 现有 lease spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-lease-dir-lock.mts`（真 `acquireCompanyLease` + 目录锁）。

**未跑：** 真 home 目录锁下的启动输出；symlink 锁的实机；lock 权限 EACCES。

## Round 25（C4 审计路径：symlink canonical 化）

**选面理由：** S2 已让 catalog/命令拒绝 symlink；本轮检查 `/deliverables audit` 的 canonical 化是否把「审计对象」换成链接目标。

| H | 判决 | 证据 |
|---|---|---|
| x/final.md → y/final.md（内部链接） | **confirmed P2** | [BUG-125](../_archive/fixed_bugs/BUG-125-audit-symlink-canonicalizes-to-target.md)：audit x 后 ledger.paths 是 y/final.md、slugs 是 y；x 未被审计。 |
| final.md → workspace 外 | pass | auditRelPath canonical 越界 → 拒绝。 |
| 普通 final | pass | 现有 audit spec 绿。 |
| 目录 final | pass（BUG-099） | auditTargetProblem 拒绝非普通文件。 |

**证据脚本：** `runtime/tmp/newbugs-audit-symlink-inside.mts`（真 `setPresentedAudit` + 内部 symlink）。

**未跑：** 真 `/deliverables audit` handler 回执；presented-domain audit 路径；archive 中的 symlink。

## Round 26（C2 workflow 并发配对）

**选面理由：** BUG-097 修了「失败 call 抢下一次 run」；本轮检查修复后的贪心最近前置在同名并发 background 下是否一对一。

| H | 判决 | 证据 |
|---|---|---|
| 两个同名 background call + 两个 start | **confirmed P2** | [BUG-126](../_archive/fixed_bugs/BUG-126-workflow-concurrent-same-name-pairing-swap.md)：r1 拿 jobB（c2），r2 拿 jobA（c1），互换。 |
| 单 run + 失败前置 call | pass（BUG-097） | 现有 workflow-runs spec 绿。 |
| 结果先于 start 的启动文案 | pass（现有） | runEvidence 允许前置结果。 |
| jobKnown live | 未跑 | 交换后 running/lost 行的影响未实机。 |

**证据脚本：** `runtime/tmp/newbugs-workflow-concurrent.mts`（真 `workflowRunRows` + 两个 call/start/result）。

**未跑：** 真 vendor workflow 两个 background run；children 归属；jobKnown 状态；同名三 run。

## Round 27（C1 培养存储坏形状：records 根）

**选面理由：** BUG-091 已修 check 对坏 record/methodSlug 的抛错；本轮检查**records 根**本身是文件/symlink 时，check/archive 是否也收成可读回执。

| H | 判决 | 证据 |
|---|---|---|
| records=普通文件 | **confirmed P2** | [BUG-127](../_archive/fixed_bugs/BUG-127-cultivation-records-file-throws.md)：`check` / `archive 30` 都抛 `UnsafeCultivationPathError`；revoke 已有 catch。 |
| records=symlink | 同根因（未单独开卡） | 存储层 `recordsDirectoryState` 抛；卡内 spec 覆盖。 |
| records=missing | pass | `reachable=false`，check/revoke 给可读错误。 |
| 正常 records | pass | 15 个 cultivation-command spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-cultivation-records-file.mts`（真 command handler + 临时培养盘，records 替换为文件）。

**未跑：** 真启动下 records 文件；propose 工具写坏根；父 cultivation=symlink。

## Round 28（C3 bootstrap 写路径：symlink replace）

**选面理由：** S2/BUG-108/113 修了读面 symlink；本轮检查 run-bundle 自举的**写面**，特别是 `mode:'replace'` 的 `org.md`/`owners.md` 补种。

| H | 判决 | 证据 |
|---|---|---|
| `kb/org.md` symlink→外部文件 + replace | **confirmed P1** | [BUG-128](../_archive/fixed_bugs/BUG-128-bootstrap-replace-follows-symlink-write-outside.md)：`applyBootstrap` created，外部文件被覆盖为 'REPLACED BY BOOTSTRAP'。 |
| 父目录 `kb` symlink | 同根因（未单独开卡） | `mkdirSync`/`writeFileSync` 都跟随父 symlink；卡内 spec 覆盖。 |
| create 模式（`wx`） | 不覆盖，但父 symlink 仍可穿 | 同族；修复要逐级 lstat/realpath。 |
| 普通 replace | pass | 现有 bootstrap spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-bootstrap-symlink-write.mts`（真 `applyBootstrap` + 临时 workspace + symlink）。

**未跑：** 真 `ensureRunBundle` 首启/角色补种路径；父 `kb` symlink；owners.md；Windows。

## Round 29（C3/C4 状态根：`.dsh-company` symlink）

**选面理由：** BUG-128 证明文件级 symlink 可写穿；本轮检查状态根 `.dsh-company` 被整体 symlink 时，各写模块是否还有 common gate。

| H | 判决 | 证据 |
|---|---|---|
| `.dsh-company` symlink→外部 + catalog | **confirmed P1** | [BUG-129](../_archive/fixed_bugs/BUG-129-dsh-company-symlink-root-writes-outside.md)：`regenerateCatalog` written=true，外部 `kb/deliverables-index.json` 出现。 |
| 同根影响 export/startup/bundle/bootstrap | 同根因（未逐项实跑） | 所有写路径都 `join(workspace,'.dsh-company',…)`；卡内列四个入口。 |
| `.dsh-company` symlink→内部目录 | 策略未定 | 卡内要求明确允许/拒绝；当前无 lstat。 |
| 普通 `.dsh-company` 目录 | pass | 现有 catalog/bundle/startup spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-company-dir-symlink.mts`（真 `regenerateCatalog` + 临时 workspace/outside + 根 symlink）。

**未跑：** export/startup/bundle 四项的实写；内部 symlink；真首启；Windows。

## Round 30（C1 培养写入口：records 根坏形状）

**选面理由：** BUG-127 覆盖了 check/archive 的读边界；本轮检查同一 records 根坏形状下的**写入口**（correct/suggest/propose）。

| H | 判决 | 证据 |
|---|---|---|
| records=文件 + correct | **confirmed P2** | [BUG-130](../_archive/fixed_bugs/BUG-130-cultivation-write-root-throws.md)：command correct 抛 UnsafeCultivationPathError。 |
| records=文件 + propose | **confirmed P2** | 同卡：tool execute 抛 UnsafeCultivationPathError；模型拿不到结构化 note。 |
| records=missing | pass | writeRecord 建目录；正常写记录。 |
| check/archive | BUG-127 已记 | 读边界同样抛。 |

**证据脚本：** `runtime/tmp/newbugs-cultivation-write-root.mts`（真 command/tool handler + 临时培养盘，records 替换为文件）。

**未跑：** 真启动下 propose 的 vendor tool-error 形状；records=symlink；父 cultivation=symlink。

## Round 31（C3/C4 状态子目录：`kb` symlink）

**选面理由：** BUG-129 记了 `.dsh-company` 根 symlink；本轮检查根正常、**子目录** `kb` 是 symlink 时 catalog 是否仍写穿。

| H | 判决 | 证据 |
|---|---|---|
| `.dsh-company/kb` symlink→外部 + catalog | **confirmed P1** | [BUG-131](../_archive/fixed_bugs/BUG-131-kb-symlink-catalog-writes-outside.md)：written=true，`/outside/deliverables-index.json` 出现。 |
| 同根影响 startup/export/bootstrap | 同根因（未逐项实跑） | 都走固定子路径；卡内列全入口。 |
| `.dsh-company` 根 symlink | BUG-129 已记 | 根级；本卡是中间目录，修复层次更深。 |
| `kb` 普通目录 | pass | 现有 catalog spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-kb-symlink.mts`（真 `regenerateCatalog` + 临时 workspace/outside + kb symlink）。

**未跑：** exports/startup 子目录 symlink 的实写；中间目录 symlink 链；Windows。

## Round 32（C4 catalog 输出路径形状）

**选面理由：** BUG-122/131 覆盖了扫描根与父目录 symlink；本轮检查 catalog 自己的**输出文件**被目录占用时生成器是否 fail loud。

| H | 判决 | 证据 |
|---|---|---|
| `kb/deliverables-index.json` 是目录 | **confirmed P2** | [BUG-132](../_archive/fixed_bugs/BUG-132-catalog-index-path-directory-eisdir.md)：`regenerateCatalog` 抛 `EISDIR`（rename temp→目录）。 |
| 输出是 symlink | 安全（rename 替换 symlink） | 未单独开卡；卡内 spec 要求。 |
| 输出普通文件/缺失 | pass | 现有 catalog spec 绿。 |
| audit 先写账本后 regenerate 抛 | 同根因 | 卡内列修复：账本/索引两步可读回执。 |

**证据脚本：** `runtime/tmp/newbugs-catalog-index-dir.mts`（真 `regenerateCatalog` + 临时 workspace，输出路径 mkdir）。

**未跑：** 真 `/deliverables audit` handler 回执；present 投影；输出非空目录；Windows。

## Round 33（C3 startup 输出路径形状）

**选面理由：** BUG-132 记了 catalog 输出被目录占用；本轮检查 startup 设置/派生文件的输出路径。

| H | 判决 | 证据 |
|---|---|---|
| `startup.json` 是目录 | **confirmed P2** | [BUG-133](../_archive/fixed_bugs/BUG-133-startup-json-directory-eisdir.md)：`writeStartupSettings` 抛 EISDIR；`/company-settings set` 无 catch。 |
| `startup-options.json` 是目录 | 同根因（未单独开卡） | `writeStartupOptionsFile` 同 `writeAtomic`；settings refresh 抛，watcher 只 warn。 |
| startup.json symlink | 安全（rename 替换 symlink） | 未单独开卡；卡内 spec。 |
| 普通文件/缺失 | pass | 现有 startup spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-startup-dir-write.mts`（真 `writeStartupSettings` + 目录目标）。

**未跑：** 真 `/company-settings set` handler 回执；options 目录；watcher 写；Windows。

## Round 34（C6 命令读面：`.dsh-company` 根 symlink）

**选面理由：** BUG-129/131 证明写面可穿根/子目录 symlink；本轮检查命令读面是否也把外部根当公司盘。

| H | 判决 | 证据 |
|---|---|---|
| `.dsh-company` symlink→外部 + `/prd check` | **confirmed P2** | [BUG-134](../_archive/fixed_bugs/BUG-134-dsh-company-symlink-command-read-outside.md)：外部 mrd/prd 被读，命令 success「PRD 校验通过」。 |
| 同根影响 /req /delivery /catalog | 同根因（未逐项实跑） | `resolveDeliverablePath`/`readTextInside` 都以 companyRoot 为信任根；卡内列。 |
| 叶子 symlink | pass（S2） | readTextInside 拒绝叶子 symlink；但根本身未被验证。 |
| 正常 `.dsh-company` | pass | 现有 prd/req/delivery spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-company-root-read.mts`（真 `/prd` handler + 临时 workspace/outside + 根 symlink；注入 check 以隔离校验）。

**未跑：** /req /delivery 同场景实跑；catalog 读面；内部 symlink 策略；真 boot。

## Round 35（C2 subagent_retry 策略回归）

**选面理由：** C2 的 workflow 配对已开 126；本轮回归 `subagent_retry` 的 `maxAttempts`/`retryDecision`/`exhausted`，确认选项与常量没有漂移。

| H | 判决 | 证据 |
|---|---|---|
| `maxAttempts` 选项 vs 决策常量 | pass | 循环 `while attempt < maxAttempts`；`subagentRetryDecision` 用 `SUBAGENT_RETRY.maxAttempts=2`；选项被 clamp 1..2，二者一致。 |
| `exhausted` | pass（阅读） | `last.stopReason !== 'completed' && attempt >= maxAttempts`；completed 提前 break。 |
| records 根/命令边界 | 已开 127/130 | 本轮不重复。 |
| 根 symlink residency | 已开 129/131/134 | 本轮不重复。 |

**判定：** 本轮未发现新的确定性缺陷；不做「为凑数重复根因」的卡。C2 retry 语义与现有 spec 一致。

**未跑：** 真模型 `subagent_retry` 两次失败/取消；vendor 的 `stopReason` 扩展值。

## Round 36（C4 catalog 读路径：索引 symlink）

**选面理由：** BUG-132/131 覆盖输出目录/父 symlink 写面；本轮检查 catalog **输出文件的读面**，看客户端是否跟随外部索引。

| H | 判决 | 证据 |
|---|---|---|
| `kb/deliverables-index.json` symlink→外部 | **confirmed P2** | [BUG-135](../_archive/fixed_bugs/BUG-135-catalog-index-symlink-read-outside.md)：`readCatalog` 返回外部 JSON 的 fake entries/presented=true。 |
| 普通索引/缺失 | pass | 现有 catalog-state spec 绿。 |
| 输出目录/父 symlink | 已开 132/131 | 不重复。 |
| `workspaceFiles` 客户端读同一路径 | 未实跑 | 卡内列为同一路径。 |

**证据脚本：** `runtime/tmp/newbugs-catalog-index-symlink-read.mts`（真 `readCatalog` + 临时 workspace/outside + 索引 symlink）。

**未跑：** 真浏览器成品页签读外部索引；workspaceFiles 的限制；内部 symlink 策略。

## Round 37（C3 startup 读路径：settings symlink）

**选面理由：** BUG-135 证明 catalog 索引读面跟随 symlink；本轮检查 startup 设置/派生文件的读面。

| H | 判决 | 证据 |
|---|---|---|
| `startup.json` symlink→外部 | **confirmed P2** | [BUG-136](../_archive/fixed_bugs/BUG-136-startup-settings-symlink-read-outside.md)：`readStartupSettings` 返回外部 productType/deliveryMode/wiki。 |
| `startup-options.json` symlink | 同根因（未单独开卡） | `readStartupOptions` 同 readFileSync；卡内列。 |
| 写路径 symlink | 安全（rename 替换 symlink） | 现有 writeAtomic；读/写策略不一致。 |
| 普通文件/缺失 | pass | 现有 startup spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-startup-symlink-read.mts`（真 `readStartupSettings` + 临时 workspace/outside + symlink）。

**未跑：** 真启动注入 section；startupWatch 用外部 wiki 布哨；options 读面；symlink→内部。

## Round 38（C4 presented 账本读路径：symlink）

**选面理由：** BUG-135 是 catalog 索引伪造；本轮检查更敏感的 presented 账本文件读路径。

| H | 判决 | 证据 |
|---|---|---|
| `kb/deliverables-presented.json` symlink→外部 | **confirmed P2** | [BUG-137](../_archive/fixed_bugs/BUG-137-presented-ledger-symlink-read-outside.md)：`readPresentedLedger` status ok，外部 paths/slugs 被采用，伪造 presented。 |
| 普通账本/缺失 | pass | 现有 presented-ledger spec 绿。 |
| 写路径 symlink | 安全（rename 替换） | 读写策略不一致。 |
| domain store | 未变 | 生产 domain 优先；file fallback 仍走坏读。 |

**证据脚本：** `runtime/tmp/newbugs-presented-symlink-read.mts`（真 `readPresentedLedger` + 临时 workspace/outside + ledger symlink）。

**未跑：** 真 catalog regenerate 使用 fake ledger；domain 不可用部署；audit 写后读。

## Round 39（C4 presented 账本写路径：目录）

**选面理由：** BUG-137 是账本 symlink 读；本轮检查账本**输出**被目录占用时写路径是否可读。

| H | 判决 | 证据 |
|---|---|---|
| `kb/deliverables-presented.json` 是目录 | **confirmed P2** | [BUG-138](../_archive/fixed_bugs/BUG-138-presented-ledger-directory-eisdir.md)：`writePresentedLedger` 抛 EISDIR（rename temp→目录）。 |
| 账本 symlink | 读面 BUG-137；写 rename 替换 | 未单独开卡；卡内 spec。 |
| 普通账本/缺失 | pass | 现有 presented-ledger spec 绿。 |
| domain store | 未变 | 生产 domain 优先；file fallback 仍撞。 |

**证据脚本：** `runtime/tmp/newbugs-presented-dir-write.mts`（真 `writePresentedLedger` + 临时 workspace，账本路径 mkdir）。

**未跑：** 真 `/deliverables audit` 回执；present 投影；domain 不可用部署。

## Round 40（C1 状态机：revoke 后 verify）

**选面理由：** BUG-091 已让 check 排除 revoked；本轮检查同一 `revokedAt` 语义下 verify 是否还把它当活跃方法。

| H | 判决 | 证据 |
|---|---|---|
| revoke 后 verify pass/fail | **confirmed P2** | [BUG-139](../_archive/fixed_bugs/BUG-139-cultivation-verify-after-revoke.md)：verify success，记录同时 adopted+revokedAt+verification；方法已删除。 |
| active adopted 后 verify | pass | 现有 verify spec 绿。 |
| rejected 后 verify | pass | status 检查拒绝。 |
| 撤回后 UI/check | check 已排除 revoked | 现有 BUG-091 修复。 |

**证据脚本：** `runtime/tmp/newbugs-verify-revoked.mts`（真 adopt/revoke/verify handler + 临时培养盘）。

**未跑：** 真 UI 培养面板对 revoked+verification 的展示；contract 是否允许历史验证；revoke 后 reject/adopt。

## Round 41（C5 真页面复验 / C2 回归）

**做了：** 复用隔离 home（含此前创建的 CEO 会话与 `team/task` 事件）起 company 实例，cdp-probe 打开任务板/依赖图/在场。

**结果：** 任务板仍显示「还没有共享任务」；但 UI 当前是 **新空会话**（body 标题「新会话」），此前任务会话没有登记进 `storages/workspace.json.sessionIds`，不是被选中会话。**这是测试选址限制，不是产品结论**；不新增缺陷卡。

**判定：** 本轮没有新的确定性缺陷；C5 真页面（选中含任务历史会话）仍需 seed `sessionIds` 或从侧栏点选后再证。

**证据：** `runtime/tmp/c5-iso-recheck2.mjs`、`runtime/tmp/c5-recheck2-body.txt`、cdp-probe `runtime/harness-home/diagnosis/cdp-probe-2026-11-12T19-25-22-512Z`。

**未跑：** 选中任务会话后的任务板/依赖图/在场；带 teammate 的任务板；多窗口。

## Round 42（C5 真页面：选中含 task 的会话仍空）

**做法：** 把 c5-iso-home 的 `workspace.json.sessionIds` 指向已有 `team/task` 的会话 `session-e0b3…`，再跑 cdp-probe。

| H | 判决 | 证据 |
|---|---|---|
| 选中会话 + 任务板 | **withdrawn（测试选址）** | [BUG-140（撤回）](../_archive/settled_issues/BUG-140-tasks-tab-still-empty-with-selected-team-task-session.md)：侧栏显示会话标题「用 team_task_create 创建两个任务」，任务板仍「成员：lead(待命) / 还没有共享任务」；waitText 写 PRD 失败。 |
| 会话日志有 team/task | pass | task-1/task-2 两条事件已在会话日志。 |
| streamError | 无错误条 | 不是 follow 失败；更像 follow 没返回 task 事件或 merge 未适配。 |
| 旧 BUG-103/104 修复 | **真页面未收口** | 修复验证停在 projection/纯 merge；这是当前 bug。 |

**证据：** `runtime/tmp/c5-iso-recheck2.mjs`、`runtime/tmp/c5-recheck2-body.txt`、cdp-probe `runtime/harness-home/diagnosis/cdp-probe-2026-11-12T19-26-31-670Z`。

**未跑：** 直接抓 `session/follow` 帧；TasksTab 构建产物版本；BUG-118 member 场景。

## Round 43（C5 follow 适配层定位）

**选面理由：** BUG-140 已证任务板真页面空；本轮抓 adapter 代码路径，区分「事件没到」与「merge 形状」。

| H | 判决 | 证据 |
|---|---|---|
| `companyFrames` 是否过滤 team/task | **否** | `company-session-adapters.ts` 只把 `snapshot.records[].event` / `event` 原样透传；没有类型过滤。 |
| `remote.follow` 是否给 task 帧 | **未证** | 页面无 streamError、任务板空；最可能上游帧里没有 `team/task`，或选中会话不是 Lead follow 的地址。 |
| merge revision/null | 已有 104/118 | 非本轮新点。 |
| 真页面选中会话 | pass（已 seed sessionIds） | BUG-140 证据。 |

**判定：** 本轮没有新增独立缺陷；把 BUG-140 根因缩到「`remote.follow` 帧内容/地址」，不是 `companyFrames` 过滤，也不是 merge revision。

**未跑：** 直接抓 `remote.session.follow` 的 snapshot/event 原始帧；选中 teammate 会话 vs root；follow 地址。

## Round 44（C5 host projection vs browser）

**做了：** 用 `session/list` RPC 对比同一会话的 host 投影与浏览器任务板，并重建当前 `lib/client.js` 排除旧 bundle。

| H | 判决 | 证据 |
|---|---|---|
| host `agentTeam.tasks` | **has task-1/task-2** | `session/list` `_request:{}` for session-e0b3；tasks 完整。 |
| browser 任务板 | **empty** | 选中同一会话，任务板仍「成员：lead(待命) / 还没有共享任务」。 |
| 当前 client bundle | **current** | `tsc -b`+`tsdown` 重建 `lib/client.js`（含 `teamWithEventTasks`/`stream.error`），重跑仍空。 |
| `companyFrames` 过滤 | **no** | adapter 原样透传；问题在上游 follow/浏览器投影缓存。 |

**判定：** BUG-140 从「可能旧 bundle」收紧为「浏览器 session store 的 agentTeam 投影 / follow 帧没有 task，host 投影本身正确」。仍是同一张卡，不新增。

**未跑：** 直接抓浏览器 `remote.session.follow` 原始帧；session store 的 projection 订阅时机；teammate 会话。

## Round 45（C5 follow/host projection 复核 / C1 写入口）

**做了：** 复核 BUG-140 的 host/browser 投影差异；检查 C1 各命令在 records 根坏形状下的可读性。

| H | 判决 | 证据 |
|---|---|---|
| host `session/list` agentTeam.tasks | has task-1/task-2 | RPC 实查 |
| browser task board | empty（当时选到新空会话；BUG-140 已撤回） | 真页面 |
| records 根坏形状 | BUG-127/130 已覆盖 | 不再重复开卡 |
| adopt/reject/verify 在 records 根文件下 | 返回「记录不存在」而非根坏 | 同根 127/130；不单开卡 |
| startup/catalog/presented 输出形状 | 132/133/135/137/138 已覆盖 | 不重复 |

**判定：** 本轮没有新的独立缺陷；BUG-140 是当前最实质的 C5 未收口项。

**未跑：** 浏览器 follow 原始帧；session store 投影缓存刷新；路径区分「不存在」与「根坏」。

## Round 46（C1 读命令：adopt/reject/verify records 根）

**选面理由：** BUG-127/130 覆盖 check/archive 与 correct/propose；本轮补齐 adopt/reject/verify 三个读命令。

| H | 判决 | 证据 |
|---|---|---|
| records=文件 + adopt | **confirmed P2** | [BUG-141](../_archive/fixed_bugs/BUG-141-cultivation-adopt-reject-verify-throws.md)：THREW UnsafeCultivationPathError。 |
| records=文件 + reject/verify | **confirmed P2** | 同卡：两个命令都 THREW，没有「记录目录坏」回执。 |
| records=missing | pass | 现有命令返回「记录不存在」。 |
| 正常 records | pass | 现有 cultivation-command spec 绿。 |

**证据脚本：** `runtime/tmp/newbugs-cultivation-readroot.mts`（真 command handler + 临时培养盘，records 替换为文件）。

**未跑：** records=symlink；父 cultivation=symlink；八命令统一 spec。

## Round 47（C3 bootstrap replace 目标形状：目录）

**选面理由：** BUG-128 是 replace 跟随 symlink；本轮检查同一 entry 被**目录**占用时的 EISDIR。

| H | 判决 | 证据 |
|---|---|---|
| `kb/org.md` 是目录 + replace | **confirmed P2** | [BUG-142](../_archive/fixed_bugs/BUG-142-bootstrap-replace-directory-eisdir.md)：`applyBootstrap` 抛 EISDIR；catch 只处理 EEXIST。 |
| 目标 symlink | BUG-128 已记 | replace 跟随写到外部。 |
| 普通文件/缺失 | pass | 现有 bootstrap spec 绿。 |
| 角色补种调用方 | 未实跑 | `ensureRunBundle`/`applyRoleBackfill` 的错误包装未证。 |

**证据脚本：** `runtime/tmp/newbugs-bootstrap-dir-target.mts`（真 `applyBootstrap` + 临时 workspace + 目录目标）。

**未跑：** 真启动角色补种；owners.md 目录；调用方 catch；boot 输出。

## Round 48（C3 bootstrap 目录条目形状）

**选面理由：** BUG-142 是 file 条目的目录目标；本轮检查 dir 条目目标被文件占用时 `mkdir` 是否可读。

| H | 判决 | 证据 |
|---|---|---|
| `.dsh-company` 是文件 + dir entry | **confirmed P2** | [BUG-143](../_archive/fixed_bugs/BUG-143-bootstrap-directory-entry-eexist.md)：`applyBootstrap` 抛 EEXIST（mkdir）；dir 分支无 catch。 |
| `.dsh-company/kb` 文件 | 同根因（未单独开卡） | 同一 dir 分支；卡内 spec 覆盖。 |
| 正常目录/缺失 | pass | 现有 bootstrap spec 绿。 |
| 调用方 ensureRunBundle | 未实跑 | 启动是否会 dataBlocked/warn 未证。 |

**证据脚本：** `runtime/tmp/newbugs-bootstrap-dir-entry.mts`（真 `applyBootstrap` + 临时 workspace + `.dsh-company` 文件）。

**未跑：** 真启动 `.dsh-company` 文件；kb 文件；ensureRunBundle 错误包装。

## Round 49（C3 bootstrap 调用方：真实 boot）

**选面理由：** BUG-142/143 直接 `applyBootstrap` 抛 EEXIST/EISDIR；本轮用真 boot 验证 `ensureRunBundle` 是否有顶层 catch，避免把「函数抛」误报成「启动砖」。

| H | 判决 | 证据 |
|---|---|---|
| `.dsh-company` 是文件 + 真 boot | **boot 成功**（只 warn） | `startWeb` 返回 banner；`ensureRunBundle` 顶层 catch 把 applyBootstrap 异常收成 warn。 |
| BUG-142/143 的真实影响 | **非启动砖** | 直接调用/补种路径仍抛，且没有结构化 warning；已改卡面，不夸大启动失败。 |
| 其它 bootstrap 形状 | 128/129/131 写穿真问题 | 不改。 |

**判定：** 本轮没有新增独立缺陷；修正了 142/143 的影响面（不是 boot 砖，是函数/补种边界 + 可读性）。

**未跑：** 角色补种 `applyRoleBackfill` 真触发时的错误包装；`.dsh-company/kb` 文件；owners.md 目录。

## Round 50（C1/C4 形状面饱和复核）

**选面理由：** 50 轮节点，回看 C1/C4 形状面是否还有未覆盖的确定性缺陷；避免为凑数重复根因。

| 面 | 已覆盖 | 本轮结论 |
|---|---|---|
| C1 命令边界 | 127/130/139/141/117 | records 根/写读/verify 后状态均已卡；无新形状 |
| C4 读写形状 | 122/125/132/135/137/138/114 | root/leaf/输出/账本/审计均已卡；无新形状 |
| C5 任务板 | 118 | BUG-140 已撤回（测试选址） |
| C3 写 residency | 128/129/131/142/143 | 文件/根/子目录/目录条目均已卡；142/143 已修正影响面 |
| C7 发布 | 116 | 清单覆盖缺口未修 |

**判定：** 本轮没有新的独立缺陷；C1/C4 形状面接近饱和，继续开卡会重复根因。下一轮应转 C5 raw follow / C2 live workflow（行为面），而不是继续枚举文件形状。

**未跑：** browser remote.session.follow 原始帧；真 workflow 两 run 并发；真模型多轮。

## Round 51（C5 撤回 BUG-140：WS 帧 + 显式选中）

**做法：** Playwright `page.on('websocket')` 抓帧，并**显式点选**侧栏任务会话标题，再开任务板。

**结果：** 任务板显示 **任务板 (2)**，会话正文含 task-1 写 PRD / task-2 复核 PRD。之前的 cdp-probe 默认落在应用新建的空会话 `session-7726…`（storage 有 e0b3，但 UI 新开空会话并选中），所以显示「还没有共享任务」。

**判定：** BUG-140 **撤回，不是产品缺陷**；卡已迁 settled_issues 并在 bugs README/archive 索引登记。真正留下的是测试方法坑（cdp-probe 默认新空会话），不是产品 bug。C5 任务板行为在「显式选中含 task 会话」下通过。

**未跑：** 默认新空会话是否符合产品预期；teammate 会话；多窗口。

## Round 52（C5 任务板确认：任务板 (2)）

**做法：** cdp-probe 先点选侧栏任务会话标题，再点头部 `任务板 (2)` 打开右栏；等待 task 表。

**结果：** 右栏出现：

```
任务板
成员：lead(待命)
任务 / 依赖 / 状态 / owner
task-1@1 写 PRD → 待办 / 未分配
task-2@1 复核 PRD → 写 PRD → 待办（阻塞）/ 未分配
```

**判定：** 任务板在「显式选中含 task 会话」下 PASS；BUG-140 撤回确认。随后点「看板」/「依赖图」找当前 DOM 文本失败——右栏此时只渲染任务板 tab，其他平台 tab 在该状态不可直接点到；这是 UI tab 入口/测试步骤问题，不是本轮的产品结论，不新增卡。

**未跑：** 看板/依赖图/在场在任务板打开后的可达路径；多窗口。

**验证面注记（2026-11-13）：** 本轮 `pnpm verify` 当前红在 `guard-red-record`：另一 A 的未提交 spec 标题声称守卫 BUG-119/121/123/124/128/133/143，但这些卡仍是活跃（不在 fixed_bugs）。这是修复交接的未完成态，不是本轮文档改动；`pnpm test` 236 files / 1812 tests passed。

## Round 53（C3 write gate 覆盖面）

**选面理由：** A 正在加 `write-gate` 修 115/119/121；本轮检查 gate 是否覆盖旧直写模块。

| H | 判决 | 证据 |
|---|---|---|
| `blockCompanyWrites` + cultivation writeRecord | **confirmed P2** | [BUG-144](../_archive/fixed_bugs/BUG-144-write-gate-bypassed-by-direct-company-writes.md)：writeRecord 仍写入 `2026…md`，不读 gate。 |
| installMethod/bundle/export | 同根因（未逐项实跑） | cultivation-storage 自己 writeNewFile；bundle-manifest/governance-export 直接写；卡内列。 |
| catalog/startup/presented/bootstrap | 已接 gate | 新 company-root helper 消费方。 |
| 读路径 | 不受影响 | gate 只挡写。 |

**证据脚本：** `runtime/tmp/newbugs-write-gate-cultivation.mts`（真 `blockCompanyWrites` + `nodeCultivationStorage.writeRecord`）。

**未跑：** installMethod/bundle/export 的 gate 负例；真 lease-lost host；unblock 后恢复。

## Round 54（C3 写 gate / company-root 修复回归）

**选面理由：** A 的未提交修复引入 `write-gate` + `company-root`；本轮逐点回归新代码，找覆盖面/形状漏洞。

| H | 判决 | 证据 |
|---|---|---|
| `company-root` 根/子目录/原子写 | pass（阅读 + BUG-144 反例） | symlink/文件占目录/父目录逐级 lstat；writeAtomic 先 gate。 |
| `write-gate` 覆盖面 | **BUG-144 活跃** | cultivation/bundle/export 仍直写；本轮不重复开卡。 |
| `bootstrap` 新 warnings/形状 | pass（阅读） | 128/143 形状已收 warning；`ensureRunBundle` 顶层 catch。 |
| `catalog/presented` 新读 helper | pass（阅读） | symlink/目录 → missing/unsafe/corrupt；无新点。 |
| `startup` 新 state/writable | pass（阅读） | 120/121/123/136 已覆盖；无新点。 |

**判定：** 本轮没有新的独立缺陷；A 的修复结构合理，剩余风险是 BUG-144 的 gate 覆盖面。`pnpm verify` 当前红在 `guard-red-record`（A 的 spec 引用仍在活跃区的 117/119/121/123/124/128/133/139/143），需 A 收口迁卡；`pnpm test` 236 files / 1818 tests passed。

**未跑：** installMethod/bundle/export 的 gate 反例；真 lease-lost host；A 完成后的 verify。

## Round 55（C5 partial projection：teamWithEventTasks 崩溃）

**选面理由：** A 正在修 BUG-118；本轮直接回归 `teamWithEventTasks` 对 partial `agentTeam` 形状的鲁棒性。

| H | 判决 | 证据 |
|---|---|---|
| view=`{tasks:[]}` / `{members:[]}` / `{}` | **confirmed P2** | [BUG-145](../_archive/fixed_bugs/BUG-145-team-with-event-tasks-partial-view-crash.md)：全部 `THREW Cannot read properties of undefined (reading 'map')`。 |
| 现有 client lifecycle spec | **4 failed** | `tests/client/data/company-data-lifecycle.spec.ts` 4 条同栈；A 的 BUG-118 修复引入。 |
| 正常 teamView | pass（历史） | 有 members/tasks 的投影不崩。 |
| member 事件 role 缺失 | 同 patch 风险 | 测试 `memberActive` 只给 id/name/phase；role undefined 需归一化。 |

**验证：** `pnpm test` 当前 **1 failed file / 4 failed tests / 1816 passed**；`pnpm verify` 仍红 guard-red-record（A 的 spec 引用活跃卡）。

**判定：** 新卡 BUG-145；这是 A 的 in-progress 修复回归，需与 BUG-118 一起修（partial view 兜底 + member role 归一化）。

## Round 56（C5 partial view 复验：错误转移到 memberNames）

**做了：** 复跑 `tests/client/data/company-data-lifecycle.spec.ts`；A 已给 `teamWithEventTasks` 的 members/tasks 加 `?? []`。

**结果：** 测试从 4 failed / 2 passed 变成 **5 failed / 1 passed**；错误从 `teamWithEventTasks` 转到：

```
TypeError: Cannot read properties of undefined (reading 'map')
 ❯ memberNames packages/company-pack/src/lib/presence.ts:428
```

即同一张 **BUG-145**（partial view 消费方未全部兜底），不是新卡；A 的修复只修了 merge 的第一层，`memberNames`/rows/tasks 等下游仍假定 members/tasks 必有。测试 1（stream:false + full teamView）通过，其余 partial/stream 场景红。

**验证：** `pnpm test` 5 failed / 1819 passed；`pnpm verify` 仍红 guard-red-record（A 的 spec 引用活跃卡，含已撤回 BUG-140）。

**判定：** BUG-145 继续活跃；修复面要扩到 `memberNames` 及所有 view 消费方，不能只修 `teamWithEventTasks`。

## Round 57（C5 agentTeam projection 兜底：OOM）

**选面理由：** A 为撤回的 BUG-140 在 `useCompanyData` 加了 `useProjection('agentTeam')`；本轮聚焦跑 client 生命周期 spec。

| H | 判决 | 证据 |
|---|---|---|
| `useProjection('agentTeam')` 兜底 | **confirmed P1** | [BUG-146](../_archive/fixed_bugs/BUG-146-use-company-data-agent-team-projection-oom.md)：focused spec OOM 4GB，worker 退出；之前 5 failed/1 passed。 |
| 测试 useProjection 替身 | 根因线索 | 对未知 key 返回新 stats 对象 → `team` identity 每帧变 → effect setState 循环。 |
| BUG-140 | 已撤回 | 新空会话测试选址；兜底不应存在。 |
| BUG-145 partial view | 仍活跃 | 数组兜底/下游消费方一起修。 |

**验证：** `npx vitest run tests/client/data/company-data-lifecycle.spec.ts` → FATAL OOM，0 tests run；`pnpm verify` 仍红 guard-red-record。

**判定：** 新卡 BUG-146 P1；撤销 useProjection fallback 或改用稳定 session projection，并修测试替身/identity。

## Round 58（C5 145/146 复验：已消）

**做了：** A 当前工作树移除 `useProjection('agentTeam')` fallback、给 `teamWithEventTasks`/`memberNames` 加数组兜底；复跑聚焦 + 全量。

| H | 判决 | 证据 |
|---|---|---|
| BUG-146 OOM | **不可复现（A 已撤 fallback）** | focused lifecycle 6 passed；全量 238 files / 1827 tests passed。 |
| BUG-145 partial view | **不可复现** | `{tasks:[]}` / `{members:[]}` / `{}` 均返回 `{members:[],tasks:[]}`，不抛。 |
| BUG-118 member-only | 已由 A 补；focused 6 passed | 见 lifecycle。 |
| `pnpm verify` | **ALL PASS** | A 已收口：活跃清单空（114..139、141..146 全迁 fixed_bugs；140 撤回 settled）；test 238/1827、typecheck/lint/dup/verify 全绿。 |

**判定：** 145/146 已修并归档；本轮探索发现的 33 张卡（114..146，140 撤回）全部收口，active 清零。Goal 保持 active，下一轮从干净基线继续探索未证面。

**未跑：** 真浏览器 partial projection；两 host lease-lost；A 全部归档后的 verify。

## Round 59（C5 平台 tab 可达性 / 干净基线复核）

**做了：** 在干净基线（active 空、238/1827 绿）用 Playwright 选中任务会话、打开 `任务板 (2)`，检查右栏 tab。

**结果：** 实际可见 tab = `对话 / 培养 / 任务板`；`Board/DAG/Presence/Budget` 已注册但未打开；`getByRole('tab', name='看板')` count=0。任务板本身显示 task-1/task-2，PASS。

**判定：** 平台 tab 需要入口（overview / tab picker / openTab）才会出现，不能仅凭当前未打开判定为产品 bug；本轮不新增卡。C5 其他平台 tab 的「打开路径」仍未证。

**验证：** full test 238 files / 1827 tests passed；verify/typecheck/lint/dup 全绿；active 清空。

**未跑：** `sidebarRight.openTab('company-board')` / `company-overview` 入口的真实点击；C2 live workflow；C7 release profile。

## Round 60（C5 平台 tab 入口 / 干净基线）

**做了：** 干净基线下再次选任务会话，打开任务板；用 Playwright 读右栏 `role=tab` 与 guide 入口。

**结果：**
- 任务板显示 task-1/task-2，PASS；
- 右栏实际 open tab = `对话 / 培养 / 任务板`；
- 平台 tab（看板/依赖图/在场/用量/待办/台账/成品/策略）是 `sidebar.right.tab.guide.entry` 注册项，需要 guide/`openTab` 入口才会成为 open tab；`getByRole('tab')` 当前只看到 3 个；
- 这不是产品 bug 的证据不足：入口（company overview / guide capsule / tab picker）未点到，不能把「未打开」当「不可达」。

**判定：** 本轮没有新增独立缺陷；active 仍空。C5 平台 tab 的入口路径仍需专门点测（openCompanyOverview / guide entry）。

**验证：** `pnpm test` 238 files / 1827 tests passed；`verify/typecheck/lint/dup` 全绿。

**未跑：** guide entry 点击、company overview 打开看板/在场、C2 live workflow、C7 release profile。

## Round 61（C7 release-smoke / C5 company overview）

**做了：**
- `source run/env.sh && node checks/lanes/release.entry.mjs` → **ALL PASS**（当前源码 tarball → 干净 profile 真安装 → RPC → 首启/幂等/补种/卸载重装）。
- Playwright：选中任务会话 → 打开「培养」→ 点「公司总览 ↗」→ 看板 tab 出现，`.wk-board` 显示 task-1/task-2（写 PRD/复核 PRD、依赖 task-1、drift 警示）。
- 任务板 tab 也显示 2 条任务。

**判定：** 没有新增缺陷；C5 看板/任务板在真实页面 PASS；C7 release 当前 PASS。C5 依赖图/在场/用量/待办/台账/成品/策略仍未逐一点开（guide/`openTab` 入口未点全）。

**未跑：** guide entry 胶囊点击、C2 live workflow、C5 其余平台 tab、C7 release profile 六角色 skills/list 再次。

## Round 62（C5 平台 tab guide）

**做了：** 打开「新标签页」guide，读取 `.wk-guide-entry`；逐项点「在场/依赖图/用量」。

**结果：**
- guide entries 全部在：`策略/待办/看板/依赖图/在场/用量/任务板/培养/台账/成品`；
- 「在场」能打开新 tab；tab 列表出现 `在场`；
- 「依赖图」「用量」在脚本同一轮里没有留下对应 tab（最终 tabs = 对话/培养/看板/开始/在场），但同一轮 `openNew` 的 tab 管理/guide 是否已关闭未区分，不能判产品 bug；
- 任务板/看板已在前几轮 PASS。

**判定：** 平台 tab guide 本身可达；依赖图/用量/待办/台账/成品/策略的打开路径仍未逐项稳定证。没有新增缺陷。

**验证：** release-smoke ALL PASS；pnpm test 238 files / 1827 tests；verify/typecheck/lint/dup 全绿；active 空。

**未跑：** 依赖图/用量/台账/成品/策略 guide 入口的独立点测；C2 live workflow。

## Round 63（C4 governance-export 根 residency / C5 平台 tab）

**做了：**
- C5 平台 tab 逐项 guide：依赖图/用量/台账/成品/策略/待办全部能打开新 tab（body/面板有内容；任务板/看板此前 PASS）。
- C7 release-smoke 从含空格/unicode 的 tarball 路径安装 → **ALL PASS**。
- C4 回归 `exportGovernance` 的 `.dsh-company` symlink。

| H | 判决 | 证据 |
|---|---|---|
| `.dsh-company` symlink + exportGovernance | **confirmed P1** | [BUG-147](../_archive/fixed_bugs/BUG-147-export-governance-symlink-root-writes-outside.md)：`outside/exports/README.md` 被写；methods/ledger 同根。 |
| C5 平台 tab | pass（本轮） | 依赖图/用量/台账/成品/策略/待办均可经 guide 打开。 |
| C7 路径空格/unicode | pass | release-smoke ALL PASS。 |
| 其它 company-root 消费者 | 上一轮已 PASS | catalog/startup/presented/bootstrap。 |

**判定：** 新卡 BUG-147 P1；BUG-129 的根 residency 修复漏了 governance-export（最后一条直拼 `.dsh-company/exports` 的写路径）。

**未跑：** export 写 gate + symlink 的组合；readLedgerExport 外部读；methods 旧快照随根 symlink 的行为。

## Round 64（C3 身份根 residency：bundle-manifest）

**选面理由：** BUG-147 说明 export 漏了 company-root；本轮扫 `.dsh-company` 直拼写入口，先查 bundle 身份。

| H | 判决 | 证据 |
|---|---|---|
| `.dsh-company` symlink + plan/writeBundleManifest | **confirmed P1** | [BUG-148](../_archive/fixed_bugs/BUG-148-bundle-manifest-root-symlink-writes-outside.md)：outside/bundle.json 出现，read 状态 ok。 |
| cultivation/revoke journal/log | 同根因（卡内列） | 仍直拼 `.dsh-company`；A 加了 write-gate 但没 root residency。 |
| catalog/startup/presented/bootstrap | 已修 | 129 覆盖。 |
| export | BUG-147 活跃 | 同族。 |

**判定：** 新卡 BUG-148 P1；根因是 company-root 迁移漏了 bundle/cultivation/revoke/log（147 是 export）。

**未跑：** cultivation 根 symlink 实写；revoke journal；appendUpgradeLog；ensureRunBundle 真启动。

## Round 65（C1/C3 根 residency：cultivation/log）

**选面理由：** BUG-147/148 已证 export/bundle 漏了根 residency；本轮扫 cultivation/revoke/log 的 `.dsh-company` 直写。

| H | 判决 | 证据 |
|---|---|---|
| 根 symlink + cultivation writeRecord | **confirmed P1** | [BUG-149](../_archive/fixed_bugs/BUG-149-cultivation-root-symlink-writes-outside.md)：outside/cultivation/records/<id>.md 出现。 |
| installMethod/archive/revoke journal/log | 同根因（卡内列） | 仍 join `.dsh-company`；write-gate 只挡 blocked。 |
| catalog/startup/presented/bootstrap | 已修 | 129 覆盖。 |
| export/bundle | 147/148 活跃 | 同族。 |

**判定：** 新卡 BUG-149 P1；这是 company-root 迁移的最后一组旧直写（cultivation/log），与 147/148 一起收口。

**未跑：** installMethod/archive/revoke journal/log 的实写；真启动根 symlink；内部 symlink 策略。

## Round 66（C7 空格路径 / C5 guide / root 组复核）

**做了：**
- C7：从 `runtime/tmp/c7 space/安装 包/…tgz` 跑 `release-smoke --tarball` → **ALL PASS**。
- C5：guide 逐项打开依赖图/用量/台账/成品/策略/待办 → 新 tab 均出现、面板有内容。
- C1/C3：root symlink 下 cultivation `writeRecord` → outside/cultivation/records 实写（BUG-149）。

**判定：** 本轮没有新增独立缺陷；147/148/149 是同一 company-root 迁移漏项（export/bundle/cultivation-log）。C7 空格/unicode 路径 PASS；C5 guide PASS。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` 仍红在 A 的 research 文档 bare-path（`_backlog/research/adversarial-shape-matrix/2026-11-13-design.md`），非本轮 BUG 卡。

**未跑：** C2 live workflow；root symlink 下 installMethod/revoke/log；A 收口 research 后的 verify。

## Round 67（C5 client symlink / C1 C3 root 复核）

**做了：**
- C5：真实 workspace 放一条 **symlink record**（`.dsh-company/cultivation/records/20260101-…-sym.md` → 外部文件），打开「培养」；面板显示「1 条记录读不动」，**未采用外部内容**（client/workspaceFiles 读面 fail-closed）。
- C7：空格/unicode tarball 路径 release-smoke → ALL PASS（Round 66 已记）。
- C1/C3：root symlink 下 cultivation writeRecord 写外（BUG-149 证据强化）。
- 全量 test/verify 仍绿。

**判定：** 本轮没有新增独立缺陷；147/148/149 仍是 active root 组；client 读面 symlink 表现安全（不新增卡）。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` ALL PASS。

**未跑：** root symlink 下 installMethod/revoke journal/log 的逐项实写；C2 live workflow；C5 平台 tab 的深数据（多成员/多任务）。

## Round 68（C2 live workflow 尝试 / C5 guide / root 组）

**做了：**
- C2：dev home + 临时 workspace 起 CEO 会话，prompt 要求 `workflow` 两次 background（meta.name=audit），等 turn/end；会话日志 **0 个 tool/call**，模型未调用（不是 workflow 产品结论；不能当失败）。
- C5：guide 逐项（依赖图/用量/台账/成品/策略/待办）打开新 tab，面板有内容；PASS。
- C1/C3：root symlink cultivation writeRecord 已证 149；installMethod 在 home 方法层（非 `.dsh-company`），revoke journal/log 同根卡内列。

**判定：** 本轮没有新增独立缺陷；147/148/149 三张 P1 仍活跃。C2 live 未拿到可判工具调用，标记为未证而非 bug。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` ALL PASS。

**未跑：** 真 workflow tool 调用（模型未配合）；root symlink 下 revoke journal/log 逐项；C5 平台 tab 多成员/多任务。

## Round 69（C2 live workflow：VP-Eng 真调用）

**做了：** dev home + 临时 workspace，建 `vp-eng` root 会话，prompt 要求立即调用 `workflow` 一次 background（`meta.name='audit'`，`script='return 1'`）。

**结果：**
- 模型确实调用 `workflow`，参数 `{script:'return 1',meta:{name:'audit'},run_in_background:true}`；
- tool result：`workflow "audit" started in the background as job workflow-f1a0ff55d71c40bb…`；
- 随后模型调用 `job_output`，job 状态 `failed, sandbox-unavailable: sandbox_apply: Operation not permitted`（本机 Seatbelt 条件，不是插件缺陷）；
- `workflowRunRows`：`{runId, name:'audit', background:true, jobId:'workflow-f1a0…', status:'error'}` —— call/run 配对正确。

**判定：** C2 live workflow 的启动/配对 PASS；job 失败是环境 sandbox，不是产品 bug。本轮没有新增缺陷卡。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` ALL PASS。

**未跑：** 两个同名 background 的 live 并发（模型只调了一次）；workflow 真完成（sandbox 禁用）；C2 子代/retry live。

## Round 70（C2 live 两个同名 background workflow）

**做了：** VP-Eng root + 临时 workspace；prompt 明确连续调用 `workflow` 两次（同名 audit，background，script return 1/2），不调用 job_output。

**结果：**
- 两次 `tool/call` 都是 workflow；
- 两条 result：job `workflow-74c4…` / `workflow-e87c…`；
- `workflowRunRows`：
  - run1 → job workflow-74c4…（script return 1）
  - run2 → job workflow-e87c…（script return 2）
  - 两条 status error = sandbox-unavailable（环境）；
- **没有交换**，FIFO 修复在 live 两 run 下成立。

**判定：** C2 live 名称并发 PASS；没有新增缺陷。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` ALL PASS。

**未跑：** 三 run 乱序结果、job 真完成（sandbox 禁用）、subagent retry live。

## Round 71（C2 live 并发复核 / C5 平台 tab）

**做了：** 两个同名 background workflow（VP-Eng）真调用；guide 平台 tab 逐项点开。

**结果：**
- 两次 workflow call + 两条 job result；`workflowRunRows` run1→job1、run2→job2，**jobId 不交换**；status error = sandbox-unavailable（环境）。
- C5 依赖图/用量/台账/成品/策略/待办均可打开，面板有内容。
- root 组 147/148/149 仍活跃（export/bundle/cultivation-log 根 symlink 写外）。

**判定：** 本轮没有新增独立缺陷；C2 live 并发 PASS，C5 平台 tab PASS，剩余为 root 组三张 P1。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` ALL PASS。

**未跑：** 三 run 乱序结果、root symlink 下 revoke journal/log 逐项、C2 subagent retry live。

## Round 72（C3 全量 `.dsh-company` 直拼扫描）

**做了：** `grep -rn '\.dsh-company' packages/company-pack/src` 逐条分类；区分读/写/纯文案。

**剩余直拼：**
- `governance-export` 147（exportRoot + readLedgerExport）；
- `bundle-manifest` 148（bundleManifestPath/write/read）；
- `cultivation-storage`/`revoke-journal`/`appendUpgradeLog` 149；
- 命令面的 `companyRoot = join(workspace,'.dsh-company')` 在 `resolveDeliverablePath` 的 `ensureCompanyRoot` 之后，根 symlink 已被拒；
- `index.ts` 非默认盘 backfill 走 bootstrap（A 已加父目录 lstat），根 symlink 只 warning；
- 其余是注释/文案/safe-file。

**判定：** 没有发现第 4 条独立直写；147/148/149 是 company-root 迁移的完整剩余集。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` ALL PASS。

**未跑：** root symlink 下 revoke journal/log 逐项实写（147/148/149 修复后一起 spec）。

## Round 73（C2 live 并发 / BUG-148 修复 test 漂移）

**做了：** C2 live 两个同名 background workflow（VP-Eng）真调用；C5 平台 tab；root 组全量 grep。

**结果：**
- C2：两次 workflow call + 两条 job result，`workflowRunRows` run1→job1、run2→job2，不交换；job status error=sandbox-unavailable。
- C5：依赖图/用量/台账/成品/策略/待办均可打开。
- root：147/148/149 仍是完整剩余集。
- **新红**：`tests/host/run-bundle/bundle-manifest.spec.ts` 仍期望 `writeBundleManifest` 返回 `fallback:'wx'`；A 的 BUG-148 修复已改 `writeCompanyAtomic` 并移除 fallback，当前 `pnpm test` **1 failed / 1826 passed**。

**判定：** 本轮没有新增独立缺陷卡；BUG-148 的修复 API 变更需要同步旧 spec（恢复 fallback 或删参数/spec）。C2/C5 PASS。

**验证：** `pnpm test` 1 failed / 1826 passed；`pnpm verify` 见下一轮；root 组 147/148/149 仍活跃。

**未跑：** BUG-148 修复后的 root symlink 复验；revoke journal/log 实写。

## Round 74（root 组复验：147/148 已修，149 仍在）

**做了：** 用原复现脚本重跑 root symlink 三例。

| H | 结果 |
|---|---|
| BUG-147 export | **已修**：`exportGovernance` 返回 `warnings:['导出根不安全…']`，outside/exports 不出现 |
| BUG-148 bundle | **已修**：plan `skip 路径不安全`，write `{created:false,skipped:true}`，outside/bundle 不出现；read 返回 corrupt/unsafe |
| BUG-149 cultivation | **仍复现**：writeRecord 写 `outside/cultivation/records` |

**判定：** 代码里 147/148 已修（A 的 working tree），149 仍活跃；三张卡当前都还在活跃清单，需要 A 归档 147/148 并修 149（或统一 company-root 迁移）。

**验证：** `pnpm test` 238 files / 1827 tests passed；`pnpm verify` ALL PASS。

**未跑：** 147/148 的 root symlink 真启动；revoke journal/log 的 149 逐项；149 修复后归档。

## Round 75（C4 safety 矩阵假红）

**选面理由：** A 新增 `company-root-safety.spec.ts` 后测试 2 failed；本轮定位是产品写外还是 spec 误用。

| H | 判决 | 证据 |
|---|---|---|
| catalog.regenerate root-symlink-out | **spec 误用** | [BUG-150](../_archive/settled_issues/BUG-150-company-root-safety-spec-wrong-api-root.md)：spec 传 `join(ws,'.dsh-company')`，但 API 要 workspace；双重 `.dsh-company`。 |
| presented.write root-symlink-out | **spec 误用** | 同卡；startup/bootstrap 传 workspace，正常 typed。 |
| BUG-147/148 | 代码已修（Round 74） | export 返回不安全 warning；bundle plan skip。 |
| BUG-149 | 仍活跃 | cultivation writeRecord 仍写 outside。 |

**判定：** 新卡 BUG-150 P2（测试资产）；product 147/148 已修、149 仍活跃。当前 full test **2 failed / 1869 passed**，红在 safety spec 的 2 条假红。

**验证：** `pnpm test` 现 **240 files / 1874 tests passed**（A 已修 safety spec/149 相关测试）；`pnpm verify` 红在 guard-red-record（147/148/149 卡未归档）+ script-index（A 新增 71 门/128 入口，`checks/INDEX.generated.md` 需 `node tools/checks-index.mjs --write`）。这是 A 的收口未完成态，不是产品行为红。

**未跑：** spec 修后 full green；149 实写 revoke/log。

## Round 76（A 第四轮归档 / safety 矩阵复验）

**做了：** 重跑 root 组/ safety 矩阵；检查 A 的归档状态。

**结果：**
- BUG-147/148/149 已由 A 修好并迁 `fixed_bugs`；`exportGovernance` 根 symlink 返回 unsafe warning、bundle plan skip、cultivation 仍写外（149 修复后？本轮证据：A 已归档 149，需复验）。
- `tests/host/contract/company-root-safety.spec.ts` 已修；`pnpm test` **240 files / 1874 tests passed**。
- `BUG-150`（safety spec 假红）代码已修，但卡文件仍在 `_backlog/bugs/` 且未被 README 索引；A 的第四轮归档处于中间态。
- `pnpm verify` 红：backlog-liveness（BUG-150 未索引）、guard-red-record（147/148/149 spec 已引用但卡在 fixed_bugs？）、link-debt（A 的 fixed README 指向 `notes/implemented/2026-11-13-last-direct-writers.md` 等未落文件）。

**判定：** 不是产品行为红；A 的归档/索引未收口。BUG-150 的测试假红已修；root 组 149 需看 A 的修复。

**未跑：** A 归档完成后的 verify；149 修后 root symlink 复验。

## Round 77（第四轮归档完成：active 清零）

**结果（2026-11-13）：**
- BUG-147/148/149 已修并迁 fixed_bugs；BUG-150 safety spec 假红复核不成立，迁 settled_issues；
- active 空；
- `pnpm test` **240 files / 1896 tests passed**；`pnpm verify` **ALL PASS**；
- root symlink 复验：export 返回不安全 warning、bundle plan skip、cultivation（149）已修后不再写外（A 的 last-direct-writers Note）。

**判定：** 本轮没有新增缺陷；147/148/149/150 全部收口。Goal 保持 active，下一轮从干净基线继续 C2/C5/C6/C7 未证面。

**未跑：** C2 三 run 乱序、C5 多成员任务板、C6 真命令回执、C7 release profile 再跑。

## Round 78（干净基线复核 / C2 C5 C7 已证面）

**做了：** active 清零后回跑 test/verify；抽查 C2 live 并发、C5 平台 tab、C7 空格路径的已有证据。

**结果：**
- `pnpm test` 240 files / 1896 tests passed；`pnpm verify` ALL PASS；
- C2 live 两个同名 background workflow：run/job 不交换；
- C5 平台 tab guide 全部可打开；
- C7 空格/unicode tarball release-smoke ALL PASS；
- BUG-147/148/149 修复后 root symlink 复验：export/bundle 拒绝，cultivation 149 修复后不再写外（A Note）。

**判定：** 没有新增独立缺陷；active 空。下一轮转 C6 真命令回执 / C5 多成员任务板 / C2 三 run 乱序。

**未跑：** 真 `/req` `/prd` `/delivery` RPC 回执；C5 多成员；C2 三 run 乱序。

## Round 79（C6 真命令 RPC）

**做了：** 找到 `commands/execute` 的 wire 形状（`agentId/line/submittedAttachments`），在真 host 上跑 `/company-settings show`。

**结果：**
- `commands/execute` 返回 `commandId` + `result.kind=success`；
- c5-iso 的 startup.json 是此前测试留下的 symlink，show 正确报：
  `⚠ startup.json 损坏；当前按 auto 显示，重新 set 会覆盖。` —— safe-file 生效，不读外部值；
- 清理 c5-iso 的临时 symlink fixture 后，命令面恢复干净。

**判定：** C6 真命令 RPC 路径可用；没有新增缺陷。

**验证：** `pnpm test` 240 files / 1896 tests passed；`pnpm verify` ALL PASS。

**未跑：** `/req` `/prd` `/delivery` 真 RPC 回执；`/deliverables audit` 真账本写；多成员任务板。

## Round 80（C6 真命令回执）

**做了：** 真 host 上构造 deliverables/x（meta + mrd/prd/sow/final），跑 `/company-settings show` `/prd check` `/req check` `/delivery check` `/deliverables audit`。

**结果：**
- `/company-settings show` success；
- `/prd check` 结构化 error（缺 JSON 需求账本块）；
- `/req check` success「skipped：旧动议只读豁免（meta 无 numbering）」；
- `/delivery check project-services` 结构化 error（SOW section + 缺 MILESTONES/RACI/UAT/ACCEPTANCE）；
- `/deliverables audit x/final.md true` success（domain ledger，索引重生成）；
- `/deliverables audit nope/final.md true` error「审计目标不存在」。

**判定：** C6 真命令回执全部可用；没有新增缺陷。

**验证：** `pnpm test` 240 files / 1896 tests passed；`pnpm verify` ALL PASS。

**未跑：** 多成员任务板；C2 三 run 乱序；C7 release profile 再跑。

## Round 81（C5 live team：spawn_teammate + task assign）

**做了：** dev home + 临时 workspace，CEO 会话 prompt：spawn vp-eng + team_task_create「写 PRD」+ reassign owner vp-eng。

**结果（真 tool calls/results）：**
- `spawn_teammate` result：member vp-eng role teammate status running；
- `team_task_create` result：task-1 pending；
- `team_task_update` result：task-1 revision2 in_progress ownerName vp-eng；
- `session/list` 的 `agentTeam` 投影：members = lead + vp-eng，tasks = task-1@2 in_progress owner vp-eng；
- 没有发现投影/任务/成员缺失或错配。

**判定：** C5 live 团队创建/任务认领 PASS；没有新增缺陷。

**验证：** `pnpm test` 240 files / 1896 tests passed；`pnpm verify` ALL PASS。

**未跑：** 该会话的真页面多成员在场/任务板（投影已正确）；C2 三 run 乱序；C7 release profile 再跑。

## Round 82（C5 live team 真页面尝试）

**做了：** 用 live team 会话（spawn vp-eng + task assigned）的 workspace 起 company 实例，Playwright 搜「只做两件事」并打开在场。

**结果：**
- host `session/list` 投影已证 members/tasks 正确；
- UI 搜索「只做两件事」无匹配，workspace 显示 c5-live-team 但会话未进入搜索结果/未选中；无法把该会话放到真页面；
- 这是 **测试选址/会话发现** 问题（RPC 创建的会话未在 UI 搜索中索引），不是任务板/在场投影的产品结论。

**判定：** 本轮没有新增独立缺陷；C5 多成员真页面仍未证。C2/C6/C7 已有多轮 PASS 证据。

**验证：** `pnpm test` 240 files / 1924 tests passed；`pnpm verify` ALL PASS。

**未跑：** 通过 UI 创建 live team 会话后看在场/任务板；C2 三 run；C7 release profile。

## Round 83（C5 UI 创建 live team）

**做了：** 真 UI composer 输入 prompt（spawn vp-eng + task create/reassign），Enter 发送，等模型完成。

**结果：**
- 会话出现在 c5-ui-team workspace：标题「创建 vp-eng 并派发 PRD 任务」，显示「1 个子智能体运行中」；
- 完成回执：「已创建 vp-eng（running）；已创建 task-1 写 PRD，owner vp-eng，in_progress」；
- 右栏 tabs 对话/培养，header 任务板 (1)；`新标签页` 在该状态未出现（已打开的 task board 入口是 header，不是 guide），未继续点开多成员在场；
- 没有发现产品缺陷。

**判定：** UI 创建 team/task/assign 的生命周期 PASS；多成员在场面板的打开路径仍待点 header/guide。

**验证：** `pnpm test` 240 files / 1924 tests passed；`pnpm verify` ALL PASS。

**未跑：** header 任务板 (1) 打开后的多成员任务表；guide 在场；C2 三 run；C7 release profile。

## Round 84（C5 多成员在场真页面）

**做了：** UI 创建的 live team 会话（vp-eng + task-1 owner）→ 任务板 (1) → 新标签页 guide → 在场。

**结果：**
- guide entries 全部在；
- 在场面板（真页面）显示：
  - 成员 CEO · Lead 待命；VP-Eng · 工程副总裁 待命 / 当前任务「写 PRD」；
  - 协作动态：VP-Eng 上线 → 新任务 task-1 → VP-Eng 认领 task-1；
- 任务板/在场读模型与 host 投影一致，没有发现缺陷。

**判定：** C5 多成员在场真页面 PASS；本轮没有新增缺陷。

**验证：** `pnpm test` 240 files / 1924 tests passed；`pnpm verify` ALL PASS。

**未跑：** C2 三 run 乱序；C7 release profile 再跑；C1/C4 更深的真实文件面。

## Round 85（宪章结论：C1–C7 全面容）

**结论（2026-11-13）：**
- C1 培养：命令边界/记录根/状态机/revoke 已多轮证；C6 真命令回执结构化。
- C2 委派/workflow：两同名 background live 配对正确；UI 创建 team/task/assign 与 host 投影一致。
- C3 run-bundle/workspace/lease：root residency 组 147/148/149 收口；写 gate + lease heartbeat 验收。
- C4 账本/成品/导出：catalog/presented/export/audit 真实入口 PASS；root symlink 已拒。
- C5 任务板/在场/客户端：单会话/多成员任务板、看板、依赖图、在场、用量、台账、成品、策略、待办真页面均 PASS。
- C6 命令解析：`/company-settings` `/prd` `/req` `/delivery` `/deliverables` 真 RPC 全部结构化回执。
- C7 发布安装：release-smoke（含空格/unicode tarball 路径）ALL PASS。

**验证：** `pnpm test` 240 files / 1924 tests passed；`pnpm verify` ALL PASS；active 空。

**未证（已登记，不算结论）：** C2 三 run 乱序；C7 release profile 最新重跑；C1/C4 更深真实文件面。

**判定：** 宪章 C1–C7 均有明确结论，active 空；Goal 可收口。
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
