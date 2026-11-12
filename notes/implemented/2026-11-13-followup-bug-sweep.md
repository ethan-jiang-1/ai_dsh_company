# 2026-11-13 · 回归扫缺陷收口：任务板合并 / symlink 穿透 / 持久化 warnings / lease

状态：implemented（2026-11-13 落地；验证见下）

上游 = 用户 2026-11-13：「_backlog/bugs 这里又找到一堆bug，系统性地思考好怎么把这些bug能修好吧……直到所有bug解决了」；
修复交接 = [_backlog/bugs/README.md](../../_backlog/bugs/README.md) 的 2026-11-13 第二轮节。十张卡 BUG-104..113
来自 [高复杂度面持续探索](../../_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md) 的 C3–C6 回归扫，
多数是上一轮 [缺陷横扫 Note](./2026-11-13-deep-surface-bug-sweep.md) 修复后的边界复查。

## 问题

- **S1 任务板 merge/流错误**（104/112/105）：`teamWithEventTasks` 不看 revision（旧事件回滚新投影）、
  `view=null` 时整段丢事件；事件缺 `ownerId` 被当成「保持旧 owner」；board/dag/tasks 不渲染 `streamError`。
- **S2 workspace 内 symlink 穿透**（108/113）：catalog 与 `/prd` `/req` `/delivery` 用跟随 symlink 的
  `statSync`/`readFileSync`，workspace 内链接可把「成品/文档」指向 workspace 外读取。
- **S3 持久化/导出原子性**（110/111）：治理导出 `atomicReplaceDir` 先删旧目录再 rename；`writeSavedWorkspace`
  直接 `writeFileSync`，半写 JSON 与 missing 不可区分。
- **S4 warnings 传播**（109）：`regenerateCatalog.warnings` 只有 boot 消费；audit/present/回扫静默丢弃。
- **S5 命令路径空白**（107）：`/deliverables audit` 用 `split + join(' ')` 重组路径，连续空格被折叠。
- **S6 lease PID 复用**（106）：只用 PID 存活判 stale；PID 被无关进程复用后旧锁永久挡写。

## 决定

1. **S1**：`teamWithEventTasks` 以 `revision` 判新旧（旧事件丢弃；相同 revision 接受）；`view=null` 且事件含
   `team/task` 时建最小视图（空流仍 null，保留加载态）；事件是完整 task snapshot ⇒ `ownerId` 缺席 = 清空 owner，
   只有 ownerId 存在但映射不到时才 fallback 旧名。Board/Dag/Tasks 统一渲染 `StreamErrorNotice`（新 `stream.error` 文案）。
2. **S2**：新 `host/fs/safe-file.ts`——`plainFileProblem/isPlainFileInside/readTextInside`（lstat 非 symlink +
   realpath 在 root 内）。catalog 的 final/meta/ledger 用它；`resolveDeliverablePath` 拒绝 symlink/越界交付物目录；
   `/prd` `/req` `/delivery` 的 workspace 文档一律走 `readTextInside(companyRoot, …)`；pack content 规则仍按可信内容读。
3. **S3**：`exportGovernance` 整个 `exports/` 在 staging 生成（README + methods + ledger），成功后
   `swapDirWithBackup`：target→backup、staging→target，失败把 backup 恢复；不再先删旧目录。
   `writeSavedWorkspace` 同目录 temp+rename；`readSavedWorkspace` 坏 JSON 返回 `problem:'corrupt'`，
   `resolveWorkspace` 带 `savedProblem`，runtime-guard 启动 warn，不再与 missing 混同。
4. **S4**：audit 回执附「另有 N 条坏形状被跳过」；present 投影与 presented 回扫把 `regenerated.warnings` 逐条 warn。
5. **S5**：`parseDeliverablesAudit` 取原始剩余串（`audit` 前缀与末尾 true/false 之间原样保留），只裁两端空白。
6. **S6**：lease 持有者每 30s touch 锁 mtime（heartbeat）；acquire 判「PID 存活 + mtime ≤120s」才拒绝，
   存活但 mtime 过期视为 PID 复用可接管，回执带 warning；`touchLease` 只更新自己 token 的锁。

