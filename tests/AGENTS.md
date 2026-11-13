# tests/ · 加 spec 的门（薄；导航唯一家 = README）

> 你为什么看到本文件：正在写 `tests/`。先看 README 的「改动面 → 最窄检查」。

## 三问

1. 这条 spec 钉的是行为，还是事实/不变量？
2. 失败是 typed 还是静默？外部字节变了吗？
3. 新写入口/新持久化路径登记了吗？
4. 文件名对得上证据类型与 lane 吗（spec / e2e / entry / test）？规则 = [testing.md §1.1](../docs/testing.md) + `naming-contract` 门禁。

## 新持久化事实

- 先加 shape（tests/support/world-shapes.ts），再加矩阵行；
- 登记 tools/lib/carrier-registry.mjs；跑 `company-root-carriers`。

## 门禁

- layering / spec-duplicates / guard-red-record / company-root-carriers
