# 2026-09-27 · enforcement 通道 + 反证账 + skill 边界三件套（FAQ 07 审计行动项落地）

状态：implemented（2026-09-27。起因 = [archived/harness-gap-audit-faq07](../archived/2026-09-27-harness-gap-audit-faq07.md)
§反馈维——审计认定的唯一结构性缺口：门禁全备而「何时跑」靠 prose；用户点名「接下来要修复」后同日落地。
ROADMAP 磨清单两条对应行已磨即离队。）

## 交付四件

1. **pre-push hook**（`.githooks/pre-push`）：push 前强制跑全量 `node scripts/verify.mjs`（秒级，实测 ~2s）。
   接线 = `dev/env.sh` 幂等设 `core.hooksPath`（本地 git config 不随 clone 走，靠「一切会话先 source」的
   环境兜底习惯接线——与双 home 同款哲学：靠环境不靠提醒）；bypass = `git push --no-verify`（用后须在
   收尾 Note 说明原因）。
2. **最小 CI**（`.github/workflows/verify.yml`）：干净环境跑 verify（checkout + submodule recursive +
   corepack + `pnpm install --frozen-lockfile` + node 22）。防「本地环境差异」与「--no-verify 绕过」两层
   （DSH：hook 管「忘了跑」，CI owns exhaustive）。⚠ verify **不是零依赖**：`markdown-links.mjs` 复用
   vendor 声明的 mdast 解析器（三级基址解析：vendor 根包 → ui-primitives 成员——见下「CI 首跑」条）。
3. **反证账（19 类门禁全量现场负例）**：逐类引入对应回归 → 看对应 FAIL tag 红 → 还原；19/19 全绿
   （含 gitmodules / vendor-pin / vendor-clean 这类「碰 vendor 才能证」的：submodule HEAD 临时移 HEAD~1
   再回钉、tracked 文件加一字节再 checkout——负例控制是验证门禁会拦，终态根树+vendor 树双零改动）。
   留证一行进 `scripts/verify.mjs` 各门禁段注释（事实紧挨实现，D28）。⚠ 教训一条：`includes()` 是子串
   匹配，负例必须**真破坏子串**（给 URL 加后缀不红，换掉整段才红）。
4. **skill 边界三件套**：13 个 SKILL.md 文末统一补「guidance≠checklist / 命中先读全文再执行 /
   可机械核对部分指向门禁（authorship-audit、deliverables-check）」。**每份加载单元自描述 > 集中一处
   DRY**——skill 按需独立加载，模型命中某份时未必会去读集中的边界文档（DSH 自己也是逐份声明）。
   另：dev-loop §2 补「inspect 是可见性工具，不是授权边界」一句（FAQ 07 四边界核对之「查询≠沙箱」）。

## 输掉的方案

- **lefthook / husky**（DSH 同款是 lefthook）：重依赖 + 须 `pnpm install` 后才接线——fresh clone 未 install
  时 hook 不存在，恰好是 enforcement 通道要防的窗口；env.sh 幂等设置零依赖，且「一切会话先 source」
  已是本仓现成习惯。
- **pre-commit hook**：commit 频率远高于 push；DSH 纪律「hook 不是小号 CI，只装便宜高置信缺陷」——
  verify 全量归 pre-push 一道即最小形状（本仓 verify 本身秒级，无需再分档）。
- **CI 跑 test lane**：需 §7 全量构建链（typert / native / 前端 dist），成本重；verify-only 已覆盖结构面，
  test lane 留触发条件（第二贡献者进场，或「忘跑」成为实际频率）。

## 验证（实际跑过的）

- 负例 19/19 红 → 还原 → 终态 `git status`（根树 + vendor 树）双净 + `pnpm verify` ALL PASS。
- hook 负例实测：AGENTS.md 临时加死链 → `git push` 被 hook 内 verify 拦下（`verify: 1 FAILURE(S)` +
  `error: failed to push some refs`，exit 1，秒级、**未触网络层**）；还原 → push 秒过 hook、推进到
  网络层（挂于 ssh.github.com:443 间歇故障——网络问题非 hook 问题，两态对比恰为 hook 生效证据）。
- `pnpm test` 238/238（1.15s）；`node scripts/preset-smoke.mjs` ALL PASS（5 preset 真挂载 + 各角色只见
  自己的 skills + client 闭包 66 模块无缺失）。
- CI Actions 首跑：**红 → 真因修复 → 绿**（三跑闭环，2026-09-27）：
  ① 首跑（run 36336141531）红 = 我写 workflow 时断言「verify 零依赖」错了——`markdown-links.mjs`
  经 `vendor/dsh/package.json` 解析 mdast 三件套，裸 checkout 无 store 即 MODULE_NOT_FOUND；
  ② 二跑（run 36336516428，补标准引导 install）仍红 = 根因更深一层：根 workspace 刻意**不含
  vendor/dsh 根包**（pnpm-workspace.yaml 只挂其子包），根 install 永远不链 vendor 根包的 devDeps
  ——本地能跑是因 vendor 另有自带 install（`vendor/dsh/node_modules/.pnpm`，1389 包）；
  ③ 终修 = 解析器两级基址（vendor 根包 → `ui-primitives` 子包：声明**同一组**依赖、版本区间与
  vendor 根 pin 逐字一致，root store 单一版本 2.0.3/3.1.0/3.0.0 两边相同）——CI 只跑根 install 靠
  基址②解析；三跑（run 36336928987）**绿，57s**。两次红都是真问题真修；link 门禁负例随 lib 改动
  复验（红→还原→绿）。**教训**：给门禁写「零依赖」这类断言前，grep import 要看全文件（漏了
  createRequire 三行）；「本地能跑」≠「最小环境能跑」。

## 预算与登记

- dev-loop 466→467（带依据：inspect 边界句；记录在 verify.mjs `DOC_LINE_BUDGETS` 注释）。
- AGENTS 命令表 verify 行内追加「push 侧 pre-push hook 强制」；dev-loop §12 push 落点 bullet 补 hook 语义
  （bypass 规则）。
- ROADMAP 磨清单两条（enforcement 通道 / 收尾级补强）已磨即离队；docs/index.md 外部材料表审计行改「已落地」。
- 未动项（有意）：⑨ AGENTS/index 顶格瘦身与提预算 = 用户裁决点；⑩ journal 收敛 = 手册规定只由人做。
