---
status: proposed
opened: 2026-11-12
---

# 内部全英文 canonical + 表达层双语

> 状态：proposed（已批，未实施）｜ 批准：用户 2026-11-12「同意你的想法……要么就全英文」｜ 上游：[问题卡](../../_backlog/_archive/settled_issues/2026-11-12-internal-english-canonical.md)
>
> 本 RFC 接管 [表达层双语 RFC](2026-11-12-bilingual-company.md) 的**内部语言方向**：内部产品层全英文单份 canonical；表达层（UI/角色名/回执/输出）zh/en。旧 RFC 的 Phase B「中文正文 + `content/en` overlay」被本 RFC 取代；旧 RFC 的 Phase 0/A1–A4 表达层地基仍是现行。

## 问题

用户 2026-11-12 明确：中英文支持只做**表达层**；内部用英文；不能一半英文一半中文，「要么就全英文」。当前内部是混合态：

- 代码标识符/key/ID、preset id、角色 id 已是英文；
- 代码注释、日志、host 开发者诊断大量中文；
- `presets/**` persona/skills、`content/**` 手册/合同/charter/template 是中文；
- `meta.md` 的领域值（`决策` / `生产` / `已采纳` …）、账本表头、部分数据字段是中文；
- preset picker 的 `name` 是英文缩写，`description` 是中文；
- 表达层 UI 只迁了页签壳/品牌，角色名仍是英文缩写（部分中文括号），其余面板中文。

这种「有的全英文、有的全中文」正是用户点名的荒唐态。**目标不是再翻一份中文，而是内部只有英文一份，中文全部在表达层。**

## 目标与边界

| 层 | 语言 | 内容 |
|---|---|---|
| **表达层** | zh/en 可切 | Web UI 文案、角色显示名、命令回执、交付物/回复、preset picker 的用户可见文本（统一英文；见下） |
| **内部 canonical** | 英文单份 | 代码标识符/key/ID、preset id、角色 id、数据字段值、模型提示/内容（persona/skills/handbook/templates）、代码注释/日志/诊断 |
| **发行文档** | 另定 | README/安装手册/docs；用户可见部分 zh/en，开发者文档另阶段 |

**硬规则**：

1. **内部不允许中英双份**：不建 `content/zh` + `content/en`，不建两套 preset id。
2. **中文只允许出现在表达层字典/zh 内容测试夹具**；内部源文件（注释/日志/字符串/数据值）不得新增中文。
3. **preset picker 统一英文**：自定义 preset 没有 per-locale 机制；不搞双语一行、不搞每语言一套 preset。picker 的 `name`/`description` 用英文一份；中文全称只出现在公司 UI 的 `roles.*` 表达层。
4. **角色名**：canonical role id + 英文名；表达层 `roles.*` zh/en；数据/日志/API 用英文 canonical。
5. **数据迁移**：领域值/字段 canonical 改英文 ID；已有 `.dsh-company` 数据**读兼容 + 写英文 + 一次性迁移**，不静默破坏旧盘。

## 范围与阶段

### I1 — 内部产品层英文单份（本 RFC 的核心）

- `presets/**`：11 个 preset 的 persona、description、26 个 skill、`_shared` 全部翻成英文；中文原文不保留在树内（git 历史保留）。
- `content/**`：手册、contracts、generic、charters、templates、product-types、delivery-modes、JSON 规则提示全部英文；`manifest.json`/seed 同步。
- **领域值**：`meta.md` 的类型/结果、账本表头/状态、catalog 字段、task status 等 canonical 改英文 ID；zh 表达层提供中文标签；旧盘读兼容 + 迁移。
- **Host/model-facing strings**：工具 description、prompt section、system 文案英文；用户可见回执走表达层 zh/en 字典（英文 default）。
- **preset picker**：`name`/`description` 英文；中文不出现。
- **无中文内部内容**：I1 结束时，`presets/**`、`content/**` 的模型可读正文无中文；`content/**` 不建中文副本。

### I2 — 代码内部英文（注释/日志/诊断/测试名）

- `src/**` 与 `tests/**` 的注释、日志、诊断、`describe/it` 名称英文化；中文只允许在 `locales.ts` 的 zh 字典、明确的中文夹具、zh 断言里。
- 新增/修改代码的注释默认英文；存量中文注释一次性清理（按目录分批，避免与逻辑改动混在一起）。
- 机械门禁：`src-internal-cjk`（或扩展 `client-copy`）扫描内部源文件的注释/字符串；allowlist = 表达层 zh 字典/中文夹具；先红后绿。

### I3 — 开发者文档英文（另阶段，是否同批由用户定）

