# 2026-11-13 · 高复杂度面缺陷横扫：不可信 id / 存在≠可读 / 培养作用域 / 状态配对 / 发布失败路径

状态：implemented（2026-11-13 落地；验证见下）

上游 = 用户 2026-11-13：「_backlog/bugs 这里又找到一堆bug，系统性地思考好怎么把这些bug能修好吧」+
「setup goal 静默，自主执行……直到所有bug解决了」；修复交接 = [_backlog/bugs/README.md](../../_backlog/bugs/README.md)
的 2026-11-13 节。十四个缺陷（BUG-090..103）来自 [高复杂度面持续探索](../../_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md) 的 C1–C7 轮。

## 问题

十三张卡按根因是六类「同一事实/边界被多个载体各自解释」：

- **G1 不可信 id 进路径**（094/102）：workspace 里的 `bundle.json.id`、`meta.md` 的 `deliveryMode` / `productType`
  被直接 `join` 进 home 身份目录或 pack content；只判「非空 / 文件存在」，`../` 就能穿出。
- **G3 培养作用域与对账**（090/091）：方法层是 home 级、records 是 workspace 级，`revoke` 把「records 不可达」
  当「0 条记录」删方法；`check` 不排 `revokedAt`、不计坏记录、非法 slug 抛普通 Error。
- **G2 存在 ≠ 可读/可用**（096/099）：catalog 用 `existsSync` 后直接 `readFileSync`，目录冒充 `final.md`/`meta.md`
  /`motion-ledger.md` 就 EISDIR；`/deliverables audit` 不验目标存在，`true` 给未来同 slug 预置背书。
- **G4 输入/迁移的目标域校验**（092/093）：`cultivation_propose` 只靠 schema `required`，空串写坏记录却回
  `recorded:true`；legacy 迁移把大写/空格 slug 原样搬进方法根，看得见但 revoke 删不掉。
- **G5 状态/事件配对**（097/098/103）：workflow 按「名字 + 顺序」配对 call→run，失败的 call 抢走下一次 run；
  presence 的任务迁移用 `else = 已删除`，`pending` 回退被说成删除；任务板只信 `agentTeam` 投影，旧快照
  时工具已建任务却显示空板。
- **G6 发布失败路径与 smoke 时序**（100/101）：`export-dist` 先删旧 `_dist` 再 `npm pack`，pack 失败丢上一份
  可用导出；`concurrent-home-smoke` 还读 v2 `home/bundle.json`、lease 断言用 banner 后单次快照。
- **G7 危险落点**（095）：workspace 解析只硬编码 `/` 与 `homedir()`，`/tmp` / `/private/tmp` 被当成项目目录。

## 决定

1. **G1：单段 id + residency 双层**
   - `isSafeBundleId`（非空、≤128、`^[A-Za-z0-9][A-Za-z0-9._-]*$`）+ `identityBackupPath` 的 `relative` 前缀检查；
     v3 不安全 id 判 corrupt（不写）；v2 不安全 id 升级时换新 id、旧 manifest 留 `.v2.bak`。
   - `isSafeContentId` + `contentMemberFile`：`deliveryMode` / `productType` 先过 slug 形状，再用
     `availableModes` / `availableProductTypes` 做成员校验；`readIfExists` 改成 `statSync().isFile()`，
     目录规则当缺失；`/req` 的 delivery reminder 同样走成员校验。
2. **G3：破坏性命令先证明「可达 + 有记录」，对账显式分态**
   - `revoke`：`loadRecords.reachable === false` → 拒绝；本 workspace 0 条采纳记录 → 拒绝并提示
     `revoke <slug> --orphan`（方法层 home 级、records workspace 级，0 条 ≠ 全局无记录）。
   - `check`：排除 `revokedAt`；`broken` / `revoked` 计数进回执；非法 `methodSlug` 报「记录坏」；
     `readMethod` 的普通 Error 在命令边界收成可读结果；孤儿文案改成「方法无本 workspace 记录（可能属于其它 workspace）」。
