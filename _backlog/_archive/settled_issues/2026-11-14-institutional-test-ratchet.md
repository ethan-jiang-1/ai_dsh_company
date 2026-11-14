---
status: 已结
opened: 2026-11-14
---

# 推敲：测试治理制度棘轮——从“加脚本贴膏药”升级为宪章 × 流程 × 元门禁

> 立卡：2026-11-14 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 8 轮独立只读子代理盲审，末轮（第 8 轮）BLOCKER 0 / SUGGESTION 0；每轮发现与处置的唯一家 = [落地 Note §验证「盲审记录」](../../../notes/implemented/2026-11-14-institutional-test-ratchet.md)
>
> **结论/去向**：note — [2026-11-14-institutional-test-ratchet](../../../notes/implemented/2026-11-14-institutional-test-ratchet.md)

**问题与期望结果：** 首轮归档卡 [2026-11-14-test-asset-leverage](./2026-11-14-test-asset-leverage.md)（按章程已结卡不重开，立本卡承接）虽然准确指出了“上一轮只改了 legibility 没改 leverage、新门禁自己成了 bug 面”，但在落地的 9 个提交里又滑回了“加几个外围脚本 + 搭象征性骨架 + 自查打勾结案”的老路。本卡要从**宪章条款、收尾权力分立、源头元门禁**三层建立不可绕过的制度棘轮，并一次性清掉首轮遗留的 4 个实测活漏洞与探针未分类负债，让后续探索轮在已收口三域（Markdown 形状、门禁读卡/命令解析、公司盘路径与交付闸门）复发率为 **0**，且门禁总数与活跃探针总数进入**只降不升**轨道。

**当前情况：** 二阶实测审计（完整复现与全仓底数见 [二阶深挖材料](../research/test-asset-spiral/2026-11-14-leverage-postmortem-and-institutional-ratchet.md)，题名页 = [test-asset-spiral](../research/test-asset-spiral/README.md)）在干净 `HEAD`（`95d05326`）上证实了 6 处结构性缩水与 4 个当场复现的问题：
1. **核心内部仍藏两套分叉状态机**：`packages/company-pack/src/lib/markdown-shape-core.js` 内 `sectionRange` 与 `scanDocumentDetailed` 对跨行反引号内标题、同行注释后标题结论相反；而 `tests/support/doc-grammar.ts`（仅 38 行固定模板）不生成这些语法，替实现掩盖了分叉。
2. **门禁注释与实现相反**：`checks/gates/fix-evidence.mjs` 注释写“节内只返回结构行，避免围栏里的假字段被读成证据”，代码却裸切原文行——围栏里的示例 `- 改动面：` 当场被误读为真证据；`checks/gates/notes-tree.mjs`、`tools/lib/backlog-liveness.mjs`、`tools/lib/quality-loop.mjs` 等仍保留手写裸解析（尽管 `tools/lib/markdown-links.mjs` 早接通了 `vendor/dsh` 的 `mdast` GFM AST 与 `js-yaml`）。
3. **路径与交付闸门双标**：`packages/company-pack/src/host/commands/prd-gate.ts` 的 `deliverableOf` 按 `sep` 切而 `isDeliverableShaped` 按 `/[\\/]+/` 切——带反斜杠的绝对路径会**静默绕过交付前 PRD 校验**；`packages/company-pack/src/host/run-bundle/company-root.ts` 先词法消解 `kb/link/..` 再 `lstatSync`，跳过了对中间符号链接目录的检查；写面与尾部 `..` 未入矩阵。
4. **收尾制度放水与盘子失真**：`docs/policy.md` §P5 与 `.agents/skills/close-out-definition/SKILL.md` 允许“作者收尾自查”替代独立盲审；P1 核心承诺“4 消费者差分”被一句 `→ 决定：…留后续卡` 塞进 Note `## 未覆盖轴` 销账并通过 `checks/gates/notes-axes.mjs`；`tools/lib/asset-consumers.mjs` 漏算 lane 动态调度，把 20 个自动运行的冒烟误报为“0 消费者”，而 67 个探针仍 **100% 未分类、0 减法**，连原卡亲手点名的 3 处散文数字漂移都未改。

