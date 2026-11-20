---
status: 已修
severity: P2
opened: 2026-11-20
---

# BUG-285：upgrade-while-running 守卫冻结了已废止的「身份保留创建版本」语义（自 BUG-256 起常红）

> 严重级别：P3（次要：守卫红，但产品语义按 BUG-256 是对的）｜发现：2026-11-20（端到端验收）｜状态：已修｜修复：2026-11-20｜审查：agent（同轮红绿实证）
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

`node checks/lanes/upgrade-while-running.entry.mjs` 在重启到下一 patch 后报：

```
FAIL bundle 身份保留创建版本 0.11.9（0.11.10）
upgrade-while-running-smoke: 1 FAILURE(S)
```

其余步骤（运行中 remove/add、旧 session、数据在场）全 PASS。

## 复现

```
source run/env.sh && node checks/lanes/upgrade-while-running.entry.mjs
```
（前置：`_dist` 有当前版 tarball。）

## 根因与证据

lane 断言 `bundle.pack.version === 创建版本`，注释依据是 0.7.0 语义。BUG-256（2026-11-18，c16）把语义定为：**同 name 的版本变化 = 正常升级**——保留 `id`/`createdAt`，`pack.version` 跟到新装版本；BUG-279（2026-11-19）补上旧字节备份 `bundle.json.v3-<old>.bak`。lane 与 2026-11-01 Note 的一句验收记录都没随这次决定更新，于是守卫长期红、无人在意（真入口 lane 不在每轮 CI）。

## 失败类与同类排查

**失败类 = 判据/期望漂移（守卫与最新决定不一致）。** 同类：`docs/contracts/data-model.md` 只写「只创建/原地升 v3」，未写版本升级会改写 `pack.version`；已在本轮同时修正 lane 注释与 2026-11-01 Note 的现行事实句。

## 已修判定

lane 断言现行语义：升级后 `id`/`createdAt` 不变、`pack.version` 等于新装版本、`bundle.json.v3-<旧版>.bak` 存在且内容为旧字节；跑通 ALL PASS。

## 修复证据

- 改动面：`checks/lanes/upgrade-while-running.entry.mjs`
- 红：`node checks/lanes/upgrade-while-running.entry.mjs` → `FAIL bundle 身份保留创建版本 0.11.9（0.11.10）`（1 FAILURE）
- 绿：`node checks/lanes/upgrade-while-running.entry.mjs` → `upgrade-while-running-smoke: ALL PASS`（含 id/createdAt 保留、pack.version=0.11.10、备份在场）
- 提交：commit bee0f4fc
