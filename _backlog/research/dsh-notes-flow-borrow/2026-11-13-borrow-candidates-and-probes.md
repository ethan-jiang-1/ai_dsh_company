---
topic: dsh-notes-flow-borrow
intent: 把材料一的判定落成可裁决的候选（借/不借/触发），并用四组实测给出每条主张的原话证据，供用户逐条决定是否开卡。
---

# 候选清单与四组实测

> **本轮只产出研究文档，不是落地。** 系统里没有新增门禁、没有改 `notes/` 任何规则文件、没有新增
> AGENTS.md——按 [_backlog/AGENTS.md](../../AGENTS.md)「落地 = 系统里出现可验证的变更」，本页与
> 材料一都是立项/交接材料。开卡与实施要另起一轮、由用户点名。
>
> **硬前提：位置不动。** `notes/` 留在仓根（用户 2026-11-13 两次确认）。下面每一条 B 都**在现位置**
> 实施：新门禁以 `notes/` 为根、新 `AGENTS.md` 落在 `notes/implemented/` 与 `notes/archived/` 里。
> digest 的 `.agents/notes/` 只是权威原文地址，不是目标布局；「为对齐借源而搬 `notes/`」不在候选内。

## 一、借（B1–B11）

成本列是「一次改动」的粗估，不含回归；「验收提示」= 实施时可以直接抄进 `## 验收标准` 的判据。

| ID | 借什么 | 为什么现在 | 成本 | 建议 |
|---|---|---|---|---|
| **B1** | **`notes/` 树形门禁**（根 = 仓根 `notes/`，不引入 `.agents/` 前缀）：深度 1 闭集 `{proposed,implemented,rejected,archived}`；深度 2 只许文件（`YYYY-MM-DD-<slug>.md` 或 `README.md`），`archived/receipts/` 是唯一允许的子目录；任何深度 3 文件、任何未登记目录、任何 `INDEX.md`、任何无日期文件名一律红；根 allowlist = `README.md` / `AGENTS.md` | E1 实测：五种不可能形状下 `verify` 全绿。DSH 三条 `structure:` 报错防的就是这个 | ~50 行 + 夹具，半日 | **做**（P0） |
| **B2** | **每个生命周期目录一份 `AGENTS.md`**（先 `notes/implemented/` 与 `notes/archived/`）：各 ≤10 行，只写一条义务或一条禁令 + 指回本目录 README | E2 实测：按目录自动注入的只有 `AGENTS.md`；军规住在 `README.md` = 动手时读不到 | 2 个新文件 + 2 条 doc-budget 行，半小时 | **做**（P0） |
| **B3** | **状态行收紧**：`状态：` 全文件唯一；值必须与所在目录一致（`archived/` 前向生效，存量豁免） | 今天没漂移（`statusMismatch` = 空），但全靠人守；DSH 这三条都是红灯 | ~10 行（可并入 B1 同一门） | **做**（P0） |
| **B4** | **骨架门禁补两节**：`## 输掉的方案`、`## 验证`（按文件名日期前向生效） | 77/77 与 66/77 的差额就是漂移量；DSH 为 alternatives 单独上了门禁 | ~8 行 | 做（P1） |
| **B5** | **冻结层链接容忍度单一化**：`archived→冻结层` 的链接保持零容忍，`archived→活层` 的链接交给 `link-debt` 天花板（见下节取舍） | 同一层今天两套容忍度：`.md` 零容忍（`notes-archived-links`）、非 `.md` 容忍到 4（`link-debt`） | 改一个门 + 基线，半日 | **做**（P1，需先拍板） |
| **B6** | **作废 RFC 的终局**：写死「已批 RFC 不做了 → 卡写 `不做` + 理由（用户点头），RFC 同 diff 删除，历史归 git；`proposed/` 不设作废态」 | 今天被放弃的已批 RFC 既不会毕业也不会红，会烂在 `proposed/` | 一句规则（§一/§二） | 做（P1） |
| **B7** | **忘记判据的两件**：① keep 清单补齐（备选 / 所有权边界 / 负向保证 / durable 或 wire 语义 / 安全规则 / 重新引入条件，不止「否决」）；② 成对校准样例（字数与判定方向相反，从 git 历史收割，不编造） | 今天只有一句「剩余否决仍能阻止重开」，没法复算上一次归档 | 文档 ~15 行 | 做（P2） |
| **B8** | **删除的负向完整性**：只有能力从代码/配置/schema/持久化或 wire 格式/迁移/兼容行为/文档全部消失，才可被后续 Note 吸收删除；部分移除 = 部分取代，两篇并存互链 | 本仓有退役功能（standalone、roadmap、intents）可作样本 | 一句（§二 取代检查） | 做（P2） |
| **B9** | **§四 偏差登记补五行**（状态行载日期、无双语三件套、`receipts/` 第二层、`rejected/` 语义、日期未写死） | 借源账本不全 = 未借的那半会被忘掉（材料一末节） | 文档 ~8 行 | 做（P2） |
| **B10** | **动词命名（仅前向）**：新 Note 文件名写成决定/行为，不写主题名词 | grep 结果自解释；零门禁零成本 | 0 | 可选（口味题，不改存量） |
| **B11** | **日期语义一句**：文件名日期 = 主题首写日；归档用 `git mv`、不改名 | 防「归档顺手改名」破时间轴 | 一句（§一 命名） | 做（P2） |

