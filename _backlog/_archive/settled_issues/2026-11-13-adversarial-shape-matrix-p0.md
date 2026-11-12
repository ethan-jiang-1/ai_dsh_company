---
status: 已结
opened: 2026-11-13
---

# 推敲：对抗性边界矩阵 + 跨载体一致性 spec（测试资产 P0）

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：note — [Note](../../../notes/implemented/2026-11-13-adversarial-shape-matrix.md)；P0 已落（shape 库 + 两个矩阵 spec + 载体登记 + 门禁），P1/P2 见研究稿。
>
> **审查**：agent — P0 核心验收全绿（`pnpm verify` ALL PASS；`pnpm test` 240 files / 1924 tests；typecheck/lint/dup 绿；3 条红证实跑）；TOCTOU 延后（需注入缝，见 Note 剩余风险）；用户 2026-11-13 指令「推动落地」。
>
> **授权边界**：本卡只加测试资产 + 门禁 + 必要的词表对齐；不改 host/client 行为。

## 问题与期望结果

**触发**：BUG-080..146 共 66 张卡，66/66 由探索发现；`pnpm test` 在缺陷存在期间一直绿。现有 238 个 spec 是「每个模块在自己的夹具上证明自己的行为」，缺的是「所有载体在同一组敌意形状上证明同一个不变量」。

**期望结果**：P0 交付后——

1. 有一条共享的世界形状库（根 / 叶 / 内容三轴，12–16 个 shape），每个 shape 可构造、可清理、带预期类；
2. `company-root` 的写入口在任意形状下满足 Safety（写进根内或 typed refusal；外部字节不变）；
3. `company-root` / `safe-file` 的读载体在任意形状下满足 Agreement（归一后同类；允许的偏离显式登记）；
4. 新写入口不登记 → `pnpm verify` 红，报 `file:line`；
5. 三个红证（去掉 root symlink 检查 / 去掉目录占位检查 / 去掉 write-gate）都能让矩阵红。

**判断完成**：上述 5 条 + `## 验收标准` 全绿 + Note 回链。

## 当前情况

- 现状证据与完整设计 = [研究稿](../../research/adversarial-shape-matrix/2026-11-13-design.md)（2026-11-13）。
- 三条收敛判据 **282 行**（company-root 202 / safe-file 44 / write-gate 36），只有 **1 个 69 行 spec、4 个形状**。
- **23 个 src 文件 / 55 处** `.dsh-company` 字面量 + 15 个 `RUN_BUNDLE_PATHS` 消费者；**6 个写入口**自拼路径 + 自做 temp/rename。
- 零覆盖形状：截断/半写 JSON、`bundle.json` symlink/目录占位、`exports/` symlink、两进程同写、fsync、TOCTOU、`*At` 变体、`createCompanyDir` 越界分支。
- 活例：[BUG-147](../fixed_bugs/BUG-147-export-governance-symlink-root-writes-outside.md) / [BUG-148](../fixed_bugs/BUG-148-bundle-manifest-root-symlink-writes-outside.md) / [BUG-149](../fixed_bugs/BUG-149-cultivation-root-symlink-writes-outside.md) —— 三个写入口仍在 choke point 外；本卡不修它们，只把矩阵/登记做到能覆盖它们。
- 第一个 Agreement 红证：`companyFileProblem` 的类型声明 `'corrupt'` 但实现从不返回；`companyFileProblemAt` 注释写 corrupt、实际返回 unsafe。

## 未决问题

1. P0 是否一并修 `companyFileProblem` 的词表？建议只做**类型/注释对齐**（去掉永不产生的 `'corrupt'`，不改运行时分支），作为 Agreement 的第一条红；若要让它真实产生 `'corrupt'`（行为改动），另卡。
2. `新建:tests/host/contract/` 是新增 `contract/` 组；`tests/README.md` 的「目录镜像九组」要登记例外，是否接受？
3. 门禁首版硬档还是观察档？建议硬档（新写入口不登记就红），存量 6 个旁路用 `EXEMPT` 带理由逐个迁。
4. P0 不迁移现有 ad hoc 形状用例（留到 P3 去重），是否接受短期重复？

## 方案与取舍