3. **G2：类型检查 + boot 收口 + 审计验当前对象**
   - catalog 的 `final.md` / `meta.md` / `kb/motion-ledger.md` 全部 `statSync().isFile()`；非文件跳过并进
     `CatalogResult.warnings`；boot 的 `void initializeCatalog` 加 catch 并输出 warnings。
   - `auditTargetProblem`：审计目标必须是当前存在的普通文件；不存在/目录 → 可操作 warning，不写账本/slug。
4. **G4：写入前往返 + 迁移目标域校验**
   - `cultivation_propose` trim 后校验 expectation（≤500）/ body（≤16000）非空；写入前 `recordText`→`parseRecord`
     往返，坏形状不落盘；`recorded:false` + 可读 note。
   - legacy 迁移对 `SLUG_RE` 不过的目录隔离到 `<role>/.legacy-invalid/<profile>/<name>.md` 并记 warning；
     `listMethods` 只列 `SLUG_RE` 目录；marker 记 invalid 计数。
5. **G5：用「产生 run 的证据」配对 + 状态显式分派**
   - workflow 配对改为「按 start 找最近的前置调用」，只接受结果在 start 之后、或结果文本是启动/完成文案的调用；
     失败在 run-start 前的同名调用不再占用下一次 run。
   - presence 的 live 差分与事件折算都显式分 `in_progress` / `completed` / `pending` / `deleted` / 未知；
     `pending` = 退回待办，未知 = 状态未知；首次 deleted 事件不报「新任务」；zh/en token 成对。
   - 任务板/看板/依赖图用 follow 流的 `team/task` 事件合并 `agentTeam` 投影（事件最新、成员名兜底），
     不再被浏览器拿到的旧投影快照卡死（103）。
6. **G6：staging → 全部成功再替换；smoke 跟 v3 并等待 lease**
   - `export-dist` 在 `_dist/.staging-*` 完成 pack/清单/sha/手册，任何一步失败删 staging、旧 `_dist` 一字不动；
     全部成功后才清旧产物并 rename。
   - `concurrent-home-smoke`：boot 前建 `WS`；bundle 读 `<WS>/.dsh-company/bundle.json` 并断言 v3；
     lease 结论轮询最多 10s，不用 banner 后单次快照；catalog/数据路径补 `.dsh-company/`。
7. **G7：危险落点从平台事实派生**
   - 新 `dangerous-roots.ts`：`/`、`homedir()`、`tmpdir()`（realpath）+ `/tmp`/`/private/tmp` 别名；
     `cwdIsUsable` 与 `validateCompanyHome` 共用 `isDangerousRoot`；子目录仍允许。

## 输掉的方案

- **只校验 `id` 非空、不查分隔符**：仍能 `../` 穿出身份目录；必须把 id 当路径组件做形状 + 前缀双检。
- **只给 `revoke` 加 `--force` 而不区分「records 不可达」**：不可达时连「有没有记录」都不知道，强制删等于
  把保护做成开关；先区分可达性，再给 `--orphan` 显式确认。
- **`check` 把 revoked 记录直接从视图删掉**：会掩盖坏数据；选择计数并显示「已撤回」。
- **把目录冒充文件时静默跳过、不记 warning**：会让坏形状在 boot 里完全不可见；`CatalogResult.warnings` +
  boot 日志保留证据。
- **迁移时直接跳过非法 slug、不落盘**：旧内容会从新世界消失且无证据；隔离到 `.legacy-invalid/` 保留原文。
- **workflow 配对退化成「有 run-start 就建行、jobId 留空」**：会丢 jobId/背景态；用结果证据配对，配对不上
  才走 lost 兜底。
- **presence 只把 `pending` 加进 `else if`、未知仍落删除**：同类状态再增一次又错；未知单独显示「状态未知」。
- **export-dist 先删后建、失败靠 git 恢复手册**：手册 tracked 但 tarball/sha 不可恢复；必须 staging。
- **smoke 用固定 sleep 等 lease**：仍是单次快照的变体；轮询到「恰好一个 blocked」或超时。
- **只把 `/tmp` 加进 `cwdIsUsable`**：`/private/tmp` 真身、`tmpdir()`、换平台又漏；从平台事实派生。