### B5 的三个取舍（需要拍板，不是技术细节）

| 选项 | 做法 | 代价 |
|---|---|---|
| (a) 全折叠 | 删 `notes-archived-links`，归档层死链全进 `link-debt` 天花板 | 信号从「红」降为「数字」，配额内不刺眼 |
| (b) 保持零容忍 + 登记例外 | 冻结层唯一允许的编辑 = 目标移动后的**一行链接改写**，同 diff 记档 | 冻结破了口子，且「只改了一行」无法机器证明（正是 DSH 缺口三） |
| **(c) 按目标分层（建议）** | 冻结→冻结 零容忍（两边都不动，断链 = 移动出错）；冻结→活层 计入天花板 | 要判目标属于哪层（`link-debt` 已有同款 `classify`），两个门各管一条规则 |

选 (c) 的理由：**只有「两端都不动」的链接才配零容忍**。冻结层指向活层的链接，天生会随活层演进过期；
DSH 的答案是干脆不查（digest `08` 第二节），我们比它细一档，用天花板兜。附加选项：解析失败时按
basename 在 `notes/` 下回退一次（`implemented/X.md` → `archived/X.md`），能免掉最常见的「目标归档」红。

### B1 的判据形状（可直接抄）

- 深度 1 只认四个名字；多一个 = `未知生命周期目录`（点名路径）。
- 深度 2 在 `proposed|implemented|rejected` 下只许文件；`archived/` 下额外许 `receipts/` 一个目录。
- 深度 2 文件名 = `YYYY-MM-DD-<slug>.md` 或 `README.md`；其余（含无日期）红。
- 深度 3 只许 `archived/receipts/YYYY-MM-DD-<slug>.md` 与 `receipts/README.md`。
- 任何 `INDEX.md` = 红（理由 = D34 与 vendor no-index 教义）。
- **负例就是 E1 的四组形状**；红→删→绿三步留证（`gate-change-definition` 的完成定义）。

## 二、不借（N1–N5）

| ID | 不借什么 | 理由 | 重开触发 |
|---|---|---|---|
| **N1** | `{lifecycle}/{class}/` 孙目录 | 第二套分类轴要人同步闭集（DSH 自己承认两份副本）；77 篇还没到 browse 失效；两次否决记录在案 | `implemented/` 越过约 120–150 篇，且「按主题 grep 仍找不到」成为常态 |
| **N2** | 哈希封印（`manifest.json` + sidecar + 具名例外） | 单维护者 + git 即封印；已登记为不借 | 第二贡献者或 PR 面出现 |
| **N3** | `pre-commit` 钩子 | hook 头注已写明成本边界：只装便宜高置信缺陷；pre-push 跑全量 | 「提交后才发现」的记录累计 ≥2 次 |
| **N4** | 双语三件套 / `translation-pairing` | 本仓中文单语，没有配对契约 | 出现第二语言读者或对外发布要求 |
| **N5** | 「该写 Note 没写」的存在性门禁 | DSH 也没有；语义判断不能机械判；本仓用「机械单步豁免 + 事后归档」替代（§二） | 有人真的靠「不写 Note」逃过审查，且有实例 |

