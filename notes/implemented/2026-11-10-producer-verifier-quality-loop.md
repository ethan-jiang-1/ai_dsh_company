# 2026-11-10 · 质量环：一个做、一个验——独立 activation + 外部方法层 + 事后审计

状态：implemented（2026-11-10 交付；上游 = [producer/verifier 质量环卡](../../_backlog/_archive/settled_issues/2026-11-10-producer-verifier-quality-loop.md)；决定号 = [D60](../../docs/reference/decisions.md)）

> 研究依据 = [能力归位与质量环](../../_backlog/_archive/research/capability-placement-and-quality-loop/README.md)（四槽：人/流程/方法/政策）。
> 历史对照 = [退役 SA/SQA](./2026-11-09-retire-sa-sqa.md)：E/V 分家的**结构**对，把**方法**写进 persona/skill 才对错——本 Note 复用结构、不复用旧 preset。
> 操作面（装方法包 / 发工 / 落盘 / 读红）= [guides/quality-loop](../../docs/guides/quality-loop.md)；流程正本 = pack skill `quality-loop`。

## 问题

VP-Eng 一个人既做设计又做验证时，E（工程）与 V（验证）在同一上下文里互相干扰：锚定、共享盲区、
自我评分、注意力稀释。历史 SA/SQA 用两个委派子人格解决了**结构**，但把方法（V 模型层级、TC 编号、
五学科清单）写进了 persona 与 skill——换一家公司就要改包，2026-11-09 整套退役。

这次要证明的是另一件事：**结构可以复用，方法必须外置**。同一句话在 DSH 里落成四个槽——
身份/工具面（preset）、流程（共享 skill）、方法（角色方法层）、政策（公司层）。

## 决定

1. **两个 support 能力档**：`presets/quality-loop-producer/`（有手：read/write/edit/bash/fs-search/web/todo/skill/compaction）
   与 `presets/quality-loop-verifier/`（**真只读**：`write: false` + `edit: false`、无 bash）。**两档共用 `quality-loop-` 前缀**：
   裸名（`producer` / `verifier`）太泛——它们是只给复杂高风险产出用的能力档，同一个前缀让人一眼看出是一套、
   也让维护者按前缀一搜就找齐（用户 2026-11-10 裁定「这俩前缀是一个，别分开」）。
   能力边界用**缺行**表达，不用 persona 里一句"请只读"。两者 persona ≤2KB，只钉"我是谁 / 我缺什么 / 我的边界"。
2. **VP-Eng 两条命名行**：`quality_loop_produce` → `quality-loop-producer`、`quality_loop_verify` → `quality-loop-verifier`，各 `maxDepth: 2`。
   不用通用 `subagent` 的白名单——身份由模型自选既不可靠也不可审计；命名行的 `agentPreset` /
   `delegationDepth` 能被 `list_subagents` 与审计回查（[delegation.md §1](../../docs/contracts/delegation.md)）。
3. **流程住共享 skill**：`presets/_shared/skills/quality-loop/SKILL.md`——任务书七字段、交接包（只给
   基线/产物/约束/方法，**不给产出者的推理与自评**）、轮次上限 2、处置三选一、裁决 append-only、
   check-id 全覆盖、升级路径。preset 不含流程，流程不含方法。
4. **方法住角色方法层，且必须被点名**：`<DSH_HOME>/company/methods/<preset id>/<pack>/SKILL.md`（目录跟 preset id 走；
   包里的 `side` 是方法自己的词表：`producer` / `verifier`），两侧同 `method` 同 `version`、`side` 不同；
   任务书写 `<pack>@<version>`，**缺了任一侧 fail-closed 停下**。
   没有默认方法包——这从结构上防止"又悄悄把方法写回代码"。
5. **裁决原样落盘**：验证者只读、写不了盘；由 VP-Eng 把它的最终正文写进 `verdict-r<N>.md` 并带一行头
   `session / preset=quality-loop-verifier / depth / producer=<产出者 sessionId> / method / body-sha256`。
   哈希口径 = 正文去掉结尾空白（文件尾随换行不算"改了"）。「未被改」由此可机械核对；`producer` 字段则让**次序**可核。
6. **审计是事后检测，不是运行时 veto**：判据住 `tools/lib/quality-loop.mjs`（纯函数），驱动 =
   `probes/team/quality-loop-audit.mjs`（读盘 + 读 child durable header）。核七件：两个独立 activation、
   原文一致、未被改、处置覆盖、方法配对、check-id 全覆盖、验证者没调 `write`/`edit`/`bash`。
7. **非角色边界按"是不是公司角色"派生**：pack 运行时表由 `WORKER_FAMILY_PRESETS` 改名并扩为
   `NON_ROLE_PRESETS`（worker family + 两个能力档）——不注入公司手册、不装 subagent 控制面。
   这是一次机械重命名 + 集合扩充，没有新 host 机制（唯一 host 触碰 = 两处 import 名与默认集合）。
