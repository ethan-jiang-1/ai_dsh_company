---
topic: 编号词表与校验规则的 V1/V2/V4/V11 验证——盲测、lab 重键、负例、22 IFR trial
intent: 记录 2026-11-07 实际跑过的 V1/V2/V4/V11 结果与对 A1/A2/A5 的具体要求；不授予实施
---

# V1/V2/V4/V11 验证记录（2026-11-07）

## 0. 结论

- **V1 盲测**：模型选 **A 组**（`MR/REQ/IF/TC/AC`），并点名 B 组的 `VP→副总裁`、`SYR→叙利亚`、`STR→字符串`、`IFR→航空规则` 是更硬的先验撞车。**词表不改**。
- **V2 lab 重键**：16 StR / 33 SyR / 22 IR 计数与文档一致；33/33 SyR 有 STR 追溯、16/16 STR 被 SyR 覆盖、22/22 IR 有 SYR 追溯、无悬空、无重复 SyR 陈述。**唯一硬缺口 = 16/16 StR 没有机器可解析的 `MR-###` 上游**（lab 的追溯列是 MRD/PRD 章节散文，不是 ID）。
- **V4 负例**：重复定义、悬空、退役词、孤儿 4/4 判红；clean 绿。
- **V11 22 IFR trial**：22/22 正文定义、22/22 有 SYR 追溯；摘要表 22 行是**引用表**，与正文 22 个定义一一对应，无 21/23 式计数漂移。**同一份 IR 里“摘要表 + 正文标题”两种形态并存**——`definition` 头必须按文档声明，否则 checker 会把引用当定义。
- **这些是 prototype/单次运行，不是 A5 的真 checker，也不是 A8/B2 的真模型包。**

## 1. V1 词表盲测

- **模型/会话**：`standard` preset，`session-7e10ca57-dc1f-41b6-bbab-6c619765eb03`（2026-11-07，web 真模型，1 次调用）。
- **prompt**（裸 token，不给上下文、不许读文件/联网/工具）：

```text
A: MR, REQ, IF, TC, AC
B: STR, SYR, IFR, VP, V
1) 对每个 token，用一句话猜它最可能是什么（需求/接口/验证/其他）。
2) 如果要用作“需求、接口、验证”的编号前缀，哪一组第一眼更不容易读错？为什么？
3) 有没有哪个 token 会先让你想到别的东西（例如职位、组织、国家）？
```

- **输出要点**（原话摘录）：
  - “A：MR=市场需求；REQ=需求；IF=接口；TC=测试用例；AC=验收标准。”
  - “B：STR=字符串；SYR=叙利亚或含义不明；IFR=仪表飞行规则，也像接口需求；VP=副总裁；V=版本/vs。”
  - “选 A。五个都是两字母、互不为前缀、均为本域惯例；杂音只有 IF（编程‘如果’）、AC（交流电）。B 组形近更多：SYR/IFR 同收 -R，V 是 VP 的前缀（易读成截断），且都撞日常词。”
- **读法**：A 组胜出，但 A 也有 `MR→核磁共振`、`IF→if`、`AC→交流电` 的噪声；B 的 `VP`/`SYR`/`STR`/`IFR` 更硬。**只跑了一个模型一次**，这是支持证据，不是投票；结构结论（ID 只承载身份）不依赖它。

## 2. V2 lab 重键

**输入**（只读，不改）：`runtime/lifecycle-lab/real-ws/.dsh-company/deliverables/2026-11-06-portable-overload-requirements/drafts/{str,syr,irs}.md`。

**方法**：按文档形态取定义——StR 是表行 `| **STR-###** |`，SyR/IR 是 `#### SYR/IFR-###` 标题；追溯字段**按行首标签**取 `- **追溯**` / `- **追溯 / 验证**`，不用子串匹配；统计 ID/边/覆盖。

| 检查 | 结果 |
|---|---|
| 定义计数 | StR 16 / SyR 33 / IR 22，与文档声称一致 |
| SyR 有 STR 追溯 | 33/33 |
| STR 被 SyR 覆盖 | 16/16（无漏覆盖） |
| IR 有 SYR 追溯 | 22/22 |
| 孤儿 / 悬空 | 0 / 0 |
| 重复 SyR 陈述（精确归一） | 0 |
| **StR 有机器可解析的 `MR-###` 上游** | **0/16**（追溯列是 `MRD §…` / `PRD §…` 散文） |