**未决问题：** 无阻塞性未知事实（全仓解析器、75 门禁、67 探针及 `doc-budget` 行数余量均已实测摸清）。唯一需注意的执行约束：门禁总数实行**不净增硬顶（≤ 75）**——新增“禁裸解析”检查须并入既有门禁或通过合并重叠门禁腾出槽位。

**下一步：** 已按 `/goal` 完成 W1→W4；归档判定 = 机械门禁全绿 + 第 8 轮独立盲审 BLOCKER 0，归档（轮次与结论见 Note §验证「盲审记录」）。

---

## 范围与排除项

**做（四块硬切片，不加凑数脚本）：**
- **W1 宪章与流程硬化**：升级 `docs/testing.md`（单原语铁律 + 共享层缺陷必须交独立真值差分/全通道矩阵）、`docs/policy.md`（§P2 门禁与探针封顶 + §P5 非平凡变更废除作者自查、强制独立只读子代理盲审），以及 `.agents/skills/close-out-definition/SKILL.md`、`.agents/skills/gate-change-definition/SKILL.md`、`.agents/skills/agent-note-definition/SKILL.md`、`_backlog/README.md`、`notes/README.md`；
- **W2 单原语垄断与静态禁裸解析**：抽出 `tools/lib/repo-markdown.mjs`（封装 `vendor/dsh` 现成的 `mdast` GFM AST + `js-yaml`，零新依赖），收口 `fix-evidence` / `notes-liveness` / `proposals` / `notes-axes` / `notes-tree` / `release-ready` / `backlog-liveness` / `quality-loop` 的节/头/状态行读取；消除 `markdown-shape-core.js` 内部 `sectionRange` 第二状态机（统一从 `scanDocumentDetailed` 结构行派生）；在结构门禁中加上**禁裸解析规则**（门禁总数保持 **≤ 75**）；
- **W3 真语法生成器 + `mdast` 独立真值差分 + 4 消费者契约 + 路径读写闸门同判据**：重写 `tests/support/doc-grammar.ts` 覆盖全语法轴，以 `mdast` 为独立参考真值校验 `markdown-shape-core`；补齐 `prd-check / requirements-check / prd-gate / 读卡原语` 4 消费者同语料差分；修 `prd-gate.ts` 分隔符绕过与 `company-root.ts` 中间段 `lstat` 顺序/尾部 `..` 边界，建立读写目录闸门同判据矩阵；
- **W4 门禁分支级变异 + `notes-axes` 落盘锚点 + 资产负债棘轮与探针实减**：把 `notes-axes` 收紧为强制四分类前缀 + 校验 `→` 右侧盘上真实锚点（覆盖 `implemented/` 与前向 `archived/`，生效日调至 `2026-11-14` 并修齐前序 Note）；扩充 `tests/checks/gate-mutation.test.mjs` 至核心门禁多分支与 `fix-evidence` 浅克隆跳过分支，并接入 `checks/lanes/generative.e2e.mjs`；修 `tools/lib/asset-consumers.mjs` 自动 lane 口径与 `fast-lane.mjs` / `asset-lanes.mjs` 散文漂移，抽纯 `collaboration-probe-verdict` 判据，合并/归档首批同族重复探针，清零探针 `未分类` 并在 `tests/repo/test-census.spec.ts` 钉死**门禁数与探针数只降不升棘轮** + `keyless-lane.mjs` 零命中防假绿。

**不做（排除项）：**
- 不引入任何外部 npm 新依赖（`mdast` 与 `js-yaml` 直接走 `vendor/dsh` 既有解析链）；
- 不修改公司业务角色（CEO/VP 等）产品功能与 UI 表现；
- 不新增独立门禁文件使 `checks/gates/*.mjs` 总数超过 75（必须先并后加或并入既有门禁）；
- 不对真模型/真浏览器探针做盲目全删（只合并同族重复件、归档一次性历史走查件，常驻件补齐真实失败类）。