- `README.md`、`docs/**`、`AGENTS.md`、`packages/company-pack/README.md` 等开发者/仓库文档英文；用户安装手册保留 zh/en 表达层。
- 与 DSH 的 docs 分层/门禁一起做；不在 I1/I2 混入。

### E1 — 表达层（旧 RFC 继续）

- UI 全量 zh/en、角色名 `roles.*`、host 回执、命令 description、默认 zh、语言切换、真页面金样。
- 旧 RFC 的 A2/A3b/A4 仍是表达层执行面；本 RFC 只接管“内部英文”。

## 输掉的方案

- **中英双份内部内容**（`content/zh` + `content/en`）：两本账、翻译/审校/门禁翻倍；用户明确否。
- **中文内部 canonical + 英文 overlay**（旧 RFC Phase B）：内部仍是中文，英文是第二套；用户明确否。
- **每语言一套 preset**：roster 翻倍、会话身份分裂；否。
- **picker 双语一行**：两语言都变长，且不是真切换；用户接受“统一英文”这一边界，否。
- **保留中文注释/日志，只翻模型内容**：仍是混合态；用户明确“要么全英文”，否。

## 验收

**验收原则**：内部英文 = 单份 + 可机械检查；表达层 = zh/en 可切；不把“翻译了”当“验证了”。

### I1 验收

- [ ] `presets/**` 的 persona/description/skill 正文无中文（`grep -P '[\x{4e00}-\x{9fff}]'` 零命中；git 历史保留旧文）。
- [ ] `content/**` 的模型可读正文/JSON 提示无中文；`content/manifest.json` 与 seed 同步；不新增 `content/zh` 或 `content/en`。
- [ ] 领域值 canonical 英文 ID；旧 `.dsh-company` 盘可读（兼容别名/迁移），新写入英文；zh 表达层显示中文标签。
- [ ] preset picker 的 `name`/`description` 英文；中文全称只出现在公司 UI `roles.*`。
- [ ] 相关 keyless content/preset/spec 全绿；`preset-smoke` ALL PASS；真模型/回放按受影响面重跑或明确降档。

### I2 验收

- [ ] `src/**`、`tests/**` 的注释/日志/诊断/测试名无中文（allowlist：`locales.ts` zh 字典/中文夹具/zh 断言）。
- [ ] `src-internal-cjk` 门禁：真实中文注释造红 → 还原绿；门禁头注写负例；`pnpm verify` 绿。
- [ ] 不改表达层 zh 字典/中文测试的前提通过；`pnpm test`/`typecheck`/`lint`/`dup` 全绿。

### I3 验收（若同批）

- [ ] README/docs/AGENTS 英文；用户安装手册 zh/en；`doc-budget`/`dist-manual`/`md-links` 同 diff 调整；`pnpm verify` 绿。

### E1 验收

- [ ] 旧 RFC 的 A2/A3b/A4 表达层验收继续有效；默认 zh、切 en、角色名/面板/回执 zh/en；真页面 zh/en 金样。
- [ ] 本 RFC 不以内部英文为理由降低表达层标准；中文输出由 policy 保证。

### 怎么测（可复现）

- 内部中文扫描：`rg -nP '[\x{4e00}-\x{9fff}]' presets content` → 0（I1）；`rg` 对 `src`/`tests` → 只剩 allowlist（I2）。
- 旧盘兼容：用 `snapshots/`/fixtures 的旧 `.dsh-company` 跑 `/req check`/`/prd check`/catalog；新写入英文；zh 标签在 UI/命令回执出现。
- picker：真页面 picker 名称/描述英文；公司 UI 角色名 zh/en；`roles.*` spec。
- 翻译质量：内容审读（人工/抽样）+ `preset-smoke` + 受影响 replay 场景；不把 grep 当语义通过。

## 实施顺序与关系

1. I1 内容翻译与领域值迁移（最大块；先 glossary/角色术语表，再逐包）。
2. I2 代码内部英文化（按目录分批；门禁先红后绿）。
3. I3 文档英文（若同批）。
4. E1 表达层继续（旧 RFC 的 A2/A3b/A4），与本 RFC 并行但不同 diff。
5. 收口：Note 记录决定/输掉的方案/真证据；RFC 毕业到 `notes/implemented/`；旧 RFC 的 Phase B 指针更新。

## 当前状态

- 2026-11-12：RFC 立项；I1/I2/I3 未开始；E1 的 Phase 0/A1/A3a/A2-tab-shell 已实现（见旧 RFC）。
- 未验证：所有 I1/I2/I3 项；本 RFC 不宣称内部已全英文。
