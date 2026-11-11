# locale/ —— DSH 包展示元数据，不是运行时 UI 字典

这里的 `en.json` / `zh.json` 只放 **DSH 包清单的展示字段**：`meta.title` 与 `meta.description`。
Plugin Manager、市场卡片和包发现面通过 `<包名>/locale/<lang>.json` 读取它们；字段不对/缺失时
回退到包名或英文，不会影响运行时 UI。

**运行时 Web UI 文案不在这个目录。** 它住
`packages/company-pack/src/client/locales.ts` 的 typed `company` 字典，由
`ctx.locale.register('company', { zh, en })` 注册、`ctx.locale.bind('company')` / slot 的
`locale: NS` 取用。原因：DSH 的 `ctx.locale` 消费的是代码字典（编译进 `lib/client.js`），
不是包清单 JSON；把 UI 文案写进这里不会被客户端加载，只会变成死数据。

分工：

| 面 | 家 | 消费者 |
|---|---|---|
| 包标题/描述（市场、Plugins 页） | 本目录 `<lang>.json` 的 `meta.*` | DSH 包发现 / Plugin Manager |
| Web UI 文案（页签、面板、按钮、空态、错误） | `src/client/locales.ts` 的 `company` 字典 | `ctx.locale` / 组件 |
| 角色/手册/模板正文 | `presets/`、`content/` | 模型 |

新增语言时两边都要：本目录加 `<lang>.json`（包发现），`src/client/locales.ts` 加对应
字典 key（运行时 UI）；只加一边会出现“市场有英文、界面没有”或反过来。
