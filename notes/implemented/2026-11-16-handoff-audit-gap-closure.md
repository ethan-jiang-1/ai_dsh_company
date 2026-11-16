状态：implemented（2026-11-16；触发 = 用户点名「接手成本评估」全量评估 → 补齐 GAP 目标全绿；非 _backlog 卡毕业）

# 接手成本审计 GAP 收口：prompt 字节账本、patch 行依赖门、死 lane 复活与文档对不齐

> 上游 = 评估协议（十三维 / 五级证据 / 判色），本轮先**评完再补**：L1 十三维矩阵出 GAP 清单后逐项弥补，
> 每笔都以「红→还原→绿」或「实跑绿」取证。评估结论与矩阵在会话报告，本 Note 只记**落地物与判据**。

## 决定

1. **G8-1 并入既有 owner 门，不新建门**：[preset-row-deps](../../checks/gates/preset-row-deps.mjs) 从「presets 行」扩到
   「bundle [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 的 **insert 行**（含 group 嵌套）」。
   判据 = 行内 `@deepseek-ai/*` 包名 ⊆ pack `dependencies ∪ peerDependencies`；**replace 行豁免**（它替换 base/web-app
   已有行，包由上游提供——如按产品决定 disabled 的 `ui-trajectory`/`ui-sidebar-terminal` 不在本包 peers，是有意）；
   `disabled` 行豁免。为什么：insert 行装不上时 host 共享面静默 broken（影响全会话），此前只有 release-smoke 兜底。
2. **`!!js` 加载器住 YAML 原语，不住门禁**：[repo-markdown](../../tools/lib/core/repo-markdown.mjs) 增 `loadCordisYaml`
   （CORE_SCHEMA + `tag:yaml.org,2002:js` scalar）与 `flattenCordisRows`（insert/group config/preset plugins 三处展平）。
   两门禁共用同一加载器；门禁内不再手写 schema 扩展（`!!js` 是 DSH 组合方言，两处手写必漂）。
   js-yaml 只解析一次（原两个加载器各带一份 fallback 循环）；**不保留永不可达的「友好错误」throw**——
   覆盖率棘轮当场拦下过一次（见验证表），死语句只会永久压低覆盖。
3. **dim6 常驻上下文补字节账本，并入注入面预算 owner**：[handbook-budget](../../checks/gates/handbook-budget.mjs) 增两轴
   `persona-budget`（每 preset `config.prefix` 字节 ≤ 5120，实测最大 ceo 4612B）与 `skill-catalog-budget`
   （每 preset 可达 skills 根的 SKILL.md frontmatter `name`+`description` 字节 ≤ 2304，实测最大 vp-eng 2082B）。
   判据值 = 实测最大 +10% 取整（棘轮只降不升）；SKILL.md frontmatter 走 [parseFrontmatter](../../tools/lib/core/repo-markdown.mjs)，
   不手搓 `---` 正则。
4. **dim5 端口字面量退役**：`3080 是本 GUI` 在 5 处活跃面（[bootstrap](../../docs/guides/bootstrap.md)、
   [budget-and-ops](../../docs/guides/budget-and-ops.md)、[dev-product-parity](../../docs/guides/dev-product-parity.md)、
   [demo-scenes](../../docs/guides/demo-scenes.md)、[web-window-ops](../../.agents/skills/web-window-ops/SKILL.md)）改为
   「日用 GUI 永不动 / 端口是环境状态」，判据单家 = [multi-human-runbook §2](../../docs/guides/multi-human-runbook.md)（实测 3080/3081/3082 都可能是别人的）。
   决定本身（`--port 0` 安全默认）已在 [handoff-hygiene Note](2026-11-11-handoff-hygiene.md)，本笔只删复述。
5. **dead evidence lane 复活**：[permissions-recovery lane](../../checks/lanes/permissions-recovery.entry.mjs) 两处修真身——
   ① `DSH_COMPANY_HOME` 目录不存在时 host 按设计停写（无 workspace 零写，2026-11-03），lane 必须先 `mkdirSync(WS)`；
   ② 公司状态家迁 `.dsh-company/` 后本 lane 仍写旧布局 `WS/kb`，改消费
   [RUN_BUNDLE_PATHS](../../packages/company-pack/src/lib/shared/run-bundle-paths.ts)。此前这条「发布前手动」lane 恒红无人跑。
6. **文档对不齐机械修**：[snapshots/README](../../snapshots/README.md) 死 flag（`--golden`/`--refresh-golden` →
   脚本实认 `--expected`/`--refresh-expected`）+ 页签死计数改指门禁输出；[tests/README](../../tests/README.md) layering
   守卫措辞对齐真实判据（`spawn(`/`fetch(` 调用点**不**机械扫，防夹具误伤）；`fixture-provenance` 措辞改「spec 守卫」。

## 输掉的方案

- **command-refs 扩扫 notes/（G8-2 的原始动议）**：实测扩扫 1343 处命令得 27 命中，**全部**为历史叙述（`pnpm standalone`）、
  负例原文（改坏成 `pnpm bundle-init` → 红的证据）或 `pnpm vitest` 这类合法二进制快捷，真 stale 为零。
  扩扫只会逼出「历史/负例」豁免仪式（低频低爆），违反「可机械判断的才进 gate」；改为在
  [command-refs](../../checks/gates/command-refs.mjs) 头注写明边界（notes 的路径类引用由 bare-path 守）。否。
- **新建独立 persona-budget gate 文件**：gates/ 总量只降不升 + 注入面预算是 handbook-budget 的既有 owner。否。
- **把 5120/2304 写成一次性快照不设棘轮**：无预算的常驻文本只加不减（dim6 的 GAP 本体）。否。
- **给 isolation-matrix 的 3→5 个 FAIL 立缺陷卡**：solo 复跑（暖 corepack 缓存）ALL PASS，失败形态每次不同且伴随
  corepack 并发下载同一 pnpm 二进制——环境竞态，非仓缺陷。记 [environment-gap] 不立卡。否。
- **把 `snapshots/README` 的 9 改 10**：计数写死当天即过期（本仓 nav-count-claims 同日已改公式）。改为指门禁输出。否。

## 状态事实与载体

- **事实**：① bundle insert 行的插件必须在 pack 依赖声明里；② 会话常驻面（手册/persona/skills 目录）各有字节预算；
  ③ 端口是环境状态、判据单家；④ 失效证据 lane 必须能跑（不是「一直红」）。
- **唯一入口**：patch 行依赖 = [preset-row-deps.mjs](../../checks/gates/preset-row-deps.mjs)；字节账本 =
  [handbook-budget.mjs](../../checks/gates/handbook-budget.mjs)；lane 路径 = [RUN_BUNDLE_PATHS](../../packages/company-pack/src/lib/shared/run-bundle-paths.ts)。
- **读载体**：`pnpm verify`（三门前述 + gate-wiring ×75）；`pnpm test:checks`（gates-negative conformance）；
  `node checks/lanes/permissions-recovery.entry.mjs`（~1.5min）。
- **写载体**：门内常量 `PERSONA_MAX_BYTES`/`CATALOG_MAX_BYTES`；`loadCordisYaml`/`flattenCordisRows`（原语）。

## 未覆盖轴

- [covered] patch insert 行缺依赖 → 红点名行 id；还原 → 绿 → `checks/gates/preset-row-deps.mjs`
- [covered] persona 超预算 → 红点名 preset；还原 → 绿 → `checks/gates/handbook-budget.mjs`
- [covered] 原语新增导出不破坏既有解析 → `tests/tools/repo-markdown.spec.ts`
- [covered] 门禁装配/头注/接线 → `tests/checks/gates-negative.test.mjs`
- [environment-gap] isolation-matrix 冷 corepack 并发下载时 mutating install 偶发失败（solo 暖缓存 ALL PASS）→ `checks/lanes/isolation-matrix.entry.mjs`
- [environment-gap] Linux 全量构建缺口（CI 全量仅 macOS runner）→ `.github/workflows/fresh-clone.yml`
- [unprovable] 公司行为会话级回放网在部署仓（本仓 replay 两门 SKIP 已登记）→ `docs/testing.md`
- [policy] 真装/首屏/卸载/升级定论归 release-gated 认证档 → `docs/contracts/release.md`

## 验证

| 层 | 失败类（[词表](../../tests/failure-classes.md)） | 负控（见过红） |
|---|---|---|
| 静态门 preset-row-deps/patch-dep | #10 配置/profile/组合 | 追加 insert 行 `@deepseek-ai/dsh-nonexistent-probe` → `FAIL patch-dep: cordis.patch.yml insert 行 probe-undeclared-row 引用 … 没有 @deepseek-ai/dsh-nonexistent-probe（安装后 host 共享面解析不到 → broken）`；还原 → `PASS preset-row-deps ×29 + patch-insert ×6` |
| 静态门 persona-budget | #12 文档/生成物/指针 | ceo prefix 追加 600B → `FAIL persona-budget: 常驻 persona 超预算…：ceo 5212B > 5120B`；还原 → `PASS persona-budget 常驻 persona 最大 4612B（ceo）≤ 5120B` |
| 静态门 skill-catalog-budget | #12 | 实测尺 `PASS skill-catalog-budget 常驻目录最大 2082B（vp-eng）≤ 2304B`（红侧与 persona 同构：超限点名 preset） |
| 原语/一致性 | #1 结构/回归 | `pnpm test tests/tools/repo-markdown.spec.ts` 6 passed；`pnpm test:checks` 10 PASS / 0 FAIL |
| 覆盖率棘轮（pre-push 门） | #1 结构/回归 | 扩 `repo-markdown` 后实红：`coverage-ratchet FAIL [regressed] tools/lib/core/repo-markdown.mjs — branches 76.42% < 基线 87.7%`；补原语 spec + 合并为单次解析后，仍 `statements 98.19% < 98.65%`（未覆盖行 = 不可达 throw）；删死分支 → `coverage-ratchet: PASS（197 文件；基线 2026-11-14；豁免 5 条）` |
| 死 lane 复活 | #4 落点/生命周期 | 修前 `ENOENT … company-workspace/kb/company.md`（恒红）；改为 RUN_BUNDLE_PATHS 后 `permissions-recovery-smoke: ALL PASS`（只读 workspace 可建会话/不破坏 company.md；缺 kb/ceo 补建；坏 catalog 重建 schema 1） |
| 隔离矩阵 | #4 | 冷缓存并发时 3→5 FAIL（形态每次不同 + corepack 并发下载）；暖缓存 solo `isolation-matrix-smoke: ALL PASS` |
| 暖树全量 | #12 / #1 | `pnpm verify` ALL PASS；`pnpm test` 253 文件 / 2155 用例绿；`pnpm typecheck` exit 0；`pnpm smoke:fast` 4 条绿 |
| clean clone 承重 | #8 子进程/独立 home | `/tmp` 全新 clone @9fb55170：install 33s → bundle:init → `pnpm setup` 全量构建 → `setup --check` 齐全 → `verify` ALL PASS（3 门登记 skip）→ `test` 253 文件 2152 绿 + 3 登记 skip → `typecheck` exit 0 |
| 真挂载/首屏/真装 | #10 / #9 / #8 | `preset-smoke` 11/11 挂载 + 并发不串 + skills 硬隔离 + client 闭包 70/0；`client-load-smoke` 零挂载失败/零 loader 错/品牌槽在场；`release-smoke --tarball` 干净 profile 真装→boot→首启 46 件→二次 boot 零变更→卸载 bundles 摘净且数据字节不变→重装不覆盖 |
| 升级/恢复 | #4 / #10 | `upgrade-while-running` 0.11.8→0.11.9 运行中 remove/add、旧会话与数据保留 → ALL PASS；`revoke-recovery` 回滚/补完两态 → ALL PASS |

运行态观察（非材料，不立卡）：`preset-smoke` 一条 WARN「非本包模块 inject 引用未知包名：`@deepseek-ai/dsh-client-ui-attachment`
→ `@deepseek-ai/dsh-client-ui-trajectory`」——上游 ui-attachment 的 inject 指向本包按产品决定 disabled 的 ui-trajectory 行；
非本包配置、非失败，留作升 pin 核对（同 [nav-count 轮](2026-11-16-nav-count-doc-class.md)观察）。
