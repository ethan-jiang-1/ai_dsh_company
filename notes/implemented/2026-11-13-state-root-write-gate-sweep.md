# 2026-11-13 · 状态根/写 gate/命令边界横扫（BUG-114..143）

状态：implemented（2026-11-13 落地；验证见下）

上游 = 用户 2026-11-13：「_backlog/bugs 这里又找到一堆bug……直到所有bug解决了」。32 张卡（114..139、141..146；BUG-140 经复核撤回）来自
[高复杂度面持续探索](../../_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md) 的 C1–C7 回归扫，
绝大多数是前两轮修复后的边界复查：**同一个「workspace 可写 ⇒ `.dsh-company` 及其子目录可被 symlink/文件替换」
假设被各模块各自实现**，以及 typed error 只在部分命令边界收口。

## 问题

- **A 状态根/路径形状**（122/128/129/131/132/134/135/136/137/142/143/133/138/125）：catalog/ledger/startup/
  bootstrap/命令读面各自 `join(workspace,'.dsh-company',…)` 后直接读写；根/中间目录/叶子被 symlink 或目录占用时，
  写到 workspace 外、读到外部 JSON、或 EISDIR/EEXIST 抛到调用方。
- **B 写 gate/lease**（115/119/121/124）：lease 只在 boot 取一次，接管只换锁不 fence 旧 writer；blocked host 的
  startup watcher、`/company-settings set`、bootstrap 仍写；锁路径是目录时只报「竞争失败」。
- **C startup 诊断**（120/123）：坏 `startup.json` 静默当 auto；会话 cwd 是 tmpdir 时写危险落点。
- **D 培养命令边界**（117/127/130/139/141）：`records/` 坏形状时 adopt/reject/verify/check/archive/correct/propose
  抛 typed error；`adopt id as` 缺 slug 静默默认；verify 不看 `revokedAt`。
- **E 客户端/workflow**（118/126/140）：投影缺席时 member 事件不建视图；同名并发 workflow 配对互换 jobId；
  TasksTab 只读 sessions store 的投影，选中会话投影不在 store 时仍空。
- **F 发布/导出**（114/116）：导出整目录替换删掉「本次不可生成」的旧 ledger/methods；发布清单漏 wiki 模板与共享 skill。

## 决定

1. **共享 `host/run-bundle/company-root.ts`**：`ensureCompanyRoot/ensureCompanyDir/companyFileProblem/readCompanyText/
   writeCompanyAtomic`（+ `At` 变体）。读：根/中间目录 lstat 非 symlink、叶子 `plainFileProblem` 非 symlink 且
   realpath 在根内；写：父目录逐级安全、目标非目录、temp+rename（symlink 由 rename 替换）。catalog、presented 账本、
   startup、bootstrap、命令读面统一消费。
2. **共享 `host/run-bundle/write-gate.ts`**：进程级 blocked 原因；runtime-guard 在 lease 被占时 block，
   持有者 heartbeat 发现盘上 token 变化时 block；`writeCompanyAtomic`/bootstrap/export 写前 assert。
   lease 锁路径先 lstat：目录/symlink → 可操作错误，不再伪装成「另一个进程抢先」。
3. **startup**：`parseStartupSettingsState` 区分 missing/corrupt/unsupported；store 读用 safe root，symlink 不采用外部值；
   `writeAtomic` 走 `writeCompanyAtomic`；`resolveStartupWorkspace` 对会话 cwd 过 `isDangerousRoot`，危险时回退 boot；
   `registerStartupSettings` 收 `writable`，blocked 时只装只读 section；settings 命令 set/reset 先判 `dataBlocked`。
4. **bootstrap**：dir/file 条目写前 lstat 父目录与目标；symlink/目录/文件占目录 → warning + skip；
   replace 用 temp+rename；`BootstrapResult.warnings` 可读。
5. **cultivation**：`cultivationCommandHandler` 外层统一捕获 `UnsafeCultivationPathError`/`CompanyWriteBlockedError`；
   propose 写失败返回 `recorded:false + note`；adopt 只认 `adopt <id>` 或 `adopt <id> as <slug>`；verify 见 `revokedAt` 拒绝。