**`doc-budget` 硬前置约束（写第一行文档前必守）：**
- `docs/testing.md` 现 69/75 行（5% headroom 红线 = **71 行**）、`docs/policy.md` 现 94/100 行（红线 = **95 行**）、`docs/guides/dev-loop.md` 现 114/120 行（红线 = **114 行**）、`_backlog/README.md` 140/140 行、`notes/README.md` 132/132 行——**全部顶格**。改宪章必须先压简历史案例赘述，把详细操作步骤放进不受行数硬卡的 `.agents/skills/*/SKILL.md`。

---

## 方案与取舍

### 切片顺序（W1 → W2 → W3 → W4）

1. **先改原语与静态禁令（W2），再跑生成器与差分（W3）**：若保留双状态机与裸切片就跑真生成器，只会炸出一堆已知分叉；先把解析入口收成唯一原语并用静态检查锁死“禁手搓正则”，再用 `mdast` 独立真值轰炸。
2. **先立盲审与逃生舱硬规则（W1），再用本卡自身收尾做首验（W4）**：改完制度不能停在纸面；本卡归档前必须真跑一次独立只读子代理盲审，证明新收尾流程能抓实问题。
3. **用“负债上限棘轮”替代“记账列”（W4）**：删掉或收紧纯展示用的空占位心智，直接在 `test-census.spec.ts` 断言：`gateCount <= BASELINE_MAX_GATES`、`probeCount <= BASELINE_MAX_PROBES`（随本次减法下调）、`未分类 === 0`。

### 输掉的方案

- **方案 A：继续新写 3–4 道独立门禁（如单独建 `no-raw-parsing.mjs`、`probe-budget.mjs`、`axe-target.mjs`）** — 输在违背“门禁自身也是 bug 面与维护负债”的结论；规则应并入既有 owner（如 `notes-axes`、`test-census.spec`、既有静态扫描门），保持门禁文件总数不涨反降。
- **方案 B：把 `packages/company-pack` 运行时也改成直接依赖 `mdast`** — 输在扩大发布 tarball 运行时依赖面；pack 保持零依赖 `markdown-shape-core.js`（单状态机），在测试与门禁层拿 `vendor/dsh` 现成的 `mdast` 做独立参考真值差分，兼顾轻量发布与标准真值。
- **方案 C：保留 `close-out-definition` 的“小改动可自查、大改动才盲审”模糊措辞** — 输在模糊边界在收口疲劳期 100% 被解释为“这次算可自查”；必须按客观触发面切死（凡问题卡归档、门禁增改、跨模块收口一律强制独立只读子代理盲审）。
- **方案 D：把 52 个零代码引用探针一次性全删** — 输在其中部分是按需真模型/真浏览器诊断资产（头注写明了触发面）；正确做法是先修对消费者统计口径，合并同族重复簇与一次性走查残留，其余补齐真实失败类并锁死总量上限。

---

## 验收标准

