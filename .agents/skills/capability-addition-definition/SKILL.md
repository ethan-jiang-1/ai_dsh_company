---
name: capability-addition-definition
description: "Use when adding or changing company content — a role, capability, method, template, workflow, or policy — or when deciding which layer a piece of content belongs in, to run the placement pass before editing: answer the four lifetime questions, run the two deletion tests, name a second consumer, and route the content to the layer that changes with it."
---

# 新增内容的归位完成定义

适用：要**新增或搬动**公司内容时——角色/persona、能力档、方法包、模板、流程 skill、政策线、默认状态。
规则唯一家 = [内容宪章](../../../docs/content-charter.md)（四槽、三层、铁律、成本表、红牌、变更协议都住那里）；
本 skill 只管**次序与判据**，不复述宪章的表。

## 为什么这一步不能跳

原样跳过的真实代价：旧 SA/SQA 把 V 模型、`TC-###` 编号、五学科写进 persona 与 skill——E/V 分家的结构是对的，
但换一家公司就要改包，2026-11-09 整套退役、再拆一遍。**放错层的内容迟早要搬，层越高越贵。**
所以次序是「先答四问 → 再动文件」，不是「先改手上的文件 → 后解释」。

## 步骤

1. **定四槽。** 你要加的是人（身份/工具面）、流程（谁先谁后、交接、裁决）、方法（怎么做、检查表、判据），
   还是政策（何时强制、阈值、升级线、谁签字）？答不出 = 还没想清，回卡。（四槽定义 = 宪章 §2）
2. **答四问**，顺序固定，逐条写进卡的 `## 抽象度`：① 换公司要改吗 → 公司层；② 换产品类型要改吗 →
   产品类型层；③ 换做法要改吗 → 方法层；④ 只有机制本身变才改吗 → 通用层/契约层。四问全「不」= 没找到不变量，停。
3. **跑两测**（在草案上真删，不靠想象）：**换公司测试** = 删掉公司名/行业词/人名/具体阈值，骨架还成立吗；
   **换方法测试** = 删掉方法名/层级名/编号族/检查表，骨架还成立吗。删完垮了 = 放错层，回第 1 步。
4. **点名第二消费者。** 声称「通用」必须在盘上指得出：第二家公司、第二个产品类型，或第二套 fixture
   （`tests/fixtures/companies/` 与 `tests/fixtures/` 是现成候选）。说不出 ⇒ 放低一层；
   确有平台理由 ⇒ 登记单例例外（复审日期 + 搬家成本 + 触发条件）。
5. **按成本定抽象度。** 高成本缝（preset、工具面、流程契约、门禁）= 第一天就抽象；低成本内容（方法、
   检查表、领域词、政策数字）= 先具体，放进它该变的层。成本表 = 宪章 §8。
6. **落进层里，同 diff 更新清单面**：内容文件本身 + [manifest.json](../../../packages/company-pack/content/manifest.json)
   （content 侧新增/改名必改）+ 卡与 Note 的归位记录。目录 ↔ 层的现行对应 = [content/README](../../../packages/company-pack/content/README.md)。
7. **对照宪章 §9 红牌逐条自查**：公司名/行业词进通用层、方法名进 persona、没有方法槽的「通用能力」、
   为单一消费者造通用层、例子当规则、清单没更新。
8. **收尾写「归位」一节**（Note）：为什么这层 / 什么会逼它搬家 / 哪个更低的层被排除。

## 样例（真实发生过的归位）

**SA/SQA（2026-11-06 → 2026-11-09）**：结构对、层错。E/V 分家 = 流程（不变）；V 模型、`TC-###` 编号、五学科
= 方法（换公司/产品类型就变）。当时四样全塞进 persona 与 skill（最高成本层），于是换一家公司要改包——退役重做。
正确归位 = 极短的 preset 能力档（人）+ 共享流程 skill（流程）+ `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`
（方法）+ 公司政策层（政策）。这次按同一结构重做的卡 = `_backlog/issues/2026-11-10-producer-verifier-quality-loop.md`。

## 完成判据

- [ ] 四槽点名了，且写得出「这段内容跟谁一起变」。
- [ ] 卡的 `## 抽象度` 四问逐条有答案（不是一句「通用」）。
- [ ] 两测**真在草案上跑过**：删过什么、垮没垮，说得出。
- [ ] 第二消费者在盘上指认得出（或单例例外三件已登记）。
- [ ] 宪章 §9 红牌逐条自查，逐条有结论。
- [ ] manifest/索引同 diff 更新。
- [ ] Note 的「归位」三问写了。

## 指针（别复述）

规则与判据 = [内容宪章](../../../docs/content-charter.md)；目录 ↔ 层 = [content/README](../../../packages/company-pack/content/README.md)；
载入清单 = [manifest.json](../../../packages/company-pack/content/manifest.json)；
卡片模板的 `## 抽象度` = [_backlog 问题卡模板](../../../_backlog/issues/README.md)；
Note 的归位节 = [notes/README](../../../notes/README.md)；
persona 预算与内容唯一家 = `checks/gates/` 目录（清单 = 目录本身）。