**结论**：lab 的层间映射干净，V2 的“同一物不会两个号”没有出现反例；但 StR 的追溯是**人读散文**，不是 `traces: [MR-###]`。新模板必须把 StR 的上游写成机器可解析 ID，否则 R7 的“缺上游 = 红”对 StR 永远失效。

## 3. V4 负例

**方法**：新格式内联 fixture + 原型 checker（`layer`/`definition` 头、`### <ID>` 定义、行首 `- traces:`、退役词、孤儿）。**这是原型，不是 A5 真 checker。**

| fixture | 预期 | 结果 |
|---|---|---|
| clean：`MR-001` + `REQ-001 traces [MR-001]` | 绿 | `[]` |
| duplicate：两个 `### REQ-001` | 红 | `duplicate definition` |
| dangling：`REQ-001 traces [REQ-999]` | 红 | `dangling trace REQ-999` |
| retired：正文出现 `STR-001` | 红 | `retired token` |
| orphan：`REQ-001` 无 `traces:` | 红 | `orphan REQ-001` |

**4/4 负例红，clean 绿**。duplicate fixture 里顺手把 `MR-001` 也报了 dangling（fixture 没定义 MR）——这是预期噪声，不是假绿。

## 4. V11 22 IFR trial

| 检查 | 结果 |
|---|---|
| 正文 `#### IFR-###` 定义 | 22/22 |
| 每条有 SYR 追溯 | 22/22 |
| 摘要表 IFR 行 | 22 行 / 22 唯一 |
| 摘要表 vs 正文 | 无缺、无多 |
| 悬空引用 | 0 |
| 计数漂移（21 vs 23 型） | 0（22 = 22） |

**定义形态冲突（关键发现）**：同一份 IR 里，§1 摘要表有 22 个 `IFR-###` 表行，§2 正文有 22 个 `#### IFR-###` 标题。若文档声明 `definition: table-rows`，摘要表是定义、正文标题是引用；若声明 `definition: headings`，正文标题是定义、摘要表是引用。**两种都自洽，但不能同时算定义**。这正是 `layer/definition` 头要解决的问题；A5 必须按声明形态解析，不能“看到 ID 就算定义”。

**解析器教训**：第一版原型用“行内含 `追溯`”取追溯字段，把 IFR-008 的“可追溯性”散文当成追溯行，误报孤儿；改成行首 `- **追溯**` / `- **追溯 / 验证**` 后 22/22。**A5 的字段解析必须锚定行首标签，不能子串匹配。**

## 5. 对 A1/A2/A5 的具体要求

| 卡 | 这次 trial 逼出的要求 |
|---|---|
| **A1 合同** | 写明 `definition` 形态（`json-ledger` / `headings` / `table-rows` / `none`）；写明 `traces` 是**行首字段**、不是散文；StR 必须有 `MR-###` 上游；计数由索引派生，不写区间断言 |
| **A2 模板** | StRS 模板必须带 `traces: [MR-###]`；PRD 保留 `source`（MR）并加 `traces`（StRS/REQ）；allocation 是 `definition: none` 的附录，不立号 |
| **A5 checker** | 字段解析锚定行首；按文档 `definition` 形态取定义；摘要表默认引用；重复/悬空/退役/孤儿/计数五类红；把 IFR-008 式“正文含‘追溯’散文”做成回归 fixture |
| **A8/B2** | 仍未跑；需要真 checker + 真模型包；本 trial 不能替代 |

## 6. 证据与限制

- V1：1 次真模型调用，`standard` preset，session id 见上；输出全文在会话日志，本材料只摘录要点。
- V2/V4/V11：原型 Python（`/tmp/v2v4v11.py`、`/tmp/v4_negative.py`），lab 只读，不改历史；不是 A5 产品代码。
- **未跑**：A5 真 checker、A8 五层真跑、B2 VP-Eng 包、`pnpm verify`/`pnpm test` 全量。
- 这些结果不授予实施；只把“词表/规则/夹具有没有致命问题”从纸面推到可复核的原型证据。