**N1 的替代压力阀**：`implemented/` 真要按主题找，本仓的原生答案是
[decisions.md](../../../docs/reference/decisions.md) 的 D 号路由表（手工、有预算、有门禁），
不是 `INDEX.md`（D34 已退役一份）。若路由表也撑不住，再谈 class 轴。

## 三、四组实测（E1–E4）

全部在 2026-11-13 的工作树上真跑，跑完逐项还原；每组都写了「推翻它需要什么」。

### E1 · 五种不可能形状，`verify` 全绿

第一跑植入四种（未登记生命周期目录 / 未登记二级目录 / notes 根散件 / 错误深度）：

```sh
mkdir -p notes/implemented/zz-depth-probe notes/zz-unknown-lifecycle notes/archived/zz-unknown-kind
printf '# hidden\n\nno status line, no decision section\n' > notes/implemented/zz-depth-probe/2026-11-13-hidden.md
printf '# root stray\n' > notes/2026-11-13-root-stray.md
printf '# unknown lifecycle\n' > notes/zz-unknown-lifecycle/2026-11-13-x.md
printf '# unknown kind\n' > notes/archived/zz-unknown-kind/2026-11-13-y.md
node checks/run-gates.mjs
# → EXIT=0
#   PASS notes-liveness ×77（状态行；…）
#   PASS notes-supersession ×77 篇（取代均有回链）
#   PASS notes-archived-links ×231（归档层 markdown 链接全部在场）
#   verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）
```

第二跑是**无日期文件名**（最隐蔽的一种，位置完全合法）：

```sh
printf '# no date\n\nno status line\n' > notes/implemented/zz-nodate-probe.md
node checks/run-gates.mjs
# → EXIT=0；PASS notes-liveness ×77；verify: ALL PASS
```

机理：`notes-liveness` / `notes-supersession` 平铺读目录 + 按文件名日期过滤
（[notes-liveness.mjs:31-46](../../../checks/gates/notes-liveness.mjs)），**过滤掉的东西没有人补一句**；
`notes-archived-links` 递归走，但只判链接存在性、不判形状（它把 `zz-unknown-kind` 里的文件也扫了，
只是那文件没链接）。还原后基线 `notes-archived-links ×230`、`ALL PASS`。

**可证伪**：若任一 notes 门禁改成递归走查并对未知形状报错，这一组立即转红，本节作废。

### E2 · 只有 `AGENTS.md` 会按目录自动注入，`README.md` 不会

```sh
PROBE=notes/rejected; printf '# PROBE-MARKER-7f3a\n' > $PROBE/AGENTS.md
# 然后用 read 工具读 $PROBE/README.md
```

收到平台注入（原话，路径部分以 `<探针目录>` 代其字面量）：

```text
Additional instructions from: <探针目录>/AGENTS.md
These instructions apply to work under `notes/rejected`. …
# PROBE-MARKER-7f3a
```

删掉探针后立刻收到 `Instructions removed: …/AGENTS.md`。**对照跑**（同工具、同深度、同读法）：
用 read 工具读 `notes/implemented/README.md`（该目录没有 `AGENTS.md`）→ **零注入**；紧接着读
`notes/rejected/README.md`（目录里有刚建的 `AGENTS.md`）→ 注入。唯一变量就是那份 `AGENTS.md`。
唯一被注入的根文件是 `notes/AGENTS.md`（祖先目录）。机制侧同证：候选文件名默认集 =
`AGENTS.md` / `CLAUDE.md`（vendor `packages/context/agent-instructions/src/config.ts`），
`README.md` 不在其中。

**可证伪**：若平台开始注入 `README.md`，或 `notes/implemented/README.md` 在某次编辑时被注入，本节作废。

### E3 · 冻结层的出站链接：两套容忍度、一批定时炸弹

