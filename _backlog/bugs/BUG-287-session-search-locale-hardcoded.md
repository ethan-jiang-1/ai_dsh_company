---
status: 修复就绪
severity: P2
opened: 2026-11-20
---

# BUG-287：探针/车道用英文 aria-label 定位会话搜索 —— 产品默认 zh 时整批导航失败

> 严重级别：P2（次要偏重：多个真入口车道与面板探针在默认语言下不可用）｜发现：2026-11-20（端到端验收）｜状态：修复就绪｜
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

`node checks/lanes/attention-e2e.entry.mjs` 在门A（CFO 触签核线）PASS 之后崩在导航：

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
  - waiting for getByRole('button', { name: 'Search sessions' })
    at checks/lanes/attention-e2e.entry.mjs:170:11
```

此后所有依赖「搜会话→打开会话」的车道/探针（任务板、在场板、成品目录、台账摘要、注意力等）在默认 zh 界面上都会卡在同一处。

## 复现

```
source run/env.sh
node checks/lanes/attention-e2e.entry.mjs     # 门A PASS，随后 Search sessions 超时
```

产品默认 locale = zh（`company` 字典 zh 为默认），vendor 侧同一按钮的 aria-label 是本地化的：

- `vendor/dsh/packages/client/ui-workspace/src/client/locales.ts:41` → `搜索会话`（zh）
- 同文件 `:167` → `Search sessions`（en）

## 根因与证据

定位器把英文可访问名写死，而可访问名随 locale 变。写死点（`grep -rn "Search sessions"`，2026-11-20 实测 10 处）：

| 文件 | 行 |
|---|---|
| `checks/lanes/attention-e2e.entry.mjs` | 145 |
| `probes/lib/probe-window.mjs` | 55 |
| `probes/browser-visual/tasks-panel-probe.mjs` | 64 |
| `probes/browser-visual/dag-midflight-probe.mjs` | 116 |
| `probes/team/member-rescue-probe.mjs` | 79 |
| `probes/session-context/human-exits-probe.mjs` | 94 |
| `probes/session-context/ceo-assembly-probe.mjs` | 138 |
| `probes/session-context/hitl-dispatch-order-probe.mjs` | 114 |
| `probes/session-context/reconcile-round-probe.mjs` | 138 |
| `tools/archive/harvest-probe.mjs` | 112（已耗，可不动） |

同批还有一层：这些脚本默认在「已装本包的 dev home」上跑，而管道里没有强制 `locale=en`，于是同一脚本在 en 隔离档能过、在默认产品档过不了——判据随环境漂。

## 失败类与同类排查

**失败类 = 定位器依赖本地化文本（环境相关判据）。** 同类：面板探针里其他中文/英文文案断言（`待批审批`、`双签`）也只在 zh 成立，应同时登记为「locale 绑定」而不是「产品文案回归」；`ui-scene --isolated --lang en` 已证明语言档可显式选择，说明修复方向是「显式选档 + 与档一致的定位器」。

## 已修判定

1. 共享定位器只定义一次（如 `probes/lib/probe-window.mjs` 导出 `sessionSearchButton(page)`，`name: /Search sessions|搜索会话/` 或 vendor 的 shortcut id/data 属性），其余脚本 import 它，不再各写英文；
2. `attention-e2e` 在默认 zh dev home 上跑通（门A→面板→应答→收口）；
3. 反向验证：把定位器改回只认英文，同一命令必须红（证明判据真的依赖语言而非偶然通过）。

## 修复方向（不授权，仅记录）

先补共享 helper + 一处消费（attention-e2e）拿红绿，再机械替换其余 8 处；`tools/archive/` 已耗件不动。
