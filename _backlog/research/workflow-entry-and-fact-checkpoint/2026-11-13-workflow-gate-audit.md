---
topic: 加工环路的规则 × 门禁对账
intent: 把 backlog/notes/实现/收尾的规则逐条对到机械执行，找出无执行、执行太弱、handoff 丢失与三条最小机械检查
---

# 规则 × 门禁对账

> 口径：只读源码与门禁头注；未跑 `pnpm test`/`pnpm verify`。规模：71 个门禁模块、68 篇 implemented Note、118 张已结卡、2 份 proposed RFC。
>
> 结论：环路对「形状」的机械面很厚，对「内容是否真回答」很薄；最危险的空转在收尾证据、Note 未验面、RFC 可执行验收、材料性判据。把「非空」升级为「至少一个可执行标记」，是成本最低、收益最高的一刀。

## 1. 总表（摘要，按缺口排序）

| # | 规则 | 规则 owner | 机械执行 | 缺口 |
|---|---|---|---|---|
| 1 | 卡只经分诊存在 | `_backlog/README.md:132` | `tools/lib/backlog-liveness.mjs:217` | 无（只查分诊后形状） |
| 2 | `待落地` 门票 = 非空 `## 验收标准` + 去向三值 | `_backlog/README.md` | `tools/lib/backlog-liveness.mjs:224-233` | 太弱：非空即过，「可执行」无判据 |
| 3 | 缺陷门票 = 非空 `## 已修判定` | `_backlog/README.md` | `tools/lib/backlog-liveness.mjs:235-238` | 太弱：同上 |
| 4 | 材料性判据 + 自授权边界 + 留痕 | `_backlog/README.md:124-128` | 无（`severity` 只查语法） | 无执行：最高杠杆的散文 |
| 5 | 任务源 = 已批 RFC + 用户点名；卡不是任务源 | `docs/guides/dev-loop.md:34-38` | 部分（`proposals.mjs:22-25` 识别「已批」） | 无执行：无「实施须引用授权」检查 |
| 6 | RFC 只收已批；验收必须可执行 | `notes/proposed/README.md` | `checks/gates/proposals.mjs:22-30` | 太弱：`## 验收` 标题在场即过；「批准」任意位置字样 |
| 7 | RFC 该毕业的毕业 | `notes/proposed/README.md` | `checks/gates/proposals.mjs:36-56`（3 个终态词） | 矛盾：`已实现` 非终态词 → 半实施 RFC 合法滞留（实证 bilingual RFC） |
| 8 | 红绿环：先红→绿→不绿不收口 | `notes/proposed/README.md:25-30`、`docs/testing.md:54` | `checks/gates/guard-red-record.mjs:50-67`（仅标题带 BUG-nnn 的 spec） | 太弱：普通 feature 的红是自述 |
| 9 | Note 四件套 + 真证据 | `notes/README.md:51-56`、`agent-note-definition` | `checks/gates/notes-liveness.mjs:33-38`（只查 `## 决定` 标题） | 太弱：空节过；备选/验证无门 |
| 10 | 收尾九步 + 六行回执 + 语义审四输入 | `close-out-definition/SKILL.md:21-51`、`docs/policy.md:79-84` | 无 | 无执行：回执只住对话 |
| 11 | 门禁自身纪律（负例留证/失败点名） | `gate-change-definition`、`docs/policy.md:21` | 无（`guard-red-record` 不管 gates；审计实测 4/71 门无留证行） | 无执行 |
| 12 | 四不等式（挂得上≠行为对≠装得上≠已获批） | `docs/guides/dev-loop.md:59-62` | 部分（挂载/安装是脚本，非 verify 强制） | 无强制 |

**重复/矛盾**：
- 同一「真事故卡」两套定义：`guard-red-record` 只认 `_backlog/_archive/fixed_bugs/`，`company-root-carriers` 认活跃+归档四桶；修复提交先写守卫后归档卡时，`verify` 会在窗口期红。
- 「毕业」一词两义两门：卡的 `毕业：做` 与 RFC 毕业，词面相同、判据不同。
- 死链三处各管一段（`md-links` / `notes-archived-links` / `link-debt`），不合并是对的，但失败形态「断链」没有统一数字。

## 2. 只有散文、没有机械面的环节（按风险）

1. **收尾证据链与六行回执**：最后一道「完成」闸门；机器绿灯可直接升级为「做完了」。
2. **Note 的真证据与未验面**：审计统计 43/68 篇 grep 不到「未验/未执行/阻断」——未验面的默认归宿是消失。
3. **RFC 的可执行验收**：整条下游建在散文上；空 `## 验收` 也绿。
4. **材料性判据 + 自授权边界 + 留痕**：判错即未授权落地；`留痕：` 从未被门禁读过。
5. **根因纪律**：`修复就绪` 的自授权以「根因已确认」为前提，门只查判据非空。
6. **语义审四输入**：唯一的「做的是不是这件事」面，只靠一句话记录。
7. **红绿环次序**：普通 feature 没有「先红」的门。
8. **methods 方法有效性**：门只查 3 个 frontmatter 键 + 索引行，不查输入/步骤/完成条件。

