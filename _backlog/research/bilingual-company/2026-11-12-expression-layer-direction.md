---
topic: 表达层双语、内部英文 canonical 与角色名映射
intent: 把用户 2026-11-12 的方向修正落成可执行边界：双语只在表达层；内部代码/提示/内容用英文单份；角色名进入表达层；回答「这是否改变 Phase B」。
---

> 下游：[内部全英文 canonical RFC](../../../notes/proposed/2026-11-12-internal-english-canonical.md)（I1/I2/I3 + 表达层 E1）；问题卡 = [归档卡](../../_archive/settled_issues/2026-11-12-internal-english-canonical.md)。

# 表达层双语、内部英文 canonical 与角色名

## 1. 用户原话与我的理解

> 「DSH company里头角色名可能也需要中英文支持，我觉得中英文支持是表达层支持就行了，内部用英文是没有问题的，可以理解吧。嗯，我觉得代码内部用英文是最好、最理想。」

我的理解：

1. **双语 = 表达层**：用户看得见的 UI 文案、角色显示名、回复/交付物的语言；不是把内部实现复制成中英两份。
2. **内部英文 canonical**：代码标识符/key/ID/数据值、模型侧提示与内容，用英文单份；中文是表达层的一种渲染，不是第二套内部真相。
3. **角色名属于表达层**：canonical 是角色 id + 英文名；中文界面/中文输出用中文显示名，英文界面用英文名；数据与日志仍用 canonical id/英文名。
4. **不新建 `content/en/` 双语副本**：Phase B 应把内部内容/角色文案**翻成英文单份**，中文由 language policy 表达；不是中英双份维护。这与当前 RFC 里“中文正文 + 英文 overlay”的 Phase B 不同，需要修正。
5. **代码注释/日志不是表达层**：标识符/key/ID/数据英文；注释是否全量英文化是独立清理，不在本 i18n RFC 里混做，避免与现有中文注释风格半英半中。新代码的标识符/key 用英文；注释可以跟随所在文件现状。

## 2. 三层边界（建议写进 language 合同）

| 层 | 语言 | 例子 | 谁消费 |
|---|---|---|---|
| **表达层** | zh/en 可切 | UI 文案、角色显示名、命令回执、交付物/回复 | 人 |
| **内部 canonical** | 英文单份 | 代码标识符/key/ID、preset id、角色 id、数据字段值、日志、模型提示/内容 | 代码/模型 |
| **发行文档** | 按需 | README/安装手册/docs | 仓库/发行读者 |

**关键**：表达层可以有 zh/en 两个字典；内部只能有一份。**禁止**把内部内容做成 `content/zh/` + `content/en/` 两套语义等价正文——那是两本账，翻译/审校/门禁都会翻倍。

## 3. 角色名盘点

### 3.1 现有 canonical 与展示

| 面 | 现在 | 归属 |
|---|---|---|
| `presets/*/agent.cordis.yml` `config.name` | `CEO` / `VP-Eng` / … | canonical 英文名（picker 用） |
| `presence-status.ts` `PRESET_DISPLAY_NAMES` | 同上的英文缩写 | 内部/数据读模型 |
| `presence-status.ts` `PRESET_SHORT_LABELS` | 同上的英文缩写 | 内部/培养署名 |
| `RoleBadge.tsx` `ROLE_SHORT` | `CEO` / `VPE` / `VPS` | 表达层（title/窗口标题） |
| `RoleBadge.tsx` `ROLE_MARK` | `C/F/O/M/E/S` | 表达层（16px 座位） |
| `DelegationCard.tsx` `ROLE_LABEL` | `VP-Eng（研发）` 等中文括号 | 表达层 |
| `bootstrap.ts` `ROLE_LABEL` | `CEO` / `VP-Eng` | 数据（org/owners 快照） |
| `roleLabel()`（cultivation 命令/工具/面板） | 英文缩写 | 表达层（host + client） |

**事实**：数据/API/preset 名已经是英文，这是对的；缺的是**表达层的 zh/en 映射**，不是再改一套 id。

### 3.2 建议的角色目录

canonical（内部，英文，不动）：

```ts
type RoleId = 'ceo' | 'vp-eng' | 'vp-sales' | 'coo' | 'cfo' | 'cmo'
const ROLE_NAME_EN = { ceo: 'CEO', 'vp-eng': 'VP-Eng', ... }
```