8. **独立性口径写死**：标"上下文独立复核（同模异上下文，独立性有限）"，不得报成"异人/双人复核"；
   对外签字仍归人（[review-protocol](../../packages/company-pack/content/company/review-protocol.md)）。
9. **次序是硬约束，不是建议**：先 `quality_loop_produce` 落盘**收工**，再 `quality_loop_verify`。
   两条手同时发出去没有意义——验证者拿到的是半成品，那是打断不是复核（用户 2026-11-10 指出）。
   写进三处：skill §2「严格串行」、VP-Eng persona、两个能力档的 description（第一步 / 第二步）。
   机械面 = 审计核**验证者会话的创建时间晚于产出者首轮 `turn/end`**（`order-violation`），
   头里的 `producer=` 就是这条检查的锚。

## 输掉的方案

- **恢复 `system-architect` / `system-qa`**：方法仍在 persona/skill 里，换公司要改包——退役理由没消失。
- **同上下文换帽子**（让 VP-Eng"先当 SA 再当 SQA"）：锚定、自评、共享前提全在，等于没隔离。
- **team 成员当验证者**：成员继承 Lead 组合（工具/skill 面是 Lead 的），只有软隔离；`spawn_teammate` 不接受 preset。
- **workflow 分支当验证者**：同人格、无 `agentPreset`，出不了独立裁决。
- **通用 `subagent` + `agent_preset` 白名单**：身份靠模型自选，流程不可靠、审计无锚。
- **验证者带 bash（"能跑测试但只能检测"）**：v1 不做——`read-only` 沙箱是会话级、不是 per-child，
  有 bash 就有写的能力，只靠审计事后抓等于把硬边界降级成软约定。代价（跑不了测试）如实记账。
- **新造调度器/状态机**：违反"不发明"；activation + `send_to_subagent` 够用。
- **工作区另立 method 目录**：方法层已经有了，再造一套 = 第二个事实源。
- **两条命名行并行发**（同一轮里同时 `quality_loop_produce` + `quality_loop_verify`）：省一次等待，
  但验证者拿到的是还在写的半成品、也没有"基线已定"可依据——等于把复核降级成并发读。改成硬串行 + 审计可核（决定 9）。
- **裸名 `producer` / `verifier`**：泛到看不出用途与配对关系，也看不出"只给复杂高风险产出用"；两个前缀各起名
  （如 `ql-produce` / `ql-verify`）会让人以为是两件东西 → 改成一个共用前缀 `quality-loop-`（决定 1）。
- **宽泛术语黑名单当主判据**（persona 里"出现 V 模型就红"）：会漂；主判据是形状（persona 预算、
  方法槽指针、工具面缺行），黑名单只作窄 tripwire（只见于 spec，且只挡已知的三种错位）。

## 后果：现在时的事实与代价

- **验证者跑不了测试**：动态证据由产出者跑、原始输出交给它评；拿不到就标"未验证"（E2E 里它
  真的对 `sha256`/字节数写了"无法核对"——这是能力边界，不是缺陷）。
- **审计只在日志在场时能证原文**：会话轮转/归档后只核文件自洽并打 `session-log-missing` warning——
  不假装核过。父代理理论上仍有手能改盘，改了会红，但那是事后。
- **同模相关性不消失**：上下文隔离解决锚定/自评/盲区共享，不解决同源盲区；关键结论旁仍要标边际宽度。
- **轮次语义（E2E 校正）**：处置归**首次提出该发现的那一轮**；复验轮把上轮发现重列为"已消除/仍成立"
  是闭环陈述，不必再抄一份处置表（新发现才要在当轮处置）。原文一致按轮次**单调向后**对齐——同一
  child 被 `send_to_subagent` 续跑时，R1 对较早那条正文、R2 对较晚那条，拿早期草稿冒充后一轮会红。
- **`/cultivation` 名册仍是六角色**：能力档的方法由人直接放进方法层（v1 无采纳/撤回流水线，扩名册是另一张卡）。
- **`docs/architecture.md` 没加路由行**：质量环是**按需加载的 skill 面**（VP-Eng 在复杂产出时才 load），
  不是 arch 地图里的常驻通道——四条协作通道没变（质量环走通道 A 的命名委托）。把 skill 面画进架构图会让
  "常驻 vs 按需"这条线糊掉，所以只在地图上留 `delegation.md` / `presets.md` 的署名行。
- **文档预算**：`presets.md` / `delegation.md` / `cultivation.md` 三份都顶格，本轮按"先搬/压再写"处置
  （压叙事、删一条已完成事项的变更史）；`decisions.md` 66（+1 行 D60）与新增的 `docs/guides/quality-loop.md`
  85 是本轮建立的首个预算。

## 归位

