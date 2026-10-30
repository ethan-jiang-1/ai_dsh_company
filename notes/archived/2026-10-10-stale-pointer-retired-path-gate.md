# 2026-10-10 · 指针落点修整轮 + retired-path 门禁

状态：已交付（用户令「发现的任何问题都需要修复」的 fresh-agent 全仓审计修复轮：五处改名残留指针就地改新、
backlog 收卡一单按其自家规则归档、retired-path 门禁 + bare-path TOP_DIRS 补盲区；红绿证据见 §验证）

## 问题

2026-10-09 backlog 大改名（plans→issues、_done→_archive，[backlog-issue-lifecycle](../archived/2026-10-09-backlog-issue-lifecycle.md)）
后，旧路径前缀在 bare-path 的三个盲区里全绿存活：① TOP_DIRS 不含 `_backlog/`——NOW_FILES 明明含
_backlog 活跃卡，扫描面里这一半路径从未被存在性检查；② glob/占位内容被 `[*<>…{}]` 过滤跳过
（`BUG-nnn-*.md` 形状的判据句）；③ `.agents/skills/`、checks/README.md、run/README.md 不在扫描面。
fresh-agent 视角全仓审计实测五处残留：agent-note-definition skill（旧 plans 池）、guard-red-record
Note 判据句与 pack README（旧 _done 池）、runtime README 的 dev/ 字面量（dev→run 改名残留）、
implemented-note-currency 的观察档锚与表行（旧池名）。另有 dev-loop 头部把 pin-upgrade Note 误标为
「已删」（Note 在盘且被台账 D27 路由；已删的是其内部 delta 长文）。

## 决定

1. **五处事实落点就地改新**（D38 口径：决定正文不动、路径/符号/默认值锚随改动改新）；dev-loop 头部
   误标一并修正为链接现行 Note。
2. **新门禁 `retired-path`**（run-gates 2d-ter）：活跃面（NOW_FILES ∪ `.agents/skills/**` ∪
   `checks/README.md` ∪ `run/README.md`；**2026-10-10 后续轮再扩** | `.md` 之外还有 `checks|probes|tools|tests` 的**脚本注释行**、以及 bare-path 的「已带 `vendor/` 前缀不再重挂子模块」例外——扩面与红证 = [fresh-agent-map-sweep](2026-10-10-fresh-agent-map-sweep.md)）的反引号内容命中退役前缀 → 红，失败信息点名文件:行与现行家。
   退役前缀清单唯一家 = 门禁内数组（D28：枚举的家 = 实现自己；本文不复述清单）。
3. **bare-path TOP_DIRS 补 `'_backlog/'`**：同源盲区，`_backlog` 反引号路径自此进存在性检查。
4. **随卡收尾**：multi-instance-guard 卡按 issues/README 自家关闭规则归档（status 已结、单一关闭条件节、
   两边清单同步），清掉「frontmatter 可关闭：否 vs 正文已达成」的三口径打架。

## 输掉的方案

- **全树扫描（含 notes/archived、_backlog/_archive、postmortem）**：否——归档树是记录当时事实的档案，
  判红即逼篡改记录；与 bare-path 观察档同边界。豁免方向已实测（归档探针不红，见 §验证 3）。
- **扫原始行而非反引号内容**：否——描述这个错误类的文档与注释自身就会命中，raw 扫描会自咬
  （bare-path 的 zz- 负例约定正是为解开这个结而生；反引号扫描 + 清单住代码侧天然规避）。
- **词汇统一（驾驶舱→观察窗全仓改名）**：否——「驾驶舱①–④」是已交付 UI 切片的史名（src 注释与
  ui-demo 改名映射表在用），改名即伪造历史；改为 orient 词表一行声明三词同指。
- **R 轮编号全仓清除**：否——R1–R5b 是有效的历史出处标记（git 考古索引），清除即丢出处；
  dev-loop 头部一行定性（不承载现行义务、与 snapshots 场景号两套序号互不推断）已达目的。

## 后果

- 活跃面再出现改名残留 = verify 红，修复动作 = 改指现行家（失败信息自带现行家）。
- 退役目录再改名时：更新门禁数组（清单唯一家）+ 同 diff 扫活跃面残留。
- 归档树的历史提及按原样保留，观察语义不变。

## 验证

实跑（命令链 `set -o pipefail`）：

1. **红A（retired-path）**：docs/orient.md 临时插一行反引号内旧 plans 池前缀路径 →
   `FAIL retired-path: docs/orient.md:61 → …用了退役路径——改指现行家`（点名文件:行 + 现行家）；还原即绿。
2. **红B（TOP_DIRS）**：同文件临时插一行反引号内不存在的伪路径（旧 issues 池前缀 + 不存在的日期 slug；
   逐字原话存 run-gates 注释负例留证行——.md 硬档不能反引号引用伪路径，本 Note 初稿即被 bare-path
   抓红一次，反证硬档对**新写**文件真实生效）→ `FAIL bare-path: docs/orient.md:62 → …不存在（双树均无…）`；还原即绿。
3. **豁免方向**：同行放进 notes/archived/ 临时文件 → retired-path 不红（不在扫描面；探针文件已删）。
4. **修复后全量**：`pnpm verify` ALL PASS（bare-path ×429 / retired-path ×83 文件）；
   `pnpm test` 44 文件 452 用例全绿，2.5s（预算 < 5s 内）。

## 关联（取代检查结论）

- [implemented-note-currency](../implemented/2026-10-09-implemented-note-currency.md)：本 Note 的锚修整 = D38 政策的
  执行实例，不取代它；其表行与观察档锚已随本轮改新。
- [_archive 已结卡 stale-pointer-cleanup](../../_backlog/_archive/settled_issues/2026-10-09-stale-pointer-cleanup.md)：
  该卡裁定「不批量清祖父存量、按需修实际阻断导航的指针」——本门禁只扫活跃面、祖父豁免面不进扫描面，与裁定一致。
- [guard-red-record](2026-10-09-guard-red-record.md)：仅判据句路径锚改新（旧 _done 池 → `_backlog/_archive/fixed_bugs/`），
  门禁决定与三条规则不变。
