# `docs/` 文档总入口与结构地图

> **定位**：`docs/` 是全仓唯一长期维护的核心架构、现在时合同、操作指南与参考查表；**只写 now，随代码同 diff 更新**。
> **读者**：优先服务维护本仓的 **Coding Agent**，同时提供人类 3 分钟通读入口（白话导览见 [orient.md](./guides/orient.md)）。
> **组织原则**：**顶层 6 文件 + 三分区（`contracts/` · `guides/` · `reference/`），目录树即清单**（tier 内不逐份登记，防第二清单漂移；规矩唯一家 = [docs/AGENTS.md](./AGENTS.md)）。

## 30 秒按问题找入口

| 我要… | 第一跳 | 第二跳 |
|---|---|---|
| **看懂系统架构、代码分层、运行链与四条状态轴** | [architecture.md](./architecture.md) | [host-and-lib.md](./contracts/host-and-lib.md) · [client-ui.md](./contracts/client-ui.md) |
| **第一次克隆环境与跑通验证** | [bootstrap.md](./guides/bootstrap.md) | [源码 handoff](./guides/repo-handoff.md) · [tests/README.md](../tests/README.md) |
| **人类第一次接管（3 分钟通读）** | [orient.md](./guides/orient.md)（白话七问） | [architecture.md](./architecture.md) → [源码 handoff](./guides/repo-handoff.md) |
| **改角色、配置、UI、宿主、委派、数据或发布** | [contracts/](./contracts/)（按主题选合同） | [src/README](../packages/company-pack/src/README.md) · [content-charter.md](./contracts/content-charter.md) |
| **跑开发环、环境隔离、调试阶梯、demo 或发布** | [guides/](./guides/)（[dev-loop](./guides/dev-loop.md) · [run-ops](./guides/run-ops.md)） | [demo-scenes.md](./guides/demo-scenes.md) · [release-runbook.md](./guides/release-runbook.md) |
| **判授权、红线、维护面与测试证据门槛** | [policy.md](./policy.md) · [testing.md](./testing.md) | [checks/README.md](../checks/README.md) · [snapshots/README.md](../snapshots/README.md) |
| **查架构决策（D 号）与为什么选 A 不选 B** | [decisions.md](./decisions.md) | 对应 [notes/implemented/](../notes/implemented/README.md) |
| **查术语映射、外部材料或面例外** | [reference/](./reference/) | [glossary.md](./reference/glossary.md) · [external.md](./reference/external.md) |

## 推荐阅读顺序

- **Fresh Coding Agent**：根 [AGENTS.md](../AGENTS.md) → [architecture.md](./architecture.md) → 任务对应 [contracts/](./contracts/) 合同 → [tests/README.md](../tests/README.md) 选最窄检查。
- **人类维护者首次接手**：[orient.md](./guides/orient.md) → [architecture.md](./architecture.md) → [源码 handoff](./guides/repo-handoff.md) → [bootstrap.md](./guides/bootstrap.md)。
- **文档与治理改动**：[docs/AGENTS.md](./AGENTS.md) → [policy.md](./policy.md) → [testing.md](./testing.md)。

## 书架（顶层 6 文件 + 三分区）

| 层 | 目录 / 文件 | 管什么（What / How） | 入口 |
|---|---|---|---|
| **顶层核心（6 文件）** | `docs/*.md` | 导航入口、文档层规范、架构与运行态总纲、D 号决策路由、治理与维护面政策、测试宪法 | [AGENTS.md](./AGENTS.md) · [architecture.md](./architecture.md) · [decisions.md](./decisions.md) · [policy.md](./policy.md) · [testing.md](./testing.md) |
| **合同层** | [contracts/](./contracts/) | **子系统现在时语义与代码边界**：host-and-lib、client-ui、presets、delegation、profile、cultivation、data-model、demo、multi-human、release、repo-hygiene、[content-charter.md](./contracts/content-charter.md) | 进目录按主题文件名选 |
| **指南层** | [guides/](./guides/) | **操作手册（How-to）**：① 环境与开发（[bootstrap](./guides/bootstrap.md) · [dev-loop](./guides/dev-loop.md) · [run-ops](./guides/run-ops.md) · [orient](./guides/orient.md) · [repo-handoff](./guides/repo-handoff.md) 等）；② 演示与运转（[demo-scenes](./guides/demo-scenes.md) · [multi-human-runbook](./guides/multi-human-runbook.md) 等）；③ 发布（[release-runbook](./guides/release-runbook.md) · [publish-handoff](./guides/publish-handoff.md)） | 进目录按任务选 |
| **参考层** | [reference/](./reference/) | **纯查表与登记**：术语映射（[glossary.md](./reference/glossary.md)）、外部材料（[external.md](./reference/external.md)）、维护面例外（[surface-exceptions.md](./reference/surface-exceptions.md)） | 进目录按查表名选 |

## 故障快查（现象 → 落点）

| 现象 | 从哪一层查 | 下一步证据 |
|---|---|---|
| 公司角色没出现 / 组合不对 | profile 与最终组合 | `pnpm dsh --profile company --dump-config`；见 [run-ops.md §2](./guides/run-ops.md#2-调试阶梯组合层--会话层不跳层) |
| 名册有角色但创建失败 | 实际 preset 挂载 | `node checks/lanes/preset.entry.mjs`（dump/扫描不能替代挂载） |
| 改动没生效 / 页面加载失败 | 构建产物与 client 装配 | `node checks/lanes/client-load.entry.mjs` · [run-ops.md §4](./guides/run-ops.md#4-现场排障-runbook症状--动作) |
| 交付物、作者或 journal 不对 | 会话日志与工作区审计 | [checks/README.md](../checks/README.md) 对应审计脚本 |

## 三层依赖纪律（`notes/` 与 `_backlog/` 的分界）

```text
代码实现 + notes/（已收敛的决定、备选与真证据）  ◄── 只读引用 ──  docs/（核心架构、合同、硬规则与指南）
                                                                       ▲
_backlog/（上游探索、未定型推敲、活跃缺陷卡与内部作业手册） ─── 单向引用 ─┘  （禁止 docs/ 反向依赖 _backlog/）
```

- **`docs/` 只能依赖代码实现与 `notes/`**：`docs/` 禁止出现指向 `_backlog/` 的 Markdown 链接（`doc-taxonomy` 门禁强守）。`_backlog/` 中经推敲确立且长期有效的结论，必须先升格进 `notes/`，再由 `docs/` 引用 `notes/`。
- **`notes/` 生命周期**：`notes/proposed/`（已批 RFC）→ `notes/implemented/`（活跃理由 owner，决定正文冻结、事实落点随代码改新）→ `notes/archived/`（冻结否决与 `receipts/` 历史收据）· `notes/rejected/`（负知识）。规则唯一家 = [notes/README](../notes/README.md)。
