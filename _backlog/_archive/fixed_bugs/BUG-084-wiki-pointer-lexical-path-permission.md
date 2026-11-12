---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-084：wiki 指针用词法路径判「可写 / 只读」：symlink 内→外被标可写，`index.md` 是目录也算可用

> 严重级别：P2（次要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A3 / H9）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

`checkWikiPointer` 只做词法路径判断，不看真实目标与文件类型。实测（2026-11-12，`runtime/tmp/explore-startup-a3.mts`）：

| 输入 | 实测 | 期望 |
|---|---|---|
| workspace 内 `link-out` → symlink 到 workspace 外、含 `index.md` 的目录 | `{ok:true, location:'inside'}` | `ok:true`、`location:'outside'`（沙箱写不进） |
| workspace 外 `back-in` → symlink 回 workspace 内目录 | `{ok:true, location:'outside'}` | `location:'inside'`（真实目标可写） |
| `dirindex/index.md` 是**目录** | `{ok:true}` | `no-index`（`index.md` 必须是文件） |
| 输入 `~/wiki`（真实存在） | `{ok:false, problem:'missing', location:'inside'}` | `~` 展开，或明确拒绝并提示「不支持 ~」 |
| `/company-settings set wiki /a  b` | 存成 `/a b`（多空格被折叠） | 原样保留路径（或明确拒绝含连续空格的路径） |

前两条会让注入段说错写权限：内→外被告诉「可以按 wiki 的维护协议新增/修改页面」，实际 bwrap 写不进；外→内被告诉「只读」，实际可写。第三条会让模型被指向一个目录当 `index.md` 读。

## 根因（假设）

- `wikiLocation` 用 `relative(workspace, absolutePath)` 做词法判断（`src/host/startup/startup-store.ts:113-117`），不 `realpath`，symlink 不参与。
- `checkWikiPointer` 用 `existsSync(join(path,'index.md'))` 判「有 index」（`:139`），不判是否文件。
- `resolveWikiDir` 只做 `isAbsolute` 判断（`:108-111`），不展开 `~`。
- `parseSettingsCommand` 先 `split(/\s+/)` 再 `join(' ')`（`src/host/commands/settings-command.ts:43,55`），连续空格被折叠。

## 暴露的失败类

**三档权限判断用的是「路径字符串在不在 workspace 前缀下」，不是「真实目标在不在沙箱可写根下」**。任何 symlink / 硬链接 / `..` 之外的路径别名都会让「可写 / 只读」标签和注入段说反；`index.md` 的类型检查也只看存在。凡是把盘上事实翻译成权限/可用性结论的地方，都要先问「这是真实路径吗、这是文件吗」。

## 复现

```sh
node --import tsx/esm runtime/tmp/explore-startup-a3.mts
```

2026-11-12 原始输出（节选）：

```
symlink inside->outside: {"value":"link-out","ok":true,"problem":null,"location":"inside"}
write-through-symlink: allowed          # 该脚本无沙箱；真沙箱下这个写会 deny（Note 实测外盘写不进）
symlink outside->inside: {"value":"../outside-wiki/back-in","ok":true,"problem":null,"location":"outside"}
tilde path: {"value":"~/wiki","ok":false,"problem":"missing","location":"inside"}
index.md is dir: {"value":"dirindex","ok":true,"problem":null,"location":"inside"}
parse set wiki multi-space: {"value":"/a b"}
```

- 前两条的「真沙箱写不进」由 [wiki Note](../../../notes/implemented/2026-11-12-wiki-knowledge-map-landing.md) 的外部只读实测支撑；本卡只证分类错误。
- 证据脚本在 `runtime/tmp/`（gitignored）；如需长期复判，应转成 keyless spec。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- `wikiLocation`：对 `resolveWikiDir` 的结果做 `realpathSync`（不存在时用最近存在祖先 + 后缀，或直接按词法给 `null`/`unknown`）；真实目标在 workspace 内才 `inside`。
- `checkWikiPointer`：`statSync(index.md).isFile()`，不是 `existsSync`；symlink 用 `stat` 跟随、`lstat` 判链接本身。
- `~`：明确不支持时在面板/命令提示里说「请用绝对路径或相对 workspace 的路径」，不要静默当相对路径。
- 命令值解析：`set wiki` 取原始剩余字符串（保留空格），或支持引号；不要 `split` 后再 `join`。
- 新增 keyless spec：symlink 内→外/外→内、index 是目录、`~`、连续空格各一格；红→绿。

## 修复关联

- 发现于 A3；与 H9 一致。
- 相关合同：[`docs/contracts/profile.md`](../../../docs/contracts/profile.md) 的三档（内可写 / 外只读 / 失效）。
- 本卡不修；修 `checkWikiPointer`（host 行为 + 模型可见注入）属材料性，按章程请示。
- 2026-11-12 实跑：词法 `wikiLocation` + `existsSync(index)` 还原 → 4 failed；复原 → 25 passed（symlink 内→外/外→内、index 是目录、`~`、连续空格）。

## 已修判定

修成：wiki 指针的「可写/只读」按**真实目标**判（`realpath`，不存在时用最近存在祖先 + 后缀），`index.md` 必须是文件；`~` 展开；`set wiki` 取原始剩余串，连续空格不被折叠。

- keyless：symlink 内→外 = outside、外→内 = inside；`index.md` 是目录 = no-index；`~/wiki` 解析到 home；`/a  b` 原样保留。
- 红证：词法 `wikiLocation` + `existsSync(index)` 还原 → 4 failed；复原 → 25 passed。