## 输掉的方案

- **merge 只按事件到达顺序**：投影与 follow 流到达顺序不同，必须用 revision，不靠「后到即新」。
- **ownerId 缺席就 fallback 旧名**：取消认领是真实语义；fallback 只用于「id 存在但成员表没有」。
- **streamError 只加在 Presence**：board/dag/tasks 恰恰依赖流补数据，流断时必须显式提示「投影可能过期」。
- **catalog/命令面继续跟随 symlink、只在 audit 做 realpath**：读面已经读了外部内容，事后校验太晚。
- **导出只备份 methods、不备份整个 exports**：README/methods/ledger 仍会混代；整目录 staging 才是一个快照。
- **saved 坏 JSON 当 missing**：用户看不到「设置损坏」，只会觉得启动回不到项目；必须可诊断。
- **lease 只靠 startedAt 年龄**：真 writer 可跑数小时会被抢；必须 heartbeat + mtime。
- **`/deliverables audit` 拒绝连续空格路径**：路径本身合法，解析器丢空白才是缺陷；保留原始串。

## 后果

- 新增 `packages/company-pack/src/host/fs/safe-file.ts`；`presence.ts` 的 merge 语义收紧；
  `company-panels.tsx` 新增 `StreamErrorNotice`；`governance-export.ts` 新增 `swapDirWithBackup`。
- `readSavedWorkspace` 增加 `problem` 字段、`WorkspaceResolution` 增加 `savedProblem`；
  `LeaseResult` 的 acquired 分支增加可选 `warning`，lease 文件多了 heartbeat mtime 语义。
- audit 回执多一句坏形状计数；catalog warnings 在 audit/present/回扫可见。

## 验证

| 卡 | 红证 | 绿证 |
|---|---|---|
| 104/112 | HEAD 版 `teamWithEventTasks` → 1 failed（revision/null/owner 用例） | 复原：presence 用例全绿 |
| 105 | `StreamErrorNotice` 返回 null → 1 failed | 复原：company-panels 6 passed |
| 106 | HEAD 版 lease → 2 failed（stale 接管/heartbeat） | 复原：lease 4 passed |
| 107 | HEAD 版 parser → 2 failed（连续空格/回执） | 复原：deliverables-command 6 passed |
| 108 | HEAD 版 catalog → 1 failed（symlink 成品） | 复原：catalog 全绿 |
| 109 | 去掉回执计数 → 1 failed | 复原：deliverables-command 6 passed |
| 110 | 先删后 rename → 1 failed（旧导出丢失） | 复原：governance-export 3 passed |
| 111 | HEAD 版 workspace-resolution → 2 failed（corrupt/原子写） | 复原：19 passed |
| 113 | HEAD 版 prd/deliverable-path → 2 failed（symlink 文档/目录） | 复原：prd + catalog 全绿 |

全量：`pnpm typecheck` 绿；`pnpm test` **236 files / 1799 tests passed**；`pnpm lint` 0 warning；
`pnpm dup` 0 clones；`pnpm verify` ALL PASS。未跑：真浏览器断流 steps、真多进程 lease 竞争、symlink 安装盘真机；
均以 keyless 真文件/纯函数覆盖。

## 剩余风险 / 未做

- lease heartbeat 依赖持有进程的 timer；进程被 SIGSTOP 超过 120s 会被另一个 host 接管（与「PID 复用」不可避免
  地共享同一判据）；接管只 warn，不做双写仲裁。
- `safe-file` 对「symlink→workspace 内文件」也拒绝（策略选择：统一不跟随）；若产品要允许内部链接需另开卡。
- 治理导出整目录替换会删除 exports 下非本包产出的文件（导出是派生目录，已由 README 声明）。
- `/deliverables audit` 未支持引号包裹路径；连续空格已保留，引号仍按普通字符处理。