- 方案 = 研究稿 §2：A 形状库、B 不变量矩阵、C 载体登记、D 门禁；P0 只覆盖 `company-root` / `safe-file` / `write-gate`。
- 输掉的方案：
  - 按 66 张卡逐张写 spec——又一次回归，覆盖已知而非未知；
  - 引入 fast-check——形状离散可枚举，属性库只增加依赖与不确定性；
  - 5 轴全组合——爆炸；用代表形状 + 载体族控制；
  - 进程/重启矩阵塞进 `tests/`——`layering.spec.ts` 禁 `child_process`，留 smoke。

## 范围与排除项

**做（P0）**：shape 库；company-root Safety 矩阵；file-shape Agreement；carrier registry；门禁；`tests/README.md` 映射行；Note。

**不做**：修 148/149（在 registry 里登记为 `knownGap`，带 bug 链接；修完迁入 `CARRIERS` 再由矩阵覆盖）；147 已由并发修复轮收口并进矩阵；P1 的 startup/cultivation/ledger Agreement；P2 的 smoke 进程矩阵；迁移现有 ad hoc 形状用例；改覆盖率阈值；改 host/client 行为。

## 验收标准

- [x] `新建:tests/support/world-shapes.ts`：根/叶/内容三轴 **13 个 shape**（6 根 + 5 叶 + 2 内容），每个有 id/构造/清理/预期类；`*At`/`createCompanyDir` 越界由 Safety spec 的单测覆盖；`exports/` symlink 由 export writer 覆盖。
- [x] `新建:tests/host/contract/company-root-safety.spec.ts`：6 个 writer × 13 shape = 78 例 + 3 个零覆盖入口单测；每个 writer 在任意形状下「写进根内」或 typed refusal；`outside/` 快照不变。
- [x] 词表对齐（只动类型/注释，不改运行时）：`companyFileProblem` 不再声明永不产生的 `'corrupt'`；`companyFileProblemAt` 注释与返回一致。
- [x] `新建:tests/host/contract/file-shape-agreement.spec.ts`：`companyFileProblem` / `companyFileProblemAt` / `plainFileProblem` / `readCompanyText` 归一后 ok/not-ok 一致；`readCompanyText` 的「更粗」视图显式声明。
- [x] `新建:tools/lib/carrier-registry.mjs`：10 个已收口载体、3 个 `EXEMPT`（带理由）、4 个 `KNOWN_GAP`（148/149，带 bug 链接）。
- [x] `新建:checks/gates/company-root-carriers.mjs`：未登记的生产者 → 红，报 `file:line`；模块/符号不存在 → 红；`KNOWN_GAP` 卡不存在 → 红；`KNOWN_GAP` 在 PASS 行列出。
- [x] 三个红证实跑：门禁植入未登记写入口 / 根 residency 短路 / 分类器折平 → 对应矩阵红；还原绿；原话进 Note。
- [x] `pnpm test` 全量 **240 files / 1924 tests** 绿（新增 2 spec / 94 用例，单独 ~0.5s）；`pnpm verify` ALL PASS。
- [x] `tests/README.md`「改动面 → 最窄检查」host 逻辑行加「跨载体不变量 → `pnpm test tests/host/contract`」；「目录镜像」登记 `contract/` 例外。
- [x] Note 落 `新建:notes/implemented/2026-11-13-adversarial-shape-matrix.md`，含红证原话与未验面。
- [ ] **TOCTOU 延后**：判据与写入之间的 symlink 替换需要注入缝（或真进程 kill），P0 只覆盖「写入前已是坏形状」；见 Note「剩余风险」。

## 关闭条件

P0 验收全绿 + Note 回链 + 研究稿「产出的卡」回填本卡；用户验收后 `git mv` 归档。

## 抽象度

- 换公司要改吗？→ 不会；形状/不变量是测试机制，与公司内容无关。
- 换产品类型要改吗？→ 不会；产品类型只影响 content 夹具，不影响形状轴。
- 换做法要改吗？→ 会；若 host 改成 fs port 或换存储形态，registry 的 module/symbol 要跟着改（地图的预期成本）。
- 只有机制本身变才改吗？→ 是。
- 第二消费者：P1 的 startup / cultivation / ledger Agreement 复用同一 shape 库与 registry。
- 搬家成本：低；shape 库是纯测试支持，registry 是纯数据，门禁独立。
