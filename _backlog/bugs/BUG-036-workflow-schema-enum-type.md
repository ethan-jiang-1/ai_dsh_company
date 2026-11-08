---
status: 调查中
severity: P2
opened: 2026-11-08
---

# BUG-036：workflow `agent({schema})` 的 enum/const 必须配 type，但模型面描述没说

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：调查中

## 症状

真模型在 R2 强制 workflow 试验中第一次 run 直接 `stopReason: error`，零 agent 启动，错误：

```
agent() schema is outside the supported subset — unsupported JSON schema:
schema.properties.status.enum requires type or oneOf
```

模型把 `status: { enum: ['ok','missing','corrupt'] }`（标准 JSON Schema 合法写法）放进 property
schema；`assertObjectJsonSchema` 的子集要求 enum/const 挂在已声明标量 `type` 的节点上。模型看到错误后
补 `type: 'string'` 并重跑整轮——第二次 run completed（6 agents）。第二次 run 的 schema 形状：

```js
status: { type: 'string', enum: ['ok', 'missing', 'corrupt'] }
```

工具面描述只写 “object-rooted JSON Schema using ONLY type/properties/required/additionalProperties/
items/enum/const/oneOf”，没有说 “enum/const 需要兄弟 type”；对模型来说这是合法却 fatal 的输入。

同一子集还拒绝 **type 数组**：R13 的 fork child 第一次 run 用 `type: ['string','null']`（标准
JSON Schema 写法），报 `schema.properties.version.type must be a single type string (type arrays are
not supported)`；改成 `oneOf: [{type:'string'},{type:'null'}]` 后重跑成功。

## 根因（假设）

vendor `tool-workflow` 的 model-facing description 列举了允许关键字，但没有转述 `dsh-tools`
`assertObjectJsonSchema` 子集的节点约束（enum/const 只能出现在标量 type 节点；oneOf 不能与 type 并列）。
本仓 `eng-teaming` 之前也没有这条。属“工具合同 vs 模型提示面”不一致，不是分支失败。

## 暴露的失败类

- schema 子集误用 → **整轮 fatal**（run 无 partial success），不是 per-item null；一次失败浪费一整轮
  run（含后台场景的 job 生命周期）。
- 模型能自愈（读错误、改 schema、重跑），但成本是一轮 run + 一段失败诊断；若在 `run_in_background`
  或长任务里，失败可能被当成“任务失败”而不是“提示面缺陷”。

## 复现

1. 在 `runtime/rehearsal-workspace/exp/ex1/R2` 放 6 个 module + 1 个坏 JSON + 缺文件（fixtures 见
   `runtime/tmp/explore/fixtures-r2.json`）。
2. vp-eng 会话，prompt 要求“用 workflow 扇出 6 模块，schema 带 status 枚举”（`prompt-r2.txt`）。
3. 观察 `tool-workflow/run-start` 后立刻 `run-end stopReason=error`，`agent-start` 为 0；错误文本同上。
4. 证据：`runtime/tmp/explore/ex1/R2/summary.json`；会话 `session-375dd67f-3d57-437c-a1fc-17a7955c7c80`。
5. type 数组复现：R13 fork child `613602aa-…`（父 `session-1351d1e2-…`）第一次 workflow run 的错误原文
   同上；证据 `runtime/tmp/explore/ex3/R13/summary.json`。

## 发现路径（探索方向）

“强制 workflow + 失败面/缺失源”charter（R2）：为了让分支有可失败输入，任务要求模型自己写 schema
聚合并处理 missing/corrupt；模型自发用 enum 表达状态，撞上子集约束。**探索方向提示**：让模型自己
设计 schema / 聚合形状，比只让它“跑 workflow”更容易撞到工具合同边界。

## 修复关联

- 已在 `eng-teaming` 的 workflow 硬规则加一条：enum/const 必须同时写 type，`type` 只接受单个字符串
  （联合类型用 `oneOf`），oneOf 不能与 type 并列，根必须 object；否则整轮 `UNSUPPORTED_SCHEMA` fatal。
- 绿证据（R6）：新会话 `session-e25adbbf-22c5-4e38-a999-1b4edb56ca11`，单 run / 7 agents /
  `run-end completed`，schema 已写成 `{ type: 'string', enum: [...] }`；无第一次 fatal。
- 上游侧仍建议补一句 model-facing description（本仓不改 vendor）。

## 已修判定

- 模型面文档（vendor 或本仓 skill）明确写出 enum/const 的 type 要求与 type 单值约束；且
- 一次以 enum 表达状态的 workflow 首跑即 completed、零 `UNSUPPORTED_SCHEMA`（本项目内可由 R6 型
  场景复验）。
