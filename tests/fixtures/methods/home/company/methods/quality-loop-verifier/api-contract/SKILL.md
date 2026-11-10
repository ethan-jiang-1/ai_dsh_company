---
name: api-contract
description: 接口契约方法（合成夹具）：验证侧逐 check-id 复核端点完整性、破坏性变更的迁移路径与幂等语义。
metadata:
  method: api-contract
  version: 2.1.0
  side: verifier
---
# 接口契约 · 验证侧（api-contract@2.1.0）

> 夹具用途：与 `producer/api-contract` 成对；与 `requirements-trace` 并存 = 方法层的第二消费者。

## 输入契约

交接包与产物本身。字段有歧义时按"调用方会怎么读"判，不要按产出者的意图补全。

## 程序

1. 逐 check-id 判 `pass` / `fail` / `skip`（skip 必写理由）。
2. 每条 `fail` 一条发现 `F<N> [<check-id>][blocker|advisory]`。
3. 检查表每个 id 都要有一行。

## 检查表

| check-id | 判据 | 证据要求 |
|---|---|---|
| AC-01 | 每个端点都有请求/响应字段与错误码 | 指出缺字段/缺错误码的端点 |
| AC-02 | 破坏性变更单列且各有迁移路径 | 指出无迁移路径的条目 |
| AC-03 | 幂等语义写明（键/范围） | 指出缺幂等说明的端点 |

## 输出契约

裁决正文：`## 裁决：pass|fail` + `### 检查表` + `### 发现`。
