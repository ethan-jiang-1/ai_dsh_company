---
status: 调查中
severity: P1
opened: 2026-11-08
---

# BUG-039：workflow 大结果被 50k 硬截断，spill 文件也是截断副本——缺的段找不回来

> 严重级别：P1（重要）｜发现：2026-11-08｜状态：调查中

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

- 已在 `eng-teaming` 的“返回聚合/异常”条目加一句：50k 是硬截断，spill 文件也是截断副本，别指望
  读 spill 找回；大结果让分支落文件或只回聚合/异常。
- 研究材料 §1.1 的 “canonical 值仍完整” 已就地更正为“引擎内存完整、模型可读面截断”。
- vendor 未改；可选上游修法：workflow 工具在截断前把完整渲染值交给 spill store，或返回一个可读的
  完整结果 locator（而不是截断副本）。

## 已修判定

- >50k 的 workflow 返回值至少有一个模型可读的完整通道（spill 文件或显式 locator），且 notice 与
  实际文件内容一致；或本仓明确把“50k 以上结果不可恢复”写进 tool 描述/技能并在真实会话中稳定观察到
  模型改用“分支落文件 + 聚合”模式。