表达层字典（`company` namespace，zh/en 成对）：

| key | zh | en |
|---|---|---|
| `roles.ceo.name` | 首席执行官 | CEO |
| `roles.ceo.short` | CEO | CEO |
| `roles.ceo.full` | 首席执行官 | Chief Executive Officer |
| `roles.vp-eng.name` | 工程副总裁 | VP-Eng |
| `roles.vp-eng.short` | VPE | VPE |
| `roles.vp-eng.full` | 工程副总裁 | VP of Engineering |
| `roles.vp-sales.name` | 销售副总裁 | VP-Sales |
| `roles.vp-sales.full` | 销售副总裁 | VP of Sales |
| `roles.coo.name` | 首席运营官 | COO |
| `roles.cfo.name` | 首席财务官 | CFO |
| `roles.cmo.name` | 首席营销官 | CMO |
| `roles.*.delegation` | 工程副总裁（研发）等 | VP-Eng (Engineering) 等 |

用法：

- **可见角色名**（在场行、任务板、委派卡、培养署名）：`roles.<id>.name`；
- **短标签/窗口标题/徽标 title**：`roles.<id>.short`（或 full，按位置）；
- **数据/日志/API**：`ROLE_NAME_EN` 或 role id；
- **未知角色**：原样显示 role id/name，不抛。

### 3.3 preset picker 的硬边界

自定义 preset 的 `name`/`description` 没有 per-locale 机制（上游 `presetDisplayText` 只本地化 4 个内置 preset）。所以：

- **推荐**：picker 继续显示英文缩写 `CEO` / `VP-Eng`（品牌名），中文全称只出现在公司 UI 的可见角色名/提示里；
- 若要 picker 也显示中文，只有三条路：双语一行（`CEO / 首席执行官`，两语言都长）、上游支持 `LocalizedText`、或每语言一套 preset（已否决）。
- 这是 Phase A 无法绕过的边界，不要假装 picker 已本地化。

## 4. 对当前 RFC 的修正

| 项 | 现 RFC | 修正后 |
|---|---|---|
| Phase B 内容 | 中文正文 + `content/en/` overlay | **内部内容/角色文案翻成英文单份**；中文由 policy 表达；不做双语副本 |
| 角色名 | A2 只说 client/lib 文案 | A2 增加**表达层角色目录**（`roles.*`）+ 数据 canonical 不变 |
| 代码内部 | 未明确 | 标识符/key/ID/数据英文；注释/日志不强制全量英文化（独立清理） |
| language policy | 读取到的中文手册/模板照常执行 | Phase A 过渡文本保留；Phase B 目标文本改成“内部英文，按用户语言表达” |
| 验收 | A2 无角色名 | 加角色名 zh/en spec + 数据 canonical 防漂移 |

**Phase B 的新定义**：把 `presets/**` persona/skills、`content/**` 手册/模板/合同翻成英文**一份**；中文表达由 policy + 角色/术语表保证。工作量仍是数万汉字，但不再维护两份；质量审与术语表是新成本。

## 5. 测试资产建议（A2 角色切片）

- `role-copy.spec.ts`：6 个角色 id 的 zh/en `name/short/full/delegation` 成对；en 无 CJK；zh 与 en 不同；未知 id 原样。
- 数据防漂移：`ROLE_NAME_EN` / `PRESET_DISPLAY_NAMES` 仍等于 preset `config.name`（现有 anti-drift 断言保留）。
- UI 渲染：`RoleBadge` title、`DelegationCard` 抬头、`PresencePanel` 行名在 zh/en 下不同；真实页面金样仍走 `ui-scene-smoke`。
- Host：`roleLabel` 按 `CompanyLanguage` 出 zh/en；命令回执里角色名跟随。
- 不测：preset picker 的 per-locale（上游不支持；只测我们自己的名字映射）。

## 6. 仍要用户拍板

1. **中文角色名用哪种**：全称（首席执行官）还是保留英文缩写（CEO）作可见名？建议：可见角色名用全称，徽标/窗口标题用缩写。
2. **preset picker**：接受英文缩写（推荐），还是双语一行，还是等上游？
3. **内部英文范围**：只做“代码标识符/key/数据 + 模型内容英文”，还是连代码注释/日志也全量英文化（后者是独立大清理，不建议塞进本 RFC）？
4. **Phase B 时机**：本 RFC 只做表达层 + 角色名；英文 canonical 内容另卡，还是同批？
