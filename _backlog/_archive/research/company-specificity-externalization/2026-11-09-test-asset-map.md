---
topic: company-specificity-externalization
intent: 列出文件系统改造会打红的测试资产，逐条说明"断言了什么、为什么红、测法怎么换"，供改造时同 diff 迁移
---

# 测试资产影响图：文件系统一动，哪批测试先红、测法怎么换

> 结论先说：真正脆的不是测试数量，是**四种写死**——路径写死、文件名写死、内容断言写死、结构枚举写死。
> 其中两处**现在就是错的**（不是改造才红）：`templates.spec.ts` 强制每份模板自带公司流程声明；
> `presets.spec.ts:77/:81` 的"禁止公司名/只抓旧样本事实"在换公司名后一个永远绿、一个漏检。
> 更根本的一条：**测试本身也要按公司性质参数化**——测试里出现"这家公司是什么"的字面量，就是同一类错误。

## 0. 测试也分层：不变量 / 公司性质 / 产品类型

| 层 | 测什么 | 依赖 | 换公司或换类型时 |
|---|---|---|---|
| **L0 不变量** | 机制行为：先读后写、present 归属、seed 只补缺、清单完整性、门禁反证 | 代码与合同 | **一个字不改** |
| **L1 公司性质** | 身份、编制人数、部门数、政策线、显示名、时区、客户盘 | **fixture profile**（如 `acme-hardware-software`） | 换 fixture，不换断言 |
| **L2 产品类型** | 需求链、模板、术语、checker 规则、验收方式 | **productType fixture**（如 `beta-b2b-saas`） | 换 fixture，不换断言 |

落地形状：

```
tests/fixtures/companies/
  acme-hardware-software/   # identity / organization / policy-lines / productType
  beta-b2b-saas/            # 同构；第二个公司
```

- 测试辅助 `loadCompanyFixture(id)` 读同一份 profile 格式（就是 content 的 manifest 同构），期望值从它生成。
- **CI 矩阵**：同一套 spec 在两个 fixture 下各跑一遍；"换公司"的证明不是文档，是两遍全绿。
- **判据（可门禁化）**：`tests/` 里出现 `梦之队`、`30%`、`$500`、`MRD`、`SyRS` 这类字面量 = 违规——
  除非它在 `tests/fixtures/**` 里。这条 grep 能直接挡住"把公司事实写回测试"。

## 1. 四种耦合

| 类型 | 例子 | 改造时 |
|---|---|---|
| A 路径写死 | `content/templates`、`content/state` | 目录一动全红 |
| B 文件名写死 | `mrd.md`、`company.md`、`AGENTS.md` | 改名即红 |
| C 内容断言写死 | persona 文案、模板必须有某段声明、README 字符串 | 复制/改写即红 |
| D 结构枚举写死 | 五层、六角色、九条 preset | 增删即红 |

## 2. 逐资产表

### 2.1 门禁（checks/gates）

| 资产:行 | 断言 | 耦合 | 改造后 |
|---|---|---|---|
| `base-clean.mjs:24` | `TEXT_FILES` 显式列 17 份 content 文件必须存在 | A/B | 改由 `manifest` 驱动；顺带加"content 不含部署指针"（现漏 `org.md:73` 那类） |
| `handbook-budget.mjs:9` | `content/AGENTS.md` 字节 ≤32KB | A/B | 改为"T0 文件合计 ≤6KB + 单文件 ≤2KB"；扫 manifest 而不是单个文件名 |
| `doc-budget.mjs:45` | 手册 190 行上限 | A | 拆成多文件后按"层合计"计；单文件上限写进清单 |
| `shipped-links.mjs:15` | 扫 `content/**` 与 `presets/**/skills/**` | A | 扫描根随目录换；新增"content 链接不得指向 product-type 之外" |
| `bare-path.mjs` | 活文档里的裸路径必须存在 | A/B | 改完自动生效；旧路径集中出现会在迁移期红，属预期 |
| `nav-count-claims.mjs`、`replay-fixture-freshness.mjs` | grep 命中 content 路径/数量 | C/D | 低风险，随文案改 |

### 2.2 冒烟（checks/smoke）

| 资产:行 | 断言 | 改造后 |
|---|---|---|
| `release-smoke.mjs:155-156` | content 里 6 份文件必须在包内 | 改读 manifest；`export-dist` 的打包清单同步 |
| `release-smoke.mjs:270` | 种子盘必须出现 `.dsh-company/kb/{company,org,owners,motion-ledger}.md` + 两份章程 | 文件名一改，六条断言同步；要么保留兼容名，要么加迁移映射 |
| `release-smoke.mjs:299-306` | 六份 CHARTER 零部署历史 | 章程若改由 profile 生成，改为"生成物零历史" |
| `release-smoke.mjs:345-347` | 升级后 `bundle.json` 不变 + `kb/company.md` 在场 | 随改名同步 |
| `company-entry-smoke`、`upgrade-while-running`、`multi-install`、`interrupted-install`、`external-workspace`、`permissions-recovery` | 全都有 `kb/company.md` 存在/内容断言 | 改名即全红；**建议保留 `company.md` 作为身份文件名**，避免六支冒烟同时改 |

