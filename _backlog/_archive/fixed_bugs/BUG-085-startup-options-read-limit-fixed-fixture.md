---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-085：选项读上限 64 行对内容增长不设防；「最坏形状」spec 只钉当前 2+3 内容，超限时面板静默空下拉

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A3 / H10）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

`STARTUP_OPTIONS_READ_LIMIT = 64`（行）被写死；客户端按 `limit: 64` 读 `startup-options.json`（`src/client/index.ts:156`）。内容目录变多时，序列化行数会超过 64：

实测（合成内容目录，`runtime/tmp/explore-startup-a3.mts`）：

```
60 product-types + 10 delivery-modes → serializeStartupOptions = 85 行
parseStartupOptions(前 64 行) → { productTypes: [], deliveryModes: [], wikiCheck: EMPTY }
parseStartupOptions(完整 85 行) → 60 个产品类型 / 11 个交付模式
```

客户端拿到截断 JSON 后 `JSON.parse` 抛错 → `parseStartupOptions` 折成空集合 → 面板只剩「自动」+「公司内容里还没有可选项；先装内容包」，**没有任何错误提示**；实际内容包是好的。

`tests/lib/startup-settings.spec.ts:143-150` 的「最坏形状」只用当前 2 个产品类型 + 3 个交付模式（19 行），所以这条 spec 绿不等于「上限对内容规模安全」——它是固定夹具，正好掩盖了同类的 13→19 行教训（Note 2026-11-12 实修）。

## 根因（假设）

两个事实各自写死、没有派生关系：

- 上限是常量 64；
- 派生文件的行数由 `content/product-types/` + `content/delivery-modes/` 的目录数决定，没有上限/预算；
- spec 的「最坏形状」是手写夹具，不读真实内容目录、也不按 N 增长。

## 暴露的失败类

**「最坏形状」用手写夹具冒充不变量**：一个跨两端约束（写方行数 ≤ 读方 limit）只被当前内容规模证明。同类：任何「按内容枚举 + 固定缓冲区」的组合都会在内容变多时静默丢数据。

## 复现

```sh
node --import tsx/esm runtime/tmp/explore-startup-a3.mts
# 末段：options lines: 85 limit: 64；parse truncated → 空集合
```

或最小复现：

1. 在临时 `content/` 下建 50+ 个 `product-types/<id>/` 目录。
2. `enumerateStartupOptions(contentDir)` + `serializeStartupOptions` → 行数 > 64。
3. 把前 64 行交给 `parseStartupOptions` → 空集合；面板读同一段会显示「没有选项」。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- 让读方上限从写方形状派生：例如 `STARTUP_OPTIONS_READ_LIMIT` 改为 `base + maxEntries` 的公式，或客户端读整文件（`limit` 设一个明显大于内容上限的值）并在截断时 fail-loud（`workspaceFiles.read` 的 `eof`/`lines` 若可判）。
- 写方对选项数设预算（产品类型/交付模式各 ≤ N，超出 fail-loud 或分组），并在 `pnpm verify`/`content-manifest` 侧对真实内容目录算一次行数。
- spec 改成按「最多允许 N 个类型/M 个模式」的最坏形状，而不是当前目录的硬编码快照；再补一条「截断时面板必须报错而不是空集合」的判据。

## 修复关联

- 发现于 A3；与 H10 一致。
- 同族教训：Note [`2026-11-12-startup-settings`](../../../notes/implemented/2026-11-12-startup-settings.md) 的「13→19 行截断」实修；本卡是同一根因在内容增长面的复发。
- 2026-11-12 实跑：读上限改回 64 → 最坏形状 1 failed；解析折空 → 截断用例 1 failed；复原 → 24 passed + 真实 content 预算 spec。

## 已修判定

修成：选项读上限从预算派生（`32 + STARTUP_OPTIONS_MAX_ENTRIES`），「最坏形状」按上限条目数生成而不是当前 2+3 快照；截断/坏 JSON 变成 `unreadable`，面板说「选项文件读不出来」而不是静默空下拉；真实 `content/` 由预算 spec 每次算一次。

- keyless：预算上限条目数序列化行数 ≤ 读上限；截断文本 → `problem:'unreadable'`；面板渲染该错误且不显示「内容里没有可选项」。
- 红证：读上限改回 64 → 最坏形状用例红；解析折空 → 截断用例红；面板忽略该态 → 面板用例红。
