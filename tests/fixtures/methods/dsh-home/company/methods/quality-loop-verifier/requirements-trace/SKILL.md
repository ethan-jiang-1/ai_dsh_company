---
name: requirements-trace
description: 需求追溯方法（合成夹具）：验证侧逐 check-id 复核需求账本的编号、来源、验收与非范围。
metadata:
  method: requirements-trace
  version: 1.0.0
  side: verifier
---
# 需求追溯 · 验证侧（requirements-trace@1.0.0）

> 夹具用途：与 `producer/requirements-trace` 成对——同 `method`、同 `version`、`side` 不同。

## 输入契约

交接包（基线 + 产物路径 + 约束 + 方法）与产物本身。**不要**索取产出者的推理或自评。

## 程序

1. 打开产物，按下面检查表逐条判 `pass` / `fail` / `skip`（skip 必写理由）。
2. 每条 `fail` 落一条发现 `F<N> [<check-id>][blocker|advisory]`。
3. 检查表里每个 id 都要有一行——缺行即不通过。

## 检查表

| check-id | 判据 | 证据要求 |
|---|---|---|
| RT-01 | 每条需求都有唯一编号且不复用 | 指出重复/跳号所在行 |
| RT-02 | 每条需求都有来源（基线编号或"新增"理由） | 指出缺来源的行 |
| RT-03 | 每条需求至少一条可判真假的验收标准 | 指出不可判的验收原文 |
| RT-04 | 非范围单列且不与需求冲突 | 指出冲突对 |

## 输出契约

裁决正文：`## 裁决：pass|fail` + `### 检查表`（逐 id）+ `### 发现`（逐条编号）。
