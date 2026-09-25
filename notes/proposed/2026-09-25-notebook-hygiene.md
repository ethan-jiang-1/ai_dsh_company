# 2026-09-25 · 记事面治腐化：发散线索立家 + 指针修复

状态：proposed（2026-09-25 盘点登记；先定归宿与判据，搬迁在实施时做）

## 问题

2026-09-25 凌晨长程执行收尾后盘点：若干线索**没有索引家**或**指针已腐**。按本仓入口契约
（[ROADMAP.md](../../ROADMAP.md) 文件头「队列 = 有序索引」+ [dev-loop §0.5](../../docs/guides/dev-loop.md)
「继续下一条」分支），下次开工只读 §队列 ⇒ 这些线索会被漏掉。

实证六点：

1. **「磨清单」不存在**：`ROADMAP.md` 与 [implemented/new-motion-types.md](../implemented/2026-09-24-new-motion-types.md)
   两处写"观察项三条进磨清单"，但全仓无此文件、无此节；三条观察项（事件复盘场 VP-Eng/COO 未留 journal
   〔W8 同款第二次〕／ CEO journal 文件名自记日期漂移／ q3 场 `final.md` 换行不合规）实际只活在 Note 正文。
2. **两条触发型注册无索引行**：[implemented/presentation-narrative.md](../implemented/2026-09-24-presentation-narrative.md)
   登记「replay 场景化」与「视觉打磨二期」，但 §队列与 §搁置池都没有对应行。对照正例 = 升 pin 有 ⏸ 行 +
   复活条件，一眼可见；现状（既不占行、又无"可以不占"的明文）两头不靠。
3. **intents 指针腐化**：`notes/intents.md` 驾驶舱①②③三行状态写"implemented（RFC §切片X 实施实况）"——
   该 RFC 已毕业为 [implemented/cockpit-human-loop.md](../implemented/2026-09-24-cockpit-human-loop.md)，
   三行既无链接、称谓也已过期；从 intents 跳不过去。
4. **两条 implemented Note 从 intents 不可达**：`2026-09-23-dsh-inround-task-surface.md`（D23/D24 转型的
   研究依据）与 `2026-09-22-digital-twin-cultivation-and-self-learning.md`（分身机制研究）。
5. **`notes/rejected/` 合同与事实不符**：[AGENTS.md](../../AGENTS.md) 布局行与 dev-loop §12（状态行三选一、
   "rejected 的去留"规则）都把它当既有家，实际目录不存在；否决理由现散落各 RFC/Note 正文。
6. **`docs/index.md` 外部研究材料登记过期**：登记的研究树 HEAD 为 `dsh-v0.1.5-rc.2-149-gc4442c6928`，
   实际已是 `dsh-v0.1.7-rc.1-183-g2a059ab32f`（2026-09-25 核对）。

## 方案

逐项定归宿，不做无判据的批量改写：

1. **给「磨清单」立家**（二选一，实施时记录理由）：ROADMAP 增设常设节；或 `notes/` 下独立一文件。
   三条观察项逐条搬入，各带"谁来磨／何时磨"的触发条件。
2. **触发型两条择一**：§队列加 ⏸ 行（带触发条件）；或把"触发型只登记在 RFC 正文、不占队列行"写成
   ROADMAP 文件头的显式规则。二者必须择一，消除现状的"两头不靠"。
3. **修 intents 三行指针** + 补两条不可达 Note 的链接；同时裁断表头契约〔"意图（动机 + 外部可观察行为）"〕
   与近期行实际写法〔交付清单 + 验证证据〕的偏差——改表头或改行文，二选一。
4. **裁断 rejected 去留**：建 `notes/rejected/`（附去留判据）**或**改 [AGENTS.md](../../AGENTS.md) 与
   dev-loop §12 措辞为"否决理由留在原 RFC/Note 内"。按 D26（文档卫生）与 §12 "rejected 只在仍能阻止
   可信错误时保留"的判据择一。
5. **更新 index 研究树登记行**为当前 HEAD，保留"以 `_digested` 审计基线对齐、不追新提交"的既有口径。
6. **机械防线（可选）**：`pnpm verify` 增"合同／导航文件里的裸仓内路径必须存在"门禁，按纪律带反证
   （红 → 还原 → 绿）。这是本盘点里唯一一处"活指针腐化"类问题的机械兜底。

## 输掉的方案

- **只改措辞、不立磨清单家**：三条观察项继续无索引，违反「队列 = 有序索引」；输给"先立家再搬"。
- **三条观察项各开一条队列行**：粒度太细，与「队列行 ≤3 行」相抵；输给"一个磨活节 + 三条子项"。
- **建集中式 notes 索引文件**：DSH 纪律是"目录树即清单、共享索引必漂移"（[proposed/README.md](./README.md)
   已引 vendor Note）；输给"用现成载体"。
- **intents 全量回扫重写**：存量不回扫是 dev-loop §12 明文（状态行条）；只修本轮实证的腐化点。
- **靠人记性兜住**：活指针腐化在本仓有复发史（D26 因它而立）；输给机械可查。

## 验收

- `pnpm verify` ALL PASS（若加裸路径门禁，含其红/绿反证记录）。
- 全仓搜索「磨清单」无悬空引用；三条观察项可从 ROADMAP 一跳到达。
- 触发型两条有明确索引归宿，从 §队列或 §搁置池可发现。
- `notes/intents.md` 无死链；AGENTS.md 与 dev-loop §12 关于 `rejected` 的表述与 `notes/` 实际目录一致。
- `docs/index.md` 研究树登记行与实际 HEAD 一致（以登记时点为准）。

## 风险

ROADMAP 无 doc-budget 门禁（预算只覆盖 AGENTS.md / docs/index.md / dev-loop），补行后靠自律守「行 ≤3」；
若本条给 ROADMAP 加的内容过多，应拆出到独立文件而不是撑大队列。