| 行为 / 切片 | 类别 | 输入与前置状态 | 通过信号（独立真值） | 负控（必须亲眼见红） | 证据命令 |
|---|---|---|---|---|---|
| **W1 宪章与 Skill 硬化** | 结构 / 政策 | 修改 `docs/testing.md`、`docs/policy.md`、`_backlog/README.md`、`notes/README.md` 及 3 个完成定义 `SKILL.md` | 单原语铁律、共享层差分完成定义、门禁/探针封顶、强制独立只读子代理盲审、未覆盖轴实盘锚点全部落文，且所有受管文档满足 `doc-budget`（含 `docs/` ≥5% headroom） | 任一 `docs/` 受管文件超 headroom → `doc-budget` 红；还原压简后绿 | `pnpm verify` |
| **W2.1 单原语收口与围栏假字段封堵** | 确定性逻辑 | 含跨行反引号假标题、同行注释标题、CRLF/BOM、`## 修复证据` 围栏内假 `- 改动面：` 的合成卡/Note | `markdown-shape-core.js` 仅留单一扫描状态机；`sectionRange` 与 `scanDocumentDetailed` 零分叉；`fix-evidence` / `notes-liveness` / `proposals` / `notes-tree` / `backlog-liveness` 只读结构行与 `js-yaml` | 在 `## 修复证据` 围栏块内写假字段、正文留空 → `fix-evidence` 判缺字段红；前 12 行围栏内写第二个 `状态：` → `notes-tree` 不误报 | `pnpm test:checks && pnpm test tests/tools/backlog-liveness.spec.ts` |
| **W2.2 禁裸解析静态守卫** | 结构门禁 | 在 `checks/gates/` 或 `tools/lib/` 非注册原语文件中植入裸 frontmatter 正则 `/^---\r?\n/` 或裸节切分 `/^##\s+/` | 干净树 `pnpm verify` 全绿，且 `checks/gates/*.mjs` 文件总数 **≤ 75** | 临时在任一门禁植入裸节切分正则 → 门禁点名文件与行号判红；移除后绿 | `pnpm verify` |
| **W3.1 真语法生成器 + `mdast` 独立真值差分** | 确定性逻辑（Property / Differential） | `doc-grammar.ts` 随机组合生成 ≥500 份含 BOM、孤立 `\r`、3/4 反引号与波浪嵌套围栏、未闭合围栏、跨行多反引号 span、HTML 注释、转义表格的文档 | `markdown-shape-core` 的结构标题行、顶层围栏块载荷、表格单元格切分与 `mdast` GFM AST 参考投影一致（已声明策略项除外），且能重放 BUG-152/165/168/172/176/181 | 注释掉 `markdown-shape-core` 的跨行 span、转义反斜杠或长围栏闭合判据任一处 → 生成器差分在 500 例内抓红并打印最小 seed | `pnpm test tests/lib/markdown-shape.property.spec.ts tests/host/contract/structure-agreement.spec.ts` |
| **W3.2 4 消费者跨层契约差分** | 确定性逻辑 / 编排 | 同一批生成/变异的交付物语料（含合法与坏编号/坏账本/坏路径形态） | `prd-check`、`requirements-check`、`prd-gate`、门禁读卡原语对结构有效性与拒绝方向一致 | 让 `prd-gate` 漏掉某类坏 `numbering` 或混合分隔符路径 → 4 消费者契约测试红 | `pnpm test tests/host/contract/` |
| **W3.3 路径读写目录闸门全通道矩阵** | 确定性逻辑 | 路径矩阵含 `.`、`..`、`kb/..`、`kb/../..`、`kb/symlink/../x`、`./a`、`kb//a`、`..\outside`、`a/../../outside` 及混合分隔符 `deliverables` 路径 | `readCompanyFileAt`、`companyFileProblem*`、`writeCompanyAtomic*`、`createCompanyDir` 与 `prd-gate` 同判据拒绝越界与中间段 symlink；`<ws>/.dsh-company\deliverables\bad\prd.md` 被 `prd-gate` 拦截而非静默放行 | 还原 `prd-gate.ts` 的 `split(sep)` 或 `company-root.ts` 跳过中间 symlink `lstat` → 矩阵红 | `pnpm test tests/host/contract/file-shape-agreement.spec.ts` |
| **W4.1 `notes-axes` 实盘锚点 + 门禁分支级变异** | 门禁元测试 | 新 Note `## 未覆盖轴` 写无真实路径的 `→ 决定：留后续卡`；对 6 个高风险门禁的核心拒绝分支（含命令解析、改动面对账、浅克隆跳过、实盘锚点）逐条变异 | `notes-axes` 强制分类前缀 + 校验右侧路径/锚点真实存在（扫 `implemented/` 与前向 `archived/`）；`gate-mutation.test.mjs` 全部分支变异均使对应坏夹具漏过（证明夹具真踩在该规则上），且纳入 `generative.e2e.mjs` | 植入 `- 某轴 → 留后续卡` → `notes-axes` 红；删任一被测门禁分支或变异锚点 → `pnpm test:checks` 红 | `pnpm test:checks && node checks/lanes/generative.e2e.mjs` |
| **W4.2 资产负债棘轮 + 探针实减 + 零命中防假绿** | 结构 / 盘子 | 修 `asset-consumers` 自动 lane 口径、修散文漂移、抽纯 `collaboration-oracle` / `team-concurrency` 判据（`tools/lib/{collaboration-oracle,team-concurrency}-verdict.mjs`；其余四探针的受控切片见 Note `## 未覆盖轴`）、合并/归档同族重复探针、补齐剩余探针 `failureClass` | `CENSUS.generated.md` 与盘面一致：`未分类` = **0**，探针总数实质下降（净减 ≥6 个重复/历史走查件），门禁数 ≤ 75，`test-census.spec.ts` 锁死门禁/探针上限棘轮；`keyless-lane.mjs --filter zz-none` 选 0 件返回非零退出码 | 临时把某探针改回 `未分类`、新增未减额探针、或跑 `--filter zz-none` → 对应断言红 / exit ≠ 0 | `pnpm test tests/repo/test-census.spec.ts tests/tools/asset-consumers.spec.ts && pnpm typecheck` |
| **收尾盲审首验** | 流程治理 | W1–W4 全部提交就绪后，拉起无历史上下文的只读 `research` 子代理盲审（输入集 = policy §P5：当前 diff + 四样判据，清单不复述） | 盲审逐条核验无缩水、无逃生舱卸责、blocker = 0，结论记入归档状态行与实现 Note | 若盲审指出任何缩水或伪守卫 → 回退修补重审，不许直接翻 `已结` | `pnpm verify && pnpm test && pnpm test:checks && pnpm typecheck && pnpm lint && pnpm dup` |