6. **client/workflow**：`teamWithEventTasks` null 基座同时消费 `team/member`（role 缺省 lead/teammate），空流仍 null；
   `useCompanyData` 在 sessions store 无投影时用槽 `useProjection('agentTeam')` 兜底；workflow 同名并发按 start 顺序
   FIFO 取最早未用前置 call。
7. **导出/发布**：`exportGovernance` 在 ledger 非 ok/缺席、methods 源缺失时把旧件复制进 staging，warning 改「沿用上次」；
   `export-dist` 的 `must` 与 `release-smoke` 增加 wiki 模板/知识地图共享 skill 的存在性检查。

## 输掉的方案

- **逐模块补 `lstat`**：30 张里 14 张同根，逐点补必漏；共享 root/write-gate 才能让「新写路径」默认安全。
- **根 realpath 一次即可**：`kb`/`deliverables` 中间目录 symlink 仍穿透；必须逐级 lstat。
- **symlink 一律跟随但 canonical 后比较**：审计把 x 写成 y、命令把外部当内部；读/审计应拒绝 symlink，写用 rename 替换。
- **lease 接管只 warn**：旧 writer 恢复后继续写；heartbeat token 校验 + 写 gate 才能让下一次写 fail loud（仍有 30s 窗口）。
- **startup 坏 JSON 当 auto**：用户以为没设过；必须 `problem` 面 + show/注入说真话。
- **workflow 取「最近前置 call」**：同名并发会把 r1 配到 c2；按 start 顺序 FIFO。
- **TasksTab 只信 sessions store**：选中会话的投影可能不在 store；用槽 projection 兜底。
- **导出只生成「本次成功部分」**：整体替换会原子地删旧件；staging 必须带旧件。

## 验证

| 组 | 红证（实跑） | 绿证 |
|---|---|---|
| A 根/形状 | 去掉根 symlink 检查 → write-gate 1 failed | write-gate 3 passed；catalog 25 passed |
| B lease | HEAD lease → 2 failed（stale 接管/heartbeat） | lease 6 passed |
| C startup | HEAD startup-store → 2 failed；危险 cwd 直接返回 → 2 failed | startup-store 17 passed；startup-workspace 2 passed |
| D cultivation | HEAD cultivation → 3 failed（坏根/adopt as/verify revoked） | cultivation-command 19 passed |
| E client/workflow | HEAD presence → 1 failed；改回 `.at(-1)` → 1 failed | presence 23 passed；workflow 10 passed；tabs-body 4 passed |
| F 导出 | 去掉旧 ledger 复制 → 1 failed | governance-export 4 passed |

全量：`pnpm typecheck` 绿；`pnpm test` **238 files / 1827 tests**（1817 passed + 6 skipped）；`pnpm lint` 0 warning；
`pnpm dup` 0 clones；`pnpm verify` ALL PASS。未跑：`release-smoke`（116 的安装副本断言已加，但本轮未重打 tarball）、
真浏览器断流/选中会话 steps、真多进程 lease 接管（keyless 真文件 + 纯函数覆盖）。

BUG-140 经探索复核不成立（cdp-probe 默认新空会话；显式选中任务会话后任务板有 2 条），原文迁 settled_issues，不计入修复；BUG-146 是 BUG-140 兜底的 OOM 回归，已撤销。

## 剩余风险 / 未做

- lease fencing 有最长 30s（heartbeat 间隔）窗口；SIGSTOP 超过 120s 被接管后，旧 host 在下一次 heartbeat 前仍可能写。
- `safe-file`/company-root 对「symlink→workspace 内文件」也拒绝（统一策略）；若产品要允许内部链接需另开卡。
- 导出整目录替换会删除 exports 下非本包产出的文件（派生目录，README 已声明）。
- 发布清单的负例（删模板 → export-dist 红）未在 CI 造；release-smoke 新增断言需下次发布实跑。
