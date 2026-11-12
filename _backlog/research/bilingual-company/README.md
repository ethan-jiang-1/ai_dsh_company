---
status: 已定性
opened: 2026-11-12
---

# 中英文双语与默认中文启动：盘面、机制与落地方案

> 问题：这个插件要同时支持中文和英文，且**缺省用中文启动**。需要先彻底审视代码：哪些面有文案、哪些机制已由 DSH 提供、哪些面根本没法本地化、默认语言怎么落到启动形态；然后给出一份可以直接转 RFC/落地的方案。
> 消费者：[2026-11-12 问题卡](../../_archive/settled_issues/2026-11-12-bilingual-company.md)（用户 2026-11-12 直接点名：先研究透彻，再提交 issue，准备落地）。
> 产出的卡：[表达层问题卡](../../_archive/settled_issues/2026-11-12-bilingual-company.md) + [表达层 RFC](../../../notes/proposed/2026-11-12-bilingual-company.md)；[内部全英文卡](../../_archive/settled_issues/2026-11-12-internal-english-canonical.md) + [内部全英文 RFC](../../../notes/proposed/2026-11-12-internal-english-canonical.md)。
> 结论：**做，分阶段落地（Phase 0/A/B/C）**。语言开关唯一源 = DSH 的 `locale.preference`（默认 `zh`）；客户端用 DSH 现成的 typed locale 字典；host 侧通过 `settings.describe()` 读同一个偏好，注入动态工作语言 policy；默认中文用 bundle patch 的 `locale.config.preference: zh` 落，已有用户偏好优先、reset 回中文。**2026-11-12 方向修正**：双语只在表达层；内部代码/提示/内容用英文单份 canonical；角色名也属于表达层（`roles.*` zh/en 映射）；不建中英双份。内部英文的具体阶段 = [内部全英文 RFC](../../../notes/proposed/2026-11-12-internal-english-canonical.md)（I1/I2/I3 + 表达层 E1）；边界分析 = [表达层方向材料](2026-11-12-expression-layer-direction.md)。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-12-code-audit.md](2026-11-12-code-audit.md) | 代码盘面：客户端/host/preset/content/docs 的文案体量、机制事实、默认语言证明、上游限制与风险 | 2026-11-12 |
| [2026-11-12-design-options.md](2026-11-12-design-options.md) | 方案取舍：五条路线、推荐架构、Phase 0/A/B/C、测试与门禁、成本与未决项 | 2026-11-12 |
| [2026-11-12-expression-layer-direction.md](2026-11-12-expression-layer-direction.md) | 2026-11-12 方向修正：表达层双语、内部英文 canonical、角色名映射、Phase B 改为英文单份 | 2026-11-12 |

## 一句话结论

- **能做，而且不需要改 vendor**：DSH 已有完整的客户端 locale（zh/en typed 字典、Settings 语言行、host 持久化、浏览器回落），本包只是没接。
- **默认中文有干净落点**：在 `packages/company-pack/cordis.patch.yml` 替换 web-app 的 `locale` 行并写 `config.preference: zh`；已用 `--dump-config --patch` 实测合成结果。
- **host 没有 locale 服务**，但 `ctx.settings.describe()` 能读到同一个 `locale.preference`；用它做公司工作语言，`settings/document-updated` 可实时跟随切换。
- **真正的难点不是字符串数量，是文案所有权**：约 500 条客户端字面量 + 200 条共享 lib 展示文案里，很多是纯函数 view model 直接返回中文（状态、列名、事件句、预算行），必须先变成 key/token 再在客户端翻译。
- **Phase A 三处上游限制绕不开**：自定义 preset 的 name/description 不本地化（只认 4 个内置 preset）；host 命令 description 只注册一次；persona.prefix 在 mount 时静态。方案分别用双语描述、命令重注册、动态 language policy 绕过，不伪造。
- **全量内容/角色翻译是另一个量级**：presets 约 3.1 万汉字、content 约 2.5 万汉字、docs 约 5.3 万汉字。方向修正后，Phase B 是**翻成英文一份**（内部 canonical），不是中英双份；Phase C 是 docs。
