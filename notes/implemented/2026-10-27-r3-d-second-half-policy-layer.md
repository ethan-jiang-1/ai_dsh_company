---
状态：implemented（2026-10-27，R3 批次 D 后半：政策层与入口链拆分）
---

# R3-D 后半：把常设规则搬进政策层，把开发环从 349 行收到 155 行

> 上游 = [第三轮六维度打扫卡](../../_backlog/_archive/settled_issues/2026-10-27-repo-hygiene-round3.md)（R3-18/19）；
> 前序 = [D 前半](./2026-10-27-r3-d-first-half-disclosure.md)。

## 决定

1. **新建政策层 [docs/policy.md](../../docs/policy.md)**（94 行）：常设的「必须 / 不许」——
   P1 任务入口与授权（自 dev-loop §0.5 的规则段迁入：只读 Notes 的边界、先澄清再 RFC、Plan Mode、长程 goal 写法）、
   P2 门禁升格判据（自 §9）、P3 自动化上限（§10）、P4 越界写入（§11）、P5 自主协议与语义审（§13）。
   `docs/AGENTS.md` 的 tier 表加「政策」行（`不属于这层`：操作步骤、机制依据、决定史）。
2. **指南按用途再分三处**（每处只有一个 job，dev-loop 只留入口/执行/收尾）：
   - [docs/guides/debugging.md](../../docs/guides/debugging.md)（32 行）← dev-loop §2 排查阶梯；
   - [docs/guides/environments.md](../../docs/guides/environments.md)（44 行）← dev-loop §6 双 home/双 DSH；
   - [bootstrap](../../docs/guides/bootstrap.md) ← dev-loop §4 插拔速查（装法表）；
   - [tests/README](../../tests/README.md) ← dev-loop §9.1 命令与预算速查（验证地图的第四块：改动面→检查 + 命令 + 预算 + 首跑）。
3. **dev-loop 只留入口与执行**：§0 导航、§0.5 入口三步、§1 执行链、§3 设计四问、§7/§8 指针、§9 连通/内容档、§12 记录与收尾；
   其余节号**保留为一行指针**（防所有既有「dev-loop §X」引用断链）。
   §5 升级环压成 4 行指针（程序唯一家本来就是 [release.md](../../docs/release.md)）。
4. **引用与门禁同步**：`AGENTS.md`（纪律表、双 home 两处、原生纪律）、`testing.md`、`delegation.md`、`release.md`、
   `decisions.md` D12、`web-rpc.md`、`entry-probe.spec.ts` 的 Q13 答案、`layering.spec.ts` 的「纪律有家」守卫
   全部改指新家；守卫从「dev-loop §9.1 必须含纪律句」改为「tests/README 的验证分层节含纪律句 + dev-loop §9.1 指针仍在」。
5. **预算随内容下调**：dev-loop 367→165；tests/README 52→100；bootstrap 143→165；新增 policy 100 / debugging 38 / environments 48。

## 输掉的方案

- **政策规则留在指南层**：`docs/AGENTS.md:16` 明确「完成定义/常设禁令不属于指南」；留在 dev-loop 就是层违规。
- **建 `dev-loop-reference.md` 把非入口章节整体搬过去**：只是把「351 行大全」换成「155 + 240」，
  第二份大文件仍在入口链旁；按用途拆到三处、每处单一 job 才是真分层。
- **为验证命令再建 `guides/verification.md`**：验证面已有「政策（testing）」+「映射（tests/README）」+「索引（checks/README）」，
  再加一份会多一个跳；把命令与预算并进 tests/README，验证只需一个入口。
- **逐个改掉所有「§X」引用**：跨 20+ 文件、且 D 号/事故卡里也有引用；保留编号指针是既有惯例（防断链），
  关键引用已直接改指新家。

## 后果

- **入口链 836 行 / 102 KB → 570 行 / 66 KB（-35%）**；dev-loop 41 KB → 14 KB（-65%）。
  「开工只需要 §0.5+§1」的噪声比从约 6.5:1 降到约 3:1。
- 常设规则只有一个家（policy.md）；要判断题「能不能自己做/要不要拉人」不用再翻 9 KB 的指南。
- `docs/` 文档数 27 → 30，全部在 index 登记（doc-taxonomy 门禁通过）。
- 分层守卫的「纪律有家」改为指向验证地图，避免下一次搬家时守卫又钉在旧文件上。

## 验证（真跑）

```text
wc -l docs/guides/dev-loop.md             → 155（D 前半后 222；本轮前 349）
wc -l docs/policy.md                      → 94
wc -l docs/guides/debugging.md            → 32
wc -l docs/guides/environments.md         → 44
cat <入口链六件> | wc -c                  → 66162（改前 102120）

node checks/run-gates.mjs                 → ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）
npx vitest run                            → 104 files / 947 tests passed
pnpm typecheck                            → exit 0
```

分层守卫（机制红→绿）：改前守卫断言 dev-loop 含「9.1 测试分层与预算」与纪律句；内容迁到 tests/README 后
守卫 **红**（`§9.1 必须写明"真模型 / 真浏览器不进迭代环"：expected … to contain`）；把守卫改指
tests/README + dev-loop 指针后绿（4 tests）。

未验：无运行时行为改动；浏览器车道未重跑（文档层变更，`client-load`/`ui-scene` 不受影响）。

## 剩余

- **D4 三个巨型函数**（`CultivationBoard` 482 / `apply` 425 / `cultivationCommandHandler` 340）。