- **人**（身份/工具面/只读边界）→ `presets/<id>/agent.cordis.yml`：换公司不变，所以住 pack。
- **流程**（交接、轮次、处置、裁决）→ `_shared/skills/quality-loop`：换公司不变，所以住共享 skill。
- **方法**（检查表、判据、词表）→ 角色方法层 `<DSH_HOME>/company/methods/<side>/`：换公司就要变，
  所以**必须能由人替换而不用改包**——这是本设计唯一的抽象目标。
- **政策**（何时强制、升级线、谁签字）→ 公司层 `review-protocol.md` + 公司手册：会变，住公司内容。
- **什么会逼它搬家**：若"不同产品类型要用完全不同的质量流程"成为常态，流程要下沉到产品类型包
  （`content/product-types/<id>/`），而不是往 persona 里加分支；若上游给 per-child 只读沙箱，
  验证者可以考虑带 bash（届时改的是工具面与审计判据，流程不动）。
- **更低的层被排除**：公司层（只一家公司的 V 模型）不够；产品类型层（只一个产品类型）不够；
  方法层才是"方法"的家，而"流程"比方法更稳定，所以流程不能再跟着方法走。

## 验证

全部命令在 2026-11-10 本机实跑（`source run/env.sh` 前置）：

| 命令 | 结果 | 红形态（实跑过） |
|---|---|---|
| `pnpm test` | 全绿（169 个 spec 文件 / 1393 项） | 改 `quality-loop-verifier` 的 `write: false` → presets spec 红；把 `handbookSkipPresets()` 收窄 → 模型 parity 红 |
| `pnpm typecheck` | 全绿（pack 两面 + 四条 tests 面） | `NON_ROLE_PRESETS` 改名漏一处 import → TS 红 |
| `pnpm verify` | ALL PASS（含 doc-budget / md-links / bare-path / script-index） | 新 guides 文档无预算、content 里写部署日期、INDEX 未重生成——三处各红过一次，逐项修回 |
| `node checks/smoke/preset-smoke.mjs` | ALL PASS（6 角色 + 5 非角色 preset 全部真挂载） | 未加 `bundle.patch` 登记时曾 `Unknown agent preset`（门禁 presets 也拦） |
| `node probes/team/quality-loop-audit.mjs --self-test` | ALL PASS（7 支：基线绿 → 改正文/删处置/换版本/**并行发工**/验证者写盘 各红 → 还原绿） | 自带破坏逐支断言 code |
| 真盘红证（临时交付目录 + 夹具方法层） | 改裁决正文 → `body-modified` exit 1；删一条处置 → `disposition-missing` exit 1；把验证侧方法版本改成 1.0.1 → `version-mismatch` + `header-method` exit 1；逐项还原 → exit 0 | 三种破坏各自只出对应 code |
| **真模型 E2E**（一次） | VP-Eng 会话 `session-1ba03b70…`：`quality_loop_produce` → child `5695a114…`（preset=quality-loop-producer / depth=1）；`quality_loop_verify` → child `412c9b7d…`（preset=quality-loop-verifier / depth=1，工具面只调过 `skill`+`read`）。裁决 R1 = fail（RT-01…RT-04 全覆盖，1 blocker + 1 advisory）→ 处置 → R2（同一 child 续跑）= pass。**这次 E2E 在改名之前跑**（当时 preset id = `producer` / `verifier`），改名只换 id 与目录名、判据与流程未变。`quality-loop-audit --deliverable …` = ALL PASS（2 条 `carried-forward` warning） | E2E 首跑时审计报 6 处红，分成两类并各自处置：**判据过严**（原文只认最后一条消息、处置首格带标题不认编号）→ 改判据 + 加 spec；**契约缺口**（R2 没出处置表，因为发工 prompt 只点了 r1）→ 定为"处置归首轮"语义并写进 skill |

E2E 的方法层夹具 = `tests/fixtures/methods/home/company/methods/`（两套合成方法包：`requirements-trace@1.0.0`
与 `api-contract@2.1.0`），装进 dev home 的 `company/methods/<preset id>/` 后跑。E2E 交付物是 dev workspace
里的临时目录，跑完即删（它的裁决头记着改名前的 preset id，留着会让后续审计按现行 id 报 `header-preset`）；
证据以本节与下面这段裁决摘录为准：

> R1（fail）：`RT-04 | fail | 非范围已单列（第 14–21 行），但与需求冲突：第 10 行 REQ-001 规定「其余字符每个计 1 列」……`；
> 发现 `- F1 [RT-04][blocker] …冲突…` + `- F2 [RT-04][advisory] …边界摩擦…`。
> R2（pass）：`F1 … 已消除。依据：第 10 行不再使用「其余字符每个计 1 列」的开放式表述……`；`无新增发现（F3 起为空）`。

**未验项（如实记）**：① 没跑真浏览器/UI 面（本轮没有 client 改动）；② 没跑 `release-smoke`
（发布面未变，且 E2E 走的是 dev 的 tarball 安装）；③ 多公司 fixture 只证了"同一套判据能审第二套方法包"，
没做第二套方法包的**真模型** E2E（keyless 已覆盖配对与覆盖判据）。
