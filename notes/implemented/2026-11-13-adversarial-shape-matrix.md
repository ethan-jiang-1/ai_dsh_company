# 2026-11-13 · 对抗性边界矩阵 + 跨载体一致性 spec（P0 + P1/P2 收口）

状态：implemented（2026-11-13 落地；验证见下）

上游 = 用户 2026-11-13：「开成一个 issue」「我们的流程推动落地吧」「没做的都应该做掉」；卡 = [对抗性边界矩阵 P0](../../_backlog/_archive/settled_issues/2026-11-13-adversarial-shape-matrix-p0.md)（已结）。
设计依据 = [研究稿](../../_backlog/research/adversarial-shape-matrix/2026-11-13-design.md)。

## 问题

BUG-080..146 共 66 张卡，**66/66 由探索发现**；`pnpm test` 在缺陷存在期间一直绿。现有 238 个 spec 是「每个模块在自己的夹具上证明自己的行为」，缺的是「所有载体在同一组敌意形状上证明同一个不变量」。三条收敛判据 282 行（company-root / safe-file / write-gate），只有 1 个 69 行 spec、4 个形状。

## 决定

1. **世界形状库** = [world-shapes.ts](../../tests/support/world-shapes.ts)：6 个根形状（missing / dir / file / symlink→外 / symlink→内 / 中间目录 symlink）+ 5 个叶形状（missing / file / dir / symlink→外 / symlink→内）+ 2 个内容形状（截断 JSON / 坏 JSON）；每个 shape 自带 `outside/` 快照，断言「外部零变化」。
2. **Safety 矩阵** = [company-root-safety.spec.ts](../../tests/host/contract/company-root-safety.spec.ts)：**10 个写入口**（company-root / catalog / presented / startup / bootstrap / export / cultivation.writeRecord / cultivation.pendingRevoke / bundle.write / log.append，外加 log.rotating 的通用入口）× 13 shape = 130 例，另 4 个零覆盖入口单测（`createCompanyDir` 越界、`*At` 读写、`*At` 根 symlink、TOCTOU）= 134 例；失败必须是 `UnsafeCompanyPathError` / `CompanyWriteBlockedError` / `UnsafeCultivationPathError`。
3. **Agreement 矩阵** = [file-shape-agreement.spec.ts](../../tests/host/contract/file-shape-agreement.spec.ts)：4 个读载体（`companyFileProblem` / `companyFileProblemAt` / `plainFileProblem` / `readCompanyText`）× 13 shape = 13 例；归一后 ok / not-ok 必须一致，`readCompanyText` 的「更粗」视图显式声明。
4. **载体登记** = [carrier-registry.mjs](../../tools/lib/carrier-registry.mjs)：**15 个已收口载体、3 个 EXEMPT（home 锁/设置/域存储）、0 个 KNOWN_GAP**。
5. **门禁** = [company-root-carriers.mjs](../../checks/gates/company-root-carriers.mjs)：`src/host` 里同时出现公司盘路径特征与写原语的模块，未登记即红并报 `file:line`；登记项的 module / symbol / KNOWN_GAP 卡逐项对账。
6. **映射** = [tests/README.md](../../tests/README.md)：host 逻辑行加「跨载体不变量 → `pnpm test tests/host/contract`」；目录镜像改成「九组 + `contract/`（不镜像单一源码组）」。
7. **TOCTOU 收窄** = `writeAtomicAtRoot` 增加内部注入缝 `CompanyAtomicWriteDeps`（writeFile/rename/unlink/realpath），temp 写入后、rename 前重新证明父/根真实路径没变；变了抛 `UnsafeCompanyPathError`。测试在 `writeFile` 里把父目录换成 symlink，确定性复现。Node 没有 `renameat`/`openat`，rename 仍走路径，窗口只是收窄，不是完全关闭。
8. **BUG-151（矩阵首跑）**：`appendUpgradeLog` 只保父目录，叶子目标 symlink 时跟随写外、目录时裸抛 EISDIR；改为先 `companyFileProblem` 预检，unsafe 跳过。
9. **P1 startup** = [startup-state-agreement.spec.ts](../../tests/host/contract/startup-state-agreement.spec.ts)：settings 9 形状（missing/valid/empty/corrupt/truncated/unsupported/dir/symlink/root-symlink）+ options 3 形状；unsafe/corrupt 时不得采用外部或坏内容里的值。
10. **P1 ledger** = [ledger-state-agreement.spec.ts](../../tests/host/contract/ledger-state-agreement.spec.ts)：presented 7 形状 → status；Non-destruction：账本 corrupt 时导出沿用旧 ledger/methods，不整目录删。
11. **P1 cultivation** = 既有 [cultivation-command.spec.ts](../../tests/host/cultivation/cultivation-command.spec.ts) 已覆盖 records 不可达/revoked/坏记录/根 symlink；本轮把 `cultivation.writeRecord` / `cultivation.pendingRevoke` 升进 Safety 矩阵。
12. **P2 进程矩阵** = [company-root-process.e2e.mjs](../../checks/lanes/company-root-process.e2e.mjs)：同文件两进程并发写、残留 temp、根 symlink、进程重启读回、lease stale 接管 / 新鲜锁拒绝；子进程用 `tsx` 直接加载 src，不依赖 tarball。