```sh
# 归档 → implemented（会随基线归档动作移动的目标）
grep -rl "](../implemented/" notes/archived/*.md | wc -l          # 18 篇
grep -rho "](../implemented/[^)]*\.md)" notes/archived/*.md | sort -u | wc -l   # 11 个不同目标
# 归档 → 其余归属
grep -rhoE "\]\(([^)]+\.md)" notes/archived/*.md | …               # _backlog 224 / docs 106 / …
grep -rho "](\.\./\.\./_backlog/\(issues\|bugs\)/" notes/archived/*.md | wc -l   # 0（好习惯：只链归档卡）
# 冻结层现存死链（天花板）
pnpm verify → PASS link-debt（archived 4 / moved 0 / live 0；基线 4/0/0）
```

那 4 条全部是 `notes/archived/` 指向**已删文件**的非 `.md` 链接——出处 =
[2026-10-25-standalone-deployment](../../../notes/archived/2026-10-25-standalone-deployment.md)（三条）与
[2026-10-25-distribution-lifecycle](../../../notes/archived/2026-10-25-distribution-lifecycle.md)（一条），
目标是两个已退役的 lane 脚本、一个已退役的 standalone 工具、一个旧版 client 视图组件。也就是说
「冻结层的链接必须永远有效」这句**今天已经不成立**，只是不成立的部分恰好不被
`notes-archived-links` 扫（它只扫 `.md`，[gate:37-40](../../../checks/gates/notes-archived-links.mjs)）。

同时 0 条指向 `_backlog/issues` 与 `_backlog/bugs`（移动池）——说明「归档只链归档卡」是事实上的
好习惯，但没人写下来。

**可证伪**：若 `notes-archived-links` 扩成扫全部链接、或 `link-debt` 的 `archived` 基线降到 0，
本节的「两套容忍度」判断作废。

### E4 · 合规读数与机械审计基线

| 读数 | 值 | 读法 |
|---|---|---|
| `implemented/` 篇数 | 77（+ README） | 未到 browse 失效量级（DSH 在 180 才承认失效） |
| `archived/` 篇数 | 197（+ README + `receipts/` 31 + 2 个 pin-review JSON） | 只 grep 不 browse，符合定义 |
| `proposed/` / `rejected/` | 3 / 0 | 拒绝层为空 = 本仓走「删」不走「留尸」 |
| `## 决定` | 77/77 | 门禁在（`notes-liveness`） |
| `## 输掉的方案` | 77/77 | **门禁不在**，散文全守住了 |
| `## 验证` | 66/77 | 漂移 11 篇；门禁不在 |
| `## 状态事实与载体` / `## 未覆盖轴` | 9/77 | 2026-11-14 生效，前向规则，尚未覆盖 |
| `archived/` 有状态行 | 193/197 | 4 篇无——全是生效日前的存量 |
| `pnpm notes:audit` | deadPaths 0 / missingBacklinks 0 / noDecision 0 / statusMismatch 0 / orphans 36 | 机械面干净；36 篇零入链（grep 靠内容，不靠链，不作缺陷） |

**可证伪**：这些是日期化读数；任何一条与当时的 `pnpm verify` / `notes:audit` 输出不符即作废。

## 四、建议次序

- **第一批（锁，一起做）**：B1 + B3（一个新门禁，含树形与状态行）→ B2（两个 `AGENTS.md`）→
  B9 + B11（文档一句话）。理由：这三笔都是「已借的规则没有执行面」，互不依赖，且 B1 的负例就是 E1。
- **第二批（一致性）**：B5（先拍板选 a/b/c）→ B6（作废 RFC 落点）→ B4（骨架门禁，前向）。
- **第三批（判据质量）**：B7（keep 清单 + 校准样例，样例从 git 收割）→ B8 → B10（可选）。

不做的事：不搬 `notes/` 位置（硬前提，见页首）、不新增 `notes/` 之外的清单、不建主题索引、
不预铺 class 目录、不引入 `.agents/` 前缀。

## 五、未覆盖

- 只读了 digest 的 `development-flow/` 八篇；`harness-idea/`、`test-strategy/` 等相邻专题未读，
  因此本材料的判定**不覆盖**它们。
- 没有统计「归档后因链接修复被编辑」的历史次数（`git log --follow` 可查），B5 的紧迫度按 E3 的结构
  风险估，不是按实测频次。
- 没有验证 DSH 的封印工作流在本仓是否可用（已判不借，验证无意义）。
- 校准样例（B7）没有在本轮收集——按「备选只记录、不编造」，样例要在实施轮从 git 历史逐条收割。