---

## 事实与读者

- **事实（新增/修改）**：本仓测试与门禁的**原语唯一性、证明等级下限、验收分权规则、治理资产总量上限**（不含业务产品状态）。
- **唯一入口**：
  - 宪章与流程：`docs/testing.md`、`docs/policy.md`、`.agents/skills/{close-out-definition,gate-change-definition,agent-note-definition}/SKILL.md`；
  - 解析与路径原语：`packages/company-pack/src/lib/markdown-shape-core.js`、`tools/lib/repo-markdown.mjs`、`packages/company-pack/src/host/run-bundle/company-root.ts`；
  - 棘轮与元测试：`checks/gates/notes-axes.mjs`、`tests/checks/gate-mutation.test.mjs`、`tools/lib/{asset-lanes,asset-consumers,test-census}.mjs`、`tests/repo/test-census.spec.ts`。
- **读载体 / 写载体**：后续所有开发会话 agent、独立盲审子代理、`pnpm verify`、pre-push hook、weekly `generative` lane。
- **环境坏法**：
  - **内容**：新门禁/工具绕过原语手写正则；注释承诺与切片代码不一致；`## 未覆盖轴` 写空头支票；
  - **根 / 叶**：混合路径分隔符 `\` 与 `/`、尾部 `..`、中间段符号链接目录 + `..` 消解；浅克隆/无 git 静默跳过；
  - **生命周期**：探针与门禁只增不减、Note 迁 `archived/` 后逃出检查、`keyless-lane` 过滤 0 件假绿。

---

## 关闭条件

1. W1–W4 全部验收行实跑通过，且每条新增/收紧守卫均按 `prove-it-red` 亲眼见过红再还原绿；
2. 独立只读子代理对抗盲审完成且 blocker 清零，盲审摘要写入状态行 `审查：agent — …` 与落地 Note；
3. 落地 Note 写入 `notes/implemented/`，本卡补齐真实 `## 落地证据`、更新 `test-asset-spiral` 研究题归档状态，同变更归档至 `_backlog/_archive/settled_issues/`。