## 输掉的方案

- **按 66 张卡逐张写 spec**：又一次回归，覆盖已知而非未知；负例仍然是「发现之后补的钉」。
- **引入 fast-check**：形状离散可枚举，属性库只增加依赖与不确定性；手写 shape + `describe.each` 足够。
- **5 轴全组合**：爆炸；用代表形状 + 载体族控制。
- **进程/重启矩阵塞进 `tests/`**：`layering.spec.ts` 禁 `child_process`；留 smoke（P2）。
- **把 catalog/presented 的参数混用当产品 bug**：首跑 2 条红是 spec 把 `.dsh-company` 传给要求 workspace 的 API；修正后 55 passed。它作为 [BUG-150](../../_backlog/_archive/settled_issues/BUG-150-company-root-safety-spec-wrong-api-root.md)（测试误用）留痕，不冒充产品缺陷。

## 验证

| 面 | 实跑证据 |
|---|---|
| full test | `pnpm test` **242 files / 1997 tests passed**；契约目录 4 spec / 167 用例（同树另有 147/148/149 修复轮的 3 条用例） |
| 结构门禁 | `pnpm verify` **ALL PASS**；`PASS company-root-carriers ×51 文件（写面文件 7 / knownGap 0）` |
| 类型/风格 | `pnpm typecheck`、`pnpm lint`（0 warning）、`pnpm dup`（0 clones）全绿 |
| 进程矩阵 | `node checks/lanes/company-root-process.e2e.mjs` → **ALL PASS**（16 项：同文件并发 / 残留 temp / 根 symlink / 重启读回 / lease stale 接管 / 新鲜锁拒绝） |
| 红证 1（门禁） | 植入 `zz-probe-writer.ts`（`writeFileSync` + `.dsh-company`）→ `FAIL company-root-carriers: packages/company-pack/src/host/zz-probe-writer.ts:4 → 未登记的公司盘写入口`；删文件 → `PASS` |
| 红证 2（Safety） | `ensureCompanyRoot` 直接 `return companyHomeOf(workspace)`（跳过 symlink/realpath）→ `root-symlink-out` ×6 红 + `root-missing` 红；还原 → 134 passed |
| 红证 3（Agreement） | `companyFileProblemAt` 直接 `return null`（把分类折成 ok）→ `root-missing` / `root-dir` / `root-file` / `root-symlink-out` / `root-symlink-in` / `mid-symlink-kb` 红；还原 → 13 passed |
| 红证 4（TOCTOU） | 去掉 `recheckParent` 调用 → TOCTOU 用例红（raw `ENOENT`，非 typed）；还原 → 134 passed |
| 首跑副产品 | 矩阵首跑抓到 spec 的 API 误用（BUG-150）；修正后 catalog/presented 留在 CARRIERS，未降级为 knownGap |

## 剩余风险 / 未做

- **KNOWN_GAP 已清零**：bundle.write / log.append / log.rotating 本轮迁入 `CARRIERS`；BUG-151（upgrade log 叶子目标）由矩阵首跑发现并同轮修掉。
- **TOCTOU 只收窄，未完全关闭**：recheck 之后、rename 之前仍有窗口；Node 没有 `renameat`/`openat`，路径式 rename 无法根除。真断电/fsync 级 durability 不在本矩阵。
- **P2 是模拟崩溃，不是真崩溃**：残留 temp + 重启读回 + 子进程拒绝，覆盖了可观察的恢复语义；写到一半 kill / fsync 时序未做。
- **P3**：未迁移现有 ad hoc 形状用例（去重）；覆盖率阈值未改；行覆盖不等于轴覆盖。
- 门禁只扫写入口，不扫读载体；读面由 Agreement spec 判，登记表里的 reader 是给 spec 用的地图。
- 内容形状（截断/坏 JSON）的解析器语义已由 startup/ledger 两个 P1 spec 判；路径矩阵仍只断言「路径可读 = ok」。