## 3. 只查「节在场/字数/链接」的三道门

1. **`proposal-scheduled`**：`checks/gates/proposals.mjs:26-27` 只匹配 `^## 验收`；空节、只有标题都绿。`批准` 是 `head.includes`，注释里提一句也能过。
2. **`notes-liveness`**：`checks/gates/notes-liveness.mjs:33-38` 只查 `## 决定` 标题；节内无正文不报。rationale 的「现行语义」只要求节内出现一个 `](…)`，链到错文件也算。
3. **`backlog-liveness` 门票**：`tools/lib/backlog-liveness.mjs:228-229`、`:236-237` 的 `sectionBody` 只要求「标题到下一个 `##` 之间非空」；写「待定」「见 RFC」均绿。`:248` 的 `审查：` 只匹配 token，`审查：跳过 —` 不写理由也绿。

对照两条（不展开）：`guard-red-record` 只要注释里出现 `// 负例留证 日期：…BUG-nnn`，红是不是真的不影响；`doc-budget` 纯行数。

## 4. handoff 丢失

1. 卡上验收的「失败类 / 负例 / 证据 owner / 人判」→ RFC 只剩命令与红形态；四列里至少两列蒸发。
2. `审查：` 与 `留痕：` 不进 RFC/Note；`留痕：` 从未被任何门禁读过。
3. RFC 验收条目没有逐条销账的载体；`已实现` 不在终态词 → 半实施合法滞留；`## 当前状态` 是自由散文。
4. Note 的未验面：收尾六行 ⑤ 只住对话；Note 可选写「剩余风险」，43/68 篇 grep 不到。
5. 验证命令的环境坐标：只写命令、不写 home/profile/端口/日期；「这条绿只在 warm dev 盘成立」无门。
6. `pending` 去向无队列/时效；`implementation` 不要求 SHA；`none` 理由可缺；`上游 =` 回链无门。

## 5. 三条最小机械检查（候选，不新增审核流程）

**① `新建:checks/gates/acceptance-carrier.mjs`（事实轴，先做）**
- 作用面：`notes/proposed/*.md` 的 `## 验收` 列表、`notes/implemented/*.md` 的「验证/证据/实跑」节、活跃卡 `## 已修判定`。
- 判据：每条顶层 bullet 至少含一个可解析载体——反引号命令首词 ∈ `{pnpm,node,git,rg,source,npx}` 且脚本/路径存在；或指向现存文件的 Markdown 链接；或存在的反引号仓内路径。否则红 `file:line → 验收条目无载体`。
- 配套：把 `command-refs` 的扫描面从 `docs/**` + 根 README 扩到 `notes/proposed`、`notes/implemented`、`_backlog` 活区——脚本改名现在打不痛 RFC/Note。
- 红证：zz RFC 的验收加 `- [ ] 用户体验良好` → 红；改成 `` - [ ] `pnpm test tests/client` 绿 `` → 绿。

**② `新建:checks/gates/handoff-carrier.mjs`（去向轴）**
- 扩 `backlog-liveness` 的已结分支：`rfc` → 唯一链接解析到 `notes/proposed/` 现存文件；`note` → `notes/implemented/` 或 `notes/archived/`；`rejected` → `notes/rejected/`；`pending` → `user (YYYY-MM-DD)`；`none` → `—` 后 ≥10 字理由；`implementation` → 7–40 位 SHA 且 `git cat-file -e` 退出 0（或仓内现存路径）。四个载体值共同追加：目标文件正文出现卡的 basename（回链）。
- 红证：`去向=rfc` 却链 `notes/implemented/` → 红；链对桶但目标不提卡名 → 红；补回链 → 绿。

**③ `新建:checks/gates/env-bound-evidence.mjs`（环境轴）**
- 环境专属 token：`runtime/`、`company-workspace/`、`snapshots/`、`_dist/`、`--port <非0>`、`127.0.0.1:\d+`、`/Users/`、`.dsh-company/`；便携 token：现存 `pnpm (verify|test|typecheck)`、`node (checks|tests|tools)/…`、`source run/env.sh`。
- 判据：一条 bullet 含环境专属 token 而没有任何便携命令 → 红（允许显式豁免 `（环境：…；便携复跑：<命令>）`）；`--port` 非 `0` 直接红。
- 红证：验收写「在 runtime/harness-home 看到 exports/」→ 红；同条补 `node checks/smoke/preset-smoke.mjs` → 绿。

**落地约束**：三条合计 ≤220 行；注册进 `checks/run-gates.mjs` 即被 `gate-wiring` 看住；每条块注释带 `// 负例留证 <日期>：… → 红`。规则文本加进 owner 文档前先看行预算：`_backlog/README.md` 136/140、`notes/README.md` 125/132——先搬/压再加，否则 `verify` 先红。
