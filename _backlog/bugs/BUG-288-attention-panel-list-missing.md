---
status: 调查中
severity: P2
opened: 2026-11-20
---

# BUG-288：attention-e2e 过了语言关仍卡在「待办页签 → 待办事项列表」20s 超时

> 严重级别：P2（次要偏重：人机审批全回路这条唯一真验收入口仍不可用）｜发现：2026-11-20（端到端验收第二轮）｜状态：调查中（根因未定，不猜）
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

BUG-287（英文可访问名）修好后，`node checks/lanes/attention-e2e.entry.mjs` 能一路走到：

```
PASS 门A（cfo）approval/asked 落日志（request_signoff）
workspace connected（自动）
session opened
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
  - waiting for getByRole('list', { name: '待办事项' })
    at openAttentionPanel (checks/lanes/attention-e2e.entry.mjs:163)
```

即：签核请求已落日志、会话已打开、待办页签点击动作执行了，但 20s 内没有出现 `aria-label="待办事项"` 的列表。

## 复现

```
source run/env.sh && node checks/lanes/attention-e2e.entry.mjs
```
（真模型 + 真浏览器；门A PASS 后必现。）

## 已排除

- **语言**：门A 之前的所有英文可访问名已改双语正则并通过（BUG-287）。
- **签核未发生**：门A 断言 `approval/asked` 已落日志，PASS。
- **会话未打开**：`openSessionBySearch` 已返回（打印 `session opened`）。

## 待查（根因假设，未证）

1. **列表只在有等待项时渲染**：`AttentionTab.tsx:140` 的 `<ul aria-label={t('attention.waitingList')}>` 在空态不渲染；若面板读的投影在此刻仍为空（跨会话聚合时序），就会没有该 list。
2. **页签点击未命中**：`clickText` 按包含文本命中元素，可能点到了指南条外层而非页签按钮。
3. **跨会话聚合范围**：签核发生在 CFO 会话（rehearsal workspace），若面板只聚合当前 workspace/当前 store，则看不到。

判据：打开该会话的待办页签后 dump `document.body.innerText` + HTML，看面板实际文案与是否存在 `ul[aria-label=待办事项]`。

## 失败类与同类排查

**失败类 = 面板不渲染/渲染滞后，判据等待 20s（未证）。** 同类：`presence-panel`/`tasks-panel` 探针同样按 aria 名等列表，若属面板空态不渲染，会同样红；修法应落在「面板是否有稳定的空态容器/aria」与「探针是否该等容器而非列表」二选一，而不是单卡拉长超时。
