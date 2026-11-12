---
status: 已定性
opened: 2026-11-12
---

# 中英文双语与默认中文启动：盘面、机制与落地方案

> **2026-11-12 最终范围修正（以此为准）**：用户明确「只要界面上呈现部分有支持中英文的问题，就是 TAB、Label、button 这些」。
> 因此本研究的**落地范围 = UI 表达层 zh/en + 默认 zh + 角色名混排**；内部全英文（I1 存量内容 / I2 注释日志 / I3 开发者文档）是**独立方向/债务**，不是本研究的验收条件。
> 本目录保留当时的盘面与取舍材料；落地卡（已归档） = [2026-11-12-bilingual-landing.md](../../settled_issues/2026-11-12-bilingual-landing.md)（已按 UI 范围重写）。
> 归档：2026-11-12
> 问题：这个插件要同时支持中文和英文，且**缺省用中文启动**。需要先彻底审视代码：哪些面有文案、哪些机制已由 DSH 提供、哪些面根本没法本地化、默认语言怎么落到启动形态；然后给出一份可以直接转 RFC/落地的方案。
> 消费者：[2026-11-12 问题卡](../../settled_issues/2026-11-12-bilingual-company.md)（用户 2026-11-12 直接点名：先研究透彻，再提交 issue，准备落地）。
> 产出的卡：[表达层问题卡](../../settled_issues/2026-11-12-bilingual-company.md) + [表达层 RFC](../../../../notes/proposed/2026-11-12-bilingual-company.md)；[内部全英文卡](../../settled_issues/2026-11-12-internal-english-canonical.md) + [内部全英文 RFC](../../../../notes/proposed/2026-11-12-internal-english-canonical.md)。
> 落地卡（已归档）：[2026-11-12-bilingual-landing.md](../../settled_issues/2026-11-12-bilingual-landing.md)（**只做 UI 可见文案：Tab / Label / Button / 空态 / 错误**；I2/I3 不在范围）。
> 结论：**做，分阶段落地（Phase 0/A/B/C）**。语言开关唯一源 = DSH 的 `locale.preference`（默认 `zh`）；客户端用 DSH 现成的 typed locale 字典；host 侧通过 `settings.describe()` 读同一个偏好，注入动态工作语言 policy；默认中文用 bundle patch 的 `locale.config.preference: zh` 落，已有用户偏好优先、reset 回中文。**2026-11-12 方向修正（后经用户再收窄）**：双语只在表达层；角色名也属于表达层（`roles.*` zh/en 映射）；不建中英双份。**最终只落地 UI 可见文案**；内部全英文 I1/I2/I3 是独立方向/债务，不是本研究的验收。边界分析 = [表达层方向材料](2026-11-12-expression-layer-direction.md)。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-12-code-audit.md](2026-11-12-code-audit.md) | 代码盘面：客户端/host/preset/content/docs 的文案体量、机制事实、默认语言证明、上游限制与风险 | 2026-11-12 |
| [2026-11-12-design-options.md](2026-11-12-design-options.md) | 方案取舍：五条路线、推荐架构、Phase 0/A/B/C、测试与门禁、成本与未决项 | 2026-11-12 |
| [2026-11-12-expression-layer-direction.md](2026-11-12-expression-layer-direction.md) | 2026-11-12 方向修正：表达层双语、内部英文 canonical、角色名映射、Phase B 改为英文单份 | 2026-11-12 |


## 2026-11-12 最终范围（覆盖前文 Phase B 的全量建议）

**在范围内**：
- company UI 的 Tab / Label / Button / 空态 / 错误 / aria 的 zh/en；
- 角色名按已定混排；
- 默认 zh；en 真页面 9 页签无中文；zh 金样一致。

**不在范围内**：
- I1 存量 content 全量翻译（已完成的部分保留，不作为 UI 前置）；
- I2 `src/**` 注释/日志/测试名；
- I3 README/docs/AGENTS；
- 内部英文单份作为 UI 验收条件。

**证据**：`ui-scene-smoke --isolated --lang en` 9 页签无中文残留；`--golden` zh 金样一致；`pnpm test` 1669 / `verify` 全绿；`preset-smoke` ALL PASS。

## 一句话结论

- **能做，而且不需要改 vendor**：DSH 已有完整的客户端 locale（zh/en typed 字典、Settings 语言行、host 持久化、浏览器回落），本包只是没接。
- **默认中文有干净落点**：在 `packages/company-pack/cordis.patch.yml` 替换 web-app 的 `locale` 行并写 `config.preference: zh`；已用 `--dump-config --patch` 实测合成结果。
- **host 没有 locale 服务**，但 `ctx.settings.describe()` 能读到同一个 `locale.preference`；用它做公司工作语言，`settings/document-updated` 可实时跟随切换。
- **真正的难点不是字符串数量，是文案所有权**：约 500 条客户端字面量 + 200 条共享 lib 展示文案里，很多是纯函数 view model 直接返回中文（状态、列名、事件句、预算行），必须先变成 key/token 再在客户端翻译。
- **Phase A 三处上游限制绕不开**：自定义 preset 的 name/description 不本地化（只认 4 个内置 preset）；host 命令 description 只注册一次；persona.prefix 在 mount 时静态。方案分别用双语描述、命令重注册、动态 language policy 绕过，不伪造。
- **全量内容/角色翻译是另一个量级**：presets 约 3.1 万汉字、content 约 2.5 万汉字、docs 约 5.3 万汉字。**按用户最终口径，这部分不在 UI 落地范围**；已完成的 content 英文保留，I2/I3 不再作为本卡验收。
