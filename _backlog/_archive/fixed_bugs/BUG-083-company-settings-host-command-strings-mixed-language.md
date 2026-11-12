---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-083：en 会话里 `/company-settings` 的命令描述、用法与「未知字段」错误仍是中文；A8 的 typed 字典没覆盖 host 命令面

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A2/A3 / H5）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

en home（`locale.preference=en`）里实测：

```
/company-settings show
→ Current: productType=auto, deliveryMode=auto, wiki=auto
  wiki=auto
  Product types: ...
  Delivery modes: ...

/company-settings set productType nope
→ Unknown value "nope"; available: business-software / hardware-software (use auto for no constraint)   ✅ en

/company-settings set nope x
→ 未知字段「nope」；可用：productType / deliveryMode / wiki                                                ❌ zh

/company-settings set
→ 用法：/company-settings [show | set <productType|deliveryMode|wiki> <值|auto> | reset]                    ❌ zh

commands/list(agentId) →
  description: "项目启动策略：产品类型 / 交付模式 / 参考资料 wiki（auto = 不约束）"                          ❌ zh
```

也就是说：`show` 和 `set` 的**正常回执**走了 `text(zh,en)`，但命令注册时的 `description`、`SETTINGS_USAGE`、`parseSettingsCommand` 的「未知字段」错误仍是单语中文；这些错误又在 handler 里以 `text(parsed.text, parsed.text)` 原样返回（两种语言同一串）。A8 声称「所有新增用户可见文案 zh + en 均在 typed 字典内」——host 命令面不在字典里。

## 根因（假设）

- `registerSettingsCommand` 的 `description` / `input.hint` 是注册时写死的字符串（`src/host/commands/settings-command.ts:94`），不经过 `options.text`。
- `SETTINGS_USAGE` 是模块常量中文（同文件 `:29`）；`parseSettingsCommand` 的未知字段分支直接返回中文（`:52-54`）。
- handler 对 `parsed.kind === 'error'` 调用 `text(parsed.text, parsed.text)`（`:107`），把中文同时当 zh/en。
- typed 字典 `locales.ts` 只覆盖 client 面；命令面没有对应 key。

## 暴露的失败类

**表达层双语只覆盖了 client 字典，host 命令面仍各自写字符串**：同一个功能一半 en 一半 zh；`description`/`hint` 是命令中心的可搜索文本，用户在 en 下看到中文会以为命令坏了。凡新增 host 命令，都要和 UI 文案同一条「zh + en 同 diff」纪律。

## 复现

1. 起隔离 en 实例（本次 `runtime/tmp/ui-scene-TsHVS3`，`cordis.patch.yml` preference=en）。
2. `session/create { cwd: …/company-workspace, agentPreset: 'ceo' }`。
3. `commands/execute` 依次跑 `show`、`set productType nope`、`set nope x`、`set`；`commands/list {agentId}` 取 description。
4. 实测输出如上；证据 = `runtime/tmp/rpc-en.mjs`、`runtime/tmp/rpc-en-cmds.mjs`（gitignored）。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- `SETTINGS_USAGE` 改成 `(text) => text(zh, en)` 或双语文案表；`parseSettingsCommand` 只返回结构化 error code，由 handler 统一 `text()`。
- `description` / `hint` 需要 vendor 的 commands 注册面支持 per-locale，或改为从 typed 字典取当前语言（注册时绑定 `language.text` 的闭包）。先核对 vendor `commands.register` 的 description 是否支持函数/重注册。
- 加一条 en 命令回执 spec：`show`、`set` 成功/失败、`reset`、unknown field/value 全部无 CJK；`commands/list` 的 description 无 CJK。

## 修复关联

- 发现于 A2/A3；与 H5 一致。
- 相关：A8 的 typed 字典边界（归档卡 `2026-11-12-startup-settings-landing.md`）。

## 已修判定

修成：`/company-settings` 的 description / hint / usage / 未知字段错误 / 回执都从 zh+en 字典取当前语言；语言切换时重注册 description（vendor 注册面没有 per-locale provider）。en 会话里命令中心与错误路径不再出现中文。

- keyless：en 挂载后 description / hint / usage / 未知字段 / `show` 全都不含 CJK；语言从 zh 切 en → 旧注册 dispose、新 description 为 en。
- 红证：把 description 改回硬编码中文 → 2 failed；复原 12 passed。
