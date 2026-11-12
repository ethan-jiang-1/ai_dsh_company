---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-101：`concurrent-home-smoke` 仍按 v2 读 `home/bundle.json`，v3 下必 ENOENT；lease 断言在 banner 后立即读输出，第二个 writer 告警晚到 → `blocked=0` 假红

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C7 / 发布安装）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`node checks/smoke/concurrent-home-smoke.mjs --keep`（当前源码 tarball，v3 身份）：

```
① 同 home 两进程同时首启
  PASS 两个进程至少一个能启动（up=2 down=0）
  FAIL 同 home 恰好一个 writer（另一个被点名停写）（up=2 blocked=0）
  PASS 并发实例可建会话 ×2
② 事后完整性：bundle/catalog/数据可解析
concurrent-home-smoke: Error: ENOENT: no such file or directory,
  open '/…/runtime/concurrent-home-smoke/home/bundle.json'
  at checks/smoke/concurrent-home-smoke.mjs:63
```

两个失败都是**检查器陈旧/时序**，不是产品：

1. **v3 不再在 home 根写 `bundle.json`**（[修复 Note](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md) / v3 数据模型：身份在 `<workspace>/.dsh-company/bundle.json`）；脚本仍 `readFileSync(join(HOME,'bundle.json'))`，所以必然 ENOENT。
2. **lease 告警晚于启动 banner**：脚本在 `Promise.allSettled([boot(), boot()])` 返回后**立即**用 `item.output().includes('另一个 writer')` 判 `blocked`。手工复跑同一 base/profile，两个 writer 都起来后**等 3 秒**再看输出，第二个进程确实打印：

```
dsh: company-pack：另一个 writer 正在使用这个 home（pid …）；公司数据已停写…
```

即 lease 本身生效；脚本读得太早，得到 `blocked=0` 的假红。

## 根因（假设）

- `checks/smoke/concurrent-home-smoke.mjs:63` 的 v2 `home/bundle.json` 断言未随 v3 身份迁移更新。
- `:51-53` 的 `blocked` 是单次快照，不是「等待两个 writer 的 lease 结论稳定后再计数」；启动 banner 早于 host 后半段的 company runtime 告警。
- 两个问题叠加：脚本**每次都红**（ENOENT），lease 断言又**会漏真 blocked**（时序）。

## 暴露的失败类

**发布前 smoke 断言用的是旧数据形状 + 单次快照**：v3 迁移只改了产品，没改这条 smoke；lease 这种「进程后半段才出现」的告警被 banner 时序打败。同类：任何「启动后输出」的断言都要等一个稳定事件，任何身份/manifest 断言都要跟当前 schema。

## 复现

```sh
node checks/smoke/concurrent-home-smoke.mjs --keep
# 然后用 --keep 留下的 base 手工两个 writer，等 3 秒看输出：
node runtime/tmp/two-writer-check.mjs
```

2026-11-13 原始输出：

- smoke：`FAIL …（up=2 blocked=0）` + `ENOENT …/home/bundle.json`。
- 手工：`dsh: company-pack：另一个 writer 正在使用这个 home（pid …）；公司数据已停写…`。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 把 `bundle` 读取改成 `<WS>/.dsh-company/bundle.json`，断言 v3 `id/createdAt/pack`（参考 release-smoke 的 v3 断言）。
- `blocked` 改成等待式：两个 writer 启动后 poll 输出 N 秒，直到「两个都已出 lease 结论」（一个正常、一个 blocked）或超时；不要用 banner 后立即快照。
- 若两个都正常，再判真失败；若一个 blocked 告警晚到，记录等待时间。
- 加 `--keep` 失败诊断落盘；修后重跑，确认 `ALL PASS`，再把它作为发布前置。

## 修复关联

- 发现于 C7；与 [BUG-080](../fixed_bugs/BUG-080-en-tab-title-map-missing-strategy.md) 同属「检查器手维护形状/时序、产品已迁移」。
- 相关：[`docs/runtime-map.md`](../../../docs/runtime-map.md) 二·五（v3 身份在 workspace）；`checks/smoke/concurrent-home-smoke.mjs`。

## 已修判定

修成：smoke 在 boot 前创建 `WS`；bundle 读 `<WS>/.dsh-company/bundle.json` 并断言 v3 `id/createdAt/pack` 且 home 根不再有；lease 结论改成轮询最多 10s 直到「恰好一个 blocked」；catalog/数据路径补 `.dsh-company/`。

- 真跑：`node checks/smoke/concurrent-home-smoke.mjs` **ALL PASS**（up=2 blocked=1；bundle v3；catalog/数据可解析；事后单实例 boot 与 roster 正常）。
- 红证（修复前）：`blocked=0` + `home/bundle.json` / `WS/.dsh-company/bundle.json` ENOENT。