## 落地证据

- 改了哪些系统面（路径）：`docs/{testing,policy}.md`、`_backlog/README.md`、`notes/README.md`、`.agents/skills/{close-out,gate-change,agent-note}-definition/SKILL.md`；`packages/company-pack/src/lib/{markdown-shape-core.js,prd-check.ts,requirements-check.ts}`、`packages/company-pack/src/host/commands/prd-gate.ts`；`tools/lib/{repo-markdown,backlog-liveness,notes-audit,bug-coverage,asset-consumers,candidate-scan,collaboration-oracle-verdict,team-concurrency-verdict}.mjs`；`checks/gates/{company-root-carriers,notes-axes,base-clean}.mjs`、`checks/lanes/generative.e2e.mjs`；`tests/support/doc-grammar.ts`、`tests/lib/markdown-shape.property.spec.ts`、`tests/host/contract/`、`tests/checks/{gate-mutation,company-root-carriers,notes-axes}.test.mjs`、`tests/repo/test-census.spec.ts`、`probes/`（67→59）。
- 提交：`dc7ddb05`（立卡）→ `8bbfb0c5`（W1）→ `a4b6a7db`（W2）→ `4b463116`（W3）→ `789b39fb`（W4）→ `ee93d85f`（首轮盲审整改）→ `817340db`（次轮盲审整改）→ `a1dc14a6`（三轮建议收口）→ `a5ab852f`（归档前覆盖棘轮回补）→ `82831fc1`（归档前盲审整改：工具盘路径登记门 + 注释对齐）→ `10b29105`（末轮复审建议：host/工具盘统一 AST 写调用 + 路径实参判据）。
- 实跑命令与结果：`pnpm verify` ALL PASS（`company-root-carriers ×52`：写面文件 7 / knownGap 0 / 禁裸解析 ×137 / 工具盘入口 2；`gate-wiring ×75`）；`pnpm test` 244 files / 2093 tests；`pnpm test:checks` 10 PASS / 0 FAIL；`node checks/lanes/generative.e2e.mjs` 14/14 PASS；`pnpm smoke:fast` ALL PASS（4 条）；`pnpm typecheck` / `lint` / `dup` 绿（0 clones）；`pnpm coverage:ratchet` PASS（197 文件；`notes-audit` 分支 86.79% → 88.46% 并 `--update` 落基线）；`pnpm notes:audit` 状态行不符 0。
- 负控：每切片 prove-it-red 记录见 [落地 Note §验证](../../../notes/implemented/2026-11-14-institutional-test-ratchet.md)。
- 盲审：8 轮独立只读子代理；每轮 BLOCKER/建议数见 Note §验证「盲审记录」；第 8 轮（末轮）BLOCKER 0 / SUGGESTION 0。

## 抽象度

- 换公司要改吗？→ **不会**；这是维护本仓代码的研发宪章、门禁与测试资产工程，与虚拟公司业务设定无关。
- 换产品类型要改吗？→ **不会**；不涉及软硬件或服务交付模式。
- 换做法要改吗？→ **部分会**：若未来替换 `vitest` 或迁移 `_backlog`/`notes` 目录制度，具体门禁实现随之调整；但“横切语义单原语、独立参考真值差分、验收盲审分权、治理负债封顶”四条原则不变。
- 只有机制本身变才改吗？→ **是**。
- 第二消费者：后续每一次修 bug、加门禁、做探索测试与收尾盲审的开发会话 agent。
- 搬家成本：低；原则住 `docs/{testing,policy}.md`，步骤住 `.agents/skills/`，机械判据住 `checks/` 与 `tests/`，与产品发布载荷解耦（仅 `markdown-shape-core.js` / `company-root.ts` / `prd-gate.ts` 缺陷修复随 pack 发布）。
