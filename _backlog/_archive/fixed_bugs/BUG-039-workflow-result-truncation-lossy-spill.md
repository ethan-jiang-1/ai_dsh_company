---
status: 已修
severity: P1
opened: 2026-11-08
---

# BUG-039：workflow 大结果被 50k 硬截断，spill 文件也是截断副本——缺的段找不回来

> 严重级别：P1（重要）｜发现：2026-11-08｜状态：已修（2026-11-08）｜审查：agent — 修法选“配置真修”而非教模型绕：tool-workflow 的 maxResultChars 是配置项（默认 50000），本仓 vp-eng preset 抬到 200k；真模型探针证明 71,677 字符的全量结果落 spill 且可读，工具结果无截断标记。判定第一条满足

## 症状

R7 压力试验：workflow 6 个分支各返回 400 行（每行 33 字符），父脚本把 6 段原文放进
`{"rows":[...]}`。完整渲染约 **85,908 字符**。模型实际收到：

- tool result 文本 **49,929 字符**，尾部带 `… [truncated: 35806 more characters]`；
- 末尾另有一条 spill notice：`(Omitted 418 bytes. Full formatted result stored at:
  /var/folders/.../dsh-spill-.../session-.../fd2a036353ca-workflow.txt. Use read with offset/limit...)`；
- **该 spill 文件只有 50,102 字符/50,104 字节，且同样包含 `[truncated: 35806 more characters]`
  标记**——它不是完整结果，是截断后的副本；
- 父代理只能拿到 rows 0–2 完整、row 3 前 200 行、row 4/5 为空；落盘的 `raw.json` 51,557 字节，
  并在 `missing` 里如实记 `m04-line-201..400`、`m05`、`m06`。

即：**丢失的约 35.8k 字符不在任何模型可读通道里**；spill notice 的 “Full formatted result” 是谎报。

## 根因（假设）

`tool-workflow` 在返回前用 `maxResultChars`（默认 50,000）硬截断渲染值：

```
rendered.slice(0, maxChars) + "\n… [truncated: N more characters]"
```

随后 core 的 spill policy 对 `content` 做 `saveText({ content: fullText(content) })`——此时 `content`
**已经是被截断的文本**，所以 spill 文件长度 ≈ 50k 且含截断标记。完整值只存在于引擎内存的
`WorkflowResult.value`，没有持久化给模型。后台 `jobOutcomeOf` 也走同一 `maxChars`，同样丢。

## 暴露的失败类

- 大结果数据丢失：>50k 的 workflow 返回无法从工具结果或 spill 文件恢复；模型只能记 missing。
- 合同谎报：spill notice 说 “Full formatted result”，实际是截断副本；本仓研究材料/旧 Note 也曾写
  “canonical 值仍完整”——对模型可读面不成立。
- 风险场景：大审计/迁移/多文件扫描若把全量 rows 放进返回值，会静默丢尾段；若模型不核对行数，
  会把部分结果当全量交付。

## 复现

1. vp-eng 会话，prompt 要求 workflow 6 分支各生成 400 行、父脚本原样返回 6 段（`prompt-r7.txt`）。
2. 读 tool result：49,929 字符 + `… [truncated: 35806 more characters]` + spill notice。
3. `ls -l`/`wc -m` spill 文件：约 50,102 字符，tail 仍含 truncation 标记；与完整 85,908 字符不符。
4. 证据：`runtime/tmp/explore/ex1/R7/summary.json`；会话
   `session-c839c3c9-6117-49dd-a9ab-2a21e47b865b`；spill 路径在会话语境中（OS temp）。

## 发现路径（探索方向）

“结果溢出”压力 charter（R7）：不让模型自己聚合，而是明确要求**原样返回全量 rows**，把返回值推过
50k。**探索方向提示**：截断/spill 类契约要同时查三处——tool result 文本、spill 文件本身、以及
“完整值”是否还有别的可读通道；只看 notice 会以为可恢复。

## 修复关联

- 探索轮的 `eng-teaming` 那句“50k 硬截断、spill 也是截断副本”**已被修复轮取代**（不要再写回去）：
  现行规则 = 上限 200k；超过内联预算（约 12.5k tokens）落 spill（头尾预览 + 全文路径）；>200k 才硬截断。
- **真修（2026-11-08）**：`tool-workflow` 的 `maxResultChars` 是配置项（`packages/company-pack/presets/vp-eng/agent.cordis.yml`
  的 workflow 行，200000）。这让引擎的 spill 设计生效：工具交全文 → spill-policy 保留头尾 + 把**全文**写盘 +
  给可读路径。默认 50000 时是“先截断再落盘”，所以旧 spill 文件才是截断副本。
- 研究材料 §1.1 的 “canonical 值仍完整” 已就地更正为“引擎内存完整、模型可读面截断”。
- 绿色替代已验证（R9）：6 分支各自把 400 行写到 `.dsh-company/deliverables/spill2/branch-m0X.txt`，
  父脚本只返回 `{name,path,lines}`（约 0.6k 字符，未触发截断）；父代理再用 `wc -l`/`awk`/`md5` 独立
  核对 6×400 行，全部通过。
- **证据（修复轮真模型探针）**：`runtime/tmp/explore/fix1/S039/`；会话 `session-88afce0d-…`。
  4 分支 × 500 行、父原样返回全量 rows：工具结果 49,931 字符 + `(Omitted 21993 bytes … stored at: …)`、
  **无 `[truncated:`**；spill 文件 71,677 字符，含 `m01-line-1` 与 `m04-line-500`，无 Omitted/截断标记；
  模型 `read`/`grep` 读回并核对。对照原症状（49,929 + `[truncated: 35806 more characters]`、spill 50,102 且含同一标记）。
- **资产**：`tests/harness/contract/workflow-result-budget.spec.ts`——钉住 `maxResultChars` 控制渲染，
  且 vp-eng preset 真带 200000；红配方 = 删 preset config → 第三条红。
  缺口（如实记）：端到端“spill 文件完整”目前靠一次性探针，未进 CI；钉子只覆盖“工具不截断”。
- vendor 未改；上游仍建议 workflow 工具在截断前把完整渲染值交给 spill store（默认值下的其它消费者受益）。

## 已修判定

- >50k 的 workflow 返回值至少有一个模型可读的完整通道（spill 文件或显式 locator），且 notice 与
  实际文件内容一致；或本仓明确把“50k 以上结果不可恢复”写进 tool 描述/技能并在真实会话中稳定观察到
  模型改用“分支落文件 + 聚合”模式。
