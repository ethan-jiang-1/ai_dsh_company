---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-102：模型可写的 `meta.md` 用 `deliveryMode` / `productType` 路径穿越，让 `/delivery`、`/req` 读 workspace 里自造的规则并判通过

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C6 / 命令解析）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

交付物 `meta.md` 是角色（模型）可写的；`/delivery check` / `/req check` 从中取 `deliveryMode` / `productType`，直接拼进 **pack content** 路径：

```ts
join(contentDir, 'delivery-modes', mode, 'delivery-rules.json')
join(contentDir, 'product-types', id, 'check-rules.json')
```

`mode` / `id` 没有单段校验、也没有前缀 residency 检查。模型把路径写成 `../../workspace/evil-mode`，并在 workspace 写一份「零要求」规则：

```
delivery -> kind:success
  "交付检查通过（x）：交付模式 = ../../workspace/evil-mode；文档 0 份；section 0 条。"

req -> kind:success
  "本产品类型（evil）不走五层编号体系（层 = CUSTOM）；按 product-types/evil/overview.md 的文档链自查。"
```

`/delivery` 原本应因未知交付模式报错并列可用模式；`/req` 原本应因未知产品类型报错。现在两者都读了 workspace 里的**模型自造规则**，把缺 SOW/SLA/编号链的交付物判成通过。这直接违背「操作员跑、角色不自证」：模型写两个文件即可让检查器背书。

## 根因（假设）

- `delivery-command.ts` 的 `parseDeliveryMode` / `req-command.ts` 的 `parseProductType` 只做 yamlScalar/placeholder 清洗，不做 `^[a-z0-9-]+$`（或对 `availableModes`/`availableProductTypes` 的成员校验）。
- 规则读取直接 `join(contentDir, group, id, file)`，`..` 让目标落到 workspace（模型可写）；`readIfExists` 只判存在，随后 `JSON.parse` 使用。
- 错误分支「未知模式/未知类型」只在文件**不存在**时触发；路径穿越让文件存在，于是绕过。

## 暴露的失败类

**「规则 id」被当成路径段，而内容包根没有 residency 校验**：模型可写字段 + 拼接 pack 路径 + 只判存在 = 自造规则。同类：任何从 workspace 文件取 id 再拼进 content/preset 路径的命令（productType、deliveryMode、method pack、template）。

## 复现

```sh
node --import tsx/esm runtime/tmp/c6-rule-path-traversal.mts
```

2026-11-13 原始输出（节选）：

```
delivery -> {"kind":"success","text":"交付检查通过（x）：交付模式 = ../../workspace/evil-mode；文档 0 份；section 0 条。"}
req -> {"kind":"success","text":"本产品类型（evil）不走五层编号体系（层 = CUSTOM）…"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `deliveryMode` / `productType` 先做**成员校验**：必须在 `availableModes(contentDir)` / `availableProductTypes(contentDir)` 里（`productized` 例外）；不在就报「未知模式/类型」并列可用项，**不拼路径**。
- 即使成员通过，也做 `resolve` 后的前缀检查：规则文件必须在 `join(contentDir, group)` 下；拒绝 `..`/绝对/分隔符。
- `readIfExists` 对目录/非普通文件返回 undefined 并记 warning，不把 EISDIR 当可读。
- 加 keyless spec：`deliveryMode: ../../workspace/evil`、`productType: ../x`、`/abs`、`.`、空串、目录规则文件 → 命令 error，不读 workspace 规则；合法 mode/type 仍通过。

## 修复关联

- 发现于 C6；与 [BUG-099](BUG-099-deliverables-audit-nonexistent-final.md) 同属「人命令 + 模型可写 meta」的信任边界。
- 合同：[`docs/contracts/data-model.md`](../../../docs/contracts/data-model.md)；命令说明「角色不自证」。

## 已修判定

修成：`deliveryMode` / `productType` 先过 `isSafeContentId` 单段 slug，再用 `availableModes` / `availableProductTypes` 做成员校验；规则文件经 `contentMemberFile` 的 `relative` 前缀检查；`readIfExists` 只读普通文件；`/req` 的 delivery reminder 同样拒绝非成员模式。

- keyless：`deliveryMode: ../evil-mode` → error「未知交付模式」，不读 content 外零要求规则；`productType: ../../evil-type` / `/etc` → error「未知产品类型」；规则文件是目录 → 当缺失、不抛 EISDIR。
- 红证：去掉成员/slug 校验 → delivery 2 failed、req 1 failed；复原 37 passed。