### 2.3 单元/契约测试（tests/company）

| 资产:行 | 断言 | 冲突点 | 改造后 |
|---|---|---|---|
| `handbook.spec.ts:13` | fixture 写 `AGENTS.md`，host 读同名 | B | 改 fixture + host 的入口名；测试本身与真实 content 解耦，改一处即可 |
| `templates.spec.ts:33,36` | 每份带「AI 使用声明」的模板**必须自带**「独立性层级」「边际宽度」 | **与新设计冲突**：这正是要单家化的公司流程 | 改为"模板引用 `review-protocol` ∧ 协议文件含两栏"；再补一条"该段全文只出现一次" |
| `requirements-templates.spec.ts:24,38` | 五份模板在 `content/templates`、layer/definition 对层 | A/B/D | 改读 product-type 的 `templates/` + `check-rules.json`；层表从清单来 |
| `requirements-contract.spec.ts:49` | 五层逐层必须出现 | D | 改成"按 `productType` fixture 的层表逐层" |
| `prd-check.spec.ts` | PRD/MRD 的 JSON 账本形状 | C | 形状属产品类型包，测试读 fixture 包 |
| `bootstrap.spec.ts` | 种子文件→目标路径映射 | A/B | 与改名同 diff；补一条"旧名盘只补缺、不丢数据" |

### 2.4 preset / 客户端测试

| 资产:行 | 断言 | 冲突点 | 改造后 |
|---|---|---|---|
| `presets.spec.ts:180` | 所有 preset 名以「梦之队 」开头 | 公司名进产品骨架 | 改为"显示名由 profile 生成"（host 单测），或断言 name 不含公司前缀 |
| `presets.spec.ts:77` | 禁止出现旧样本事实（三类业务/50 人…） | **只抓旧样本**，换公司后漏检 | 改为"persona 零公司词/零产品链词"的通用断言 |
| `presets.spec.ts:81` | persona 不得含「梦之队」 | 换公司名后**永远绿** | 改同上（扫 profile 里的公司名 + 通用词表） |
| `presets.spec.ts:235-237` | CEO persona 必须含「CMO（市场与新产品定义）」「MRD 派 CMO」 | 文案级耦合 | 改为断言"persona 只含边界与触发，不含产品链"（反向断言） |
| `brand.spec.ts:13`、`role-badge.spec.ts:38-43`、`client-css.spec.ts:146-159` | 品牌字面量、缩写表、角色色调规则 | C/D | 改为从 profile fixture 注入；色调规则按角色数生成 |
| `foundation-safety.spec.ts:80-88` | 伪 content 树按旧布局手搭 | A/B | 同步新布局，否则"安全测试"测的是旧结构 |

### 2.5 打包与工具

| 资产 | 断言 | 改造后 |
|---|---|---|
| `tools/export-dist.mjs` | 打包 content 清单 | 改目录后随扫或改清单 |
| `tools/lib/company-roles.mjs:10`（另 `:18`） | 六角色 + 三 worker 名册 | 角色不变可留；但它是 pack 名册的**第二份**，漏改不红但错判 |
| `tests/repo/pack-source.spec.ts`、`install-manual.spec.ts`、`market-index.spec.ts` | 九 preset 枚举/手册内容 | 角色集不变则稳；改名/加类型要同步 |

## 3. 测法迁移三条原则

1. **从"点名文件"到"读清单"**：所有"这些文件必须在"的断言改为读 `manifest`（文件 → tier/用场/加载时机）。
   新增/改名文件只改清单，不改测试。
2. **从"内容里必须有 X"到"引用链上必须有 X"**：单家化的规则（AI 声明、复核层级）断言"模板引用协议文件 ∧
   协议文件含两栏 ∧ 全文只出现一次"；否则单家化会先撞死 `templates.spec`。
3. **从"公司事实当期望值"到"fixture profile 生成期望值"**：测试自带公司 fixture（§0），
   断言从它生成；**同一套 spec 在两个 fixture 下全绿**才算通过。

## 4. 迁移顺序（不失控的做法）

1. 先加**清单 + 兼容映射**（旧文件名 → 新家），让现有 164 个 spec 保持绿；
2. 按层逐目录搬，每搬一处同步改该目录的断言（清单驱动）；
3. 最后删兼容映射，跑 full `pnpm test` + `pnpm verify`；
4. 每条新门禁做一次反证：删一个必需文件 / 把公司词写回通用面 → 必须红，再还原。

## 5. 既有"错"的三处（改造前就存在）

- `templates.spec.ts:36` 强制**每份**模板自带公司流程声明——与"一处事实一个家"直接冲突，是复制粘贴的机械靠山。
- `presets.spec.ts:77` 的禁止清单只覆盖旧样本（三类业务/50 人），换一家公司的事实不会被抓。
- `presets.spec.ts:81` 禁止「梦之队」——公司改名后这条永远绿；正确判据是"零公司词"，而不是"零某个特定词"。
