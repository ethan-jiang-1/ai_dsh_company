# `docs/` 文档总入口与结构地图

> **定位**：`docs/` 是全仓唯一长期维护的核心思想主干、技术架构、现在时合同与操作指南；**只写 now，随代码同 diff 更新**。
> **读者**：优先服务维护本仓的 **Coding Agent**，同时提供人类 3 分钟通读入口（白话导览见 [orient.md](./orient.md)）。
> **组织原则**：**目录树即清单**（tier 内文档不逐份登记，防第二清单漂移；分层与长度规矩唯一家 = [docs/AGENTS.md](./AGENTS.md)）。

## 30 秒按问题找入口

| 我要… | 第一跳 | 第二跳 |
|---|---|---|
| **看懂系统内部技术架构 / 模块边界** | [architecture.md](./architecture.md)（总纲） | [Host/Lib 架构](./architecture/host-and-lib.md) · [Client UX 架构](./architecture/client-ux.md) |
| **第一次克隆环境与跑通验证** | [bootstrap.md](./guides/bootstrap.md) | [源码 handoff](./guides/repo-handoff.md) · [tests/README.md](../tests/README.md) |
| **看运行态时序、状态轴与目录职责** | [runtime-map.md](./runtime-map.md) | [project-map.md](./project-map.md) |
| **人类第一次接管（3 分钟通读）** | [orient.md](./orient.md)（白话七问） | [architecture.md](./architecture.md) → [源码 handoff](./guides/repo-handoff.md) |
| **改角色、配置、委派、数据或发布** | [contracts/](./contracts/)（按主题选合同） | [src/README](../packages/company-pack/src/README.md) |
| **按操作步骤执行（开发环 / 演示 / 排障 / 发布）** | [guides/](./guides/)（下方三分组） | [dev-loop.md](./guides/dev-loop.md) §1–§5 |
| **判授权、红线、证据门槛、内容归位或维护面** | [policy.md](./policy.md) · [testing.md](./testing.md) | [content-charter.md](./content-charter.md) · [surface-contract.md](./surface-contract.md) |
| **查某个架构决策（D 号）与为什么** | [decisions.md](./decisions.md) → [reference/decisions.md](./reference/decisions.md) | 对应 [notes/implemented/](../notes/implemented/README.md) |

## 推荐阅读顺序

- **Fresh Coding Agent**：根 [AGENTS.md](../AGENTS.md) → [architecture.md](./architecture.md) → 任务对应 [contracts/](./contracts/) 合同 → [tests/README.md](../tests/README.md) 选最窄检查。
- **人类维护者首次接手**：[orient.md](./orient.md) → [architecture.md](./architecture.md) → [源码 handoff](./guides/repo-handoff.md) → [bootstrap.md](./guides/bootstrap.md)。
- **文档与治理改动**：[docs/AGENTS.md](./AGENTS.md) → [policy.md](./policy.md) → [testing.md](./testing.md)。

## 书架（核心结构）

| 层 | 目录 | 管什么（What / How） | 入口 |
|---|---|---|---|
| **入口与宪法** | 顶层 `docs/*.md` | 导航、文档规矩、架构总纲、决策路由、跨面硬规则（授权与材料性、测试、内容归位、git 边界、维护面）、空间与运行态全景 | [AGENTS.md](./AGENTS.md) · [architecture.md](./architecture.md) · [decisions.md](./decisions.md) · [orient.md](./orient.md) · [policy.md](./policy.md) · [testing.md](./testing.md) · [repo-hygiene.md](./repo-hygiene.md) · [content-charter.md](./content-charter.md) · [surface-contract.md](./surface-contract.md) · [project-map.md](./project-map.md) · [runtime-map.md](./runtime-map.md) |
| **架构层** | [architecture/](./architecture/) | **内部技术设计与模块边界**：Host/Lib 分层、Client UX 原生槽位与安全红线 | [host-and-lib.md](./architecture/host-and-lib.md) · [client-ux.md](./architecture/client-ux.md) |
| **合同层** | [contracts/](./contracts/) | **子系统现在时语义**：presets、delegation、profile、cultivation、data-model、demo、multi-human、release | 进目录按主题文件名选 |
| **指南层** | [guides/](./guides/) | **操作手册（How-to）**：① 开发与排障（[bootstrap](./guides/bootstrap.md) · [dev-loop](./guides/dev-loop.md) · [debugging](./guides/debugging.md) · [repo-handoff](./guides/repo-handoff.md) 等）；② 演示与公司运转（[demo-scenes](./guides/demo-scenes.md) · [multi-human-runbook](./guides/multi-human-runbook.md) · [budget-and-ops](./guides/budget-and-ops.md) 等）；③ 发布交接（[release-runbook](./guides/release-runbook.md) · [publish-handoff](./guides/publish-handoff.md)） | 进目录按任务选 |
| **参考层** | [reference/](./reference/) | **纯查表与登记**：D 号路由、DSH 术语映射、维护面例外、外部材料登记 | [decisions](./reference/decisions.md) · [terminology](./reference/terminology.md) |

## 三层依赖纪律（`notes/` 与 `_backlog/` 的分界）

```text
代码实现 + notes/（已收敛的决定、备选与真证据）  ◄── 只读引用 ──  docs/（核心架构、合同、硬规则与指南）
                                                                       ▲
_backlog/（上游探索、未定型推敲、活跃缺陷卡与内部作业手册） ─── 单向引用 ─┘  （禁止 docs/ 反向依赖 _backlog/）
```

- **`docs/` 只能依赖代码实现与 `notes/`**：`docs/` 禁止出现指向 `_backlog/` 的 Markdown 链接（`doc-taxonomy` 门禁强守）。`_backlog/` 中经推敲确立且长期有效的结论，必须先升格进 `notes/`，再由 `docs/` 引用 `notes/`。
- **`notes/` 生命周期**：`notes/proposed/`（已批 RFC）→ `notes/implemented/`（活跃理由 owner，决定正文冻结、事实落点随代码改新）→ `notes/archived/`（冻结否决与 `receipts/` 历史收据）· `notes/rejected/`（负知识）。规则唯一家 = [notes/README](../notes/README.md)。