## 后果

- 新增 `src/host/workspace/dangerous-roots.ts`、`src/host/commands/content-id.ts`；
  `bundle-manifest` 的 `isSafeBundleId`/`identityBackupPath` 拒绝不安全 id；`StartupOptions` 不变。
- `revoke` 的用法变为 `revoke <slug> [--orphan]`；`check` 回执新增已撤回/坏记录/非法记录计数。
- `CatalogResult` 增 `warnings`；`migrateLegacyMethodLayers` 的结果/marker 增 `invalid`。
- `concurrent-home-smoke` 的 bundle/catalog/data 路径与 lease 断言更新；`export-dist` 改为 staging。
- 合同同步：`docs/contracts/cultivation.md`（撤回/对账完整性）、`docs/contracts/profile.md`（tmp 根排除）。

## 验证

真跑（2026-11-13，本机）：

| 组 | 红证 | 绿证 |
|---|---|---|
| G1 094 | `git show HEAD` 版 manifest + 新 spec → **2 failed** | 复原 **7 passed** |
| G1 102 | 去掉成员/slug 校验 → delivery **2 failed**、req **1 failed** | 复原 **37 passed** |
| G3 090 | 去掉 reachable + orphan guard → **2 failed** | 复原 **15 passed** |
| G3 091 | 去掉 revoked/broken/invalid 处理 → **2 failed** | 复原 **15 passed** |
| G2 096 | `isRegularFile` 还原 existsSync → **2 failed** | 复原 **19 passed** |
| G2 099 | 去掉 audit 目标检查 → **2 failed** | 复原 **19 passed** |
| G4 092 | 去掉输入校验/往返 → 新用例 failed | 复原 **16 passed** |
| G4 093 | 去掉隔离 + list 过滤 → **1 failed** | 复原 **5 passed** |
| G5 097 | HEAD 版配对 → **1 failed** | 复原 **9 passed** |
| G5 098 | HEAD 版 presence → **3 failed** | 复原 **20 passed** |
| G6 100 | HEAD 版 export-dist + 无 npm → `_dist` 只剩 `release-manifest.json` | 新脚本同场景：旧 tgz/sha/手册 sha 不变、无 staging |
| G6 101 | 旧 smoke：`blocked=0` + 路径 ENOENT | 新 smoke：**ALL PASS**（lease 1 blocked、v3 bundle、catalog/数据、重启） |
| G5 103 | merge 直接返回 view → **1 failed** | 复原 **21 passed**（`session/list` 实查投影含任务） |
| G7 095 | HEAD 版解析 → **3 failed** | 复原 **17 passed** |

全量：`pnpm typecheck` 绿；`pnpm test` **236 files / 1788 tests passed**；`pnpm lint` 0 warning；
`pnpm dup` 0 clones；`pnpm verify` ALL PASS；`concurrent-home-smoke` ALL PASS；
`release-smoke` ALL PASS（fresh tarball：`export-dist` 成功路径 + 干净 profile 真安装）。

## 剩余风险 / 未做

- `check` 对「非法方法名」只在迁移时隔离并 warning；历史遗留在方法根里的非法目录不列出、也不报（不可见但
  不能再被 revoke）。需要时可另开清理卡。
- workflow 配对仍是启发式：vendor 事件不带 callId；本轮只排除「调用结果明确失败且无 run 证据」的误配，
  极端交错（同名多 run 并发且结果乱序）未穷举。
- `export-dist` 的替换是「清旧 + rename staging」；同文件系统 rename 失败窗口未做两阶段回滚。
- `concurrent-home-smoke` 的 lease 等待上限 10s；极慢机器可能需要调大。
- 未跑：真 vendor workflow 失败序列、真页面 presence 数据态、真模型 `cultivation_propose` 调用。
