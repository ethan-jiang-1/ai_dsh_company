---
topic: fresh agent 走查：从 backlog 到 notes 到实现
intent: 记录一个 fresh-context agent 按仓库文档走完加工环路的实际路径、卡点与两份说法，作为流程显性化的证据
---

# Fresh agent 走查

> 方法：fresh-context subagent，只读（ls/grep/sed/nl/wc），未修改文件、未跑 `pnpm test`/`pnpm verify`。它按 root AGENTS.md → `_backlog` → 唯一活跃卡 → `dev-loop` → notes 规则 → 改动面 owner → 收尾 skill 走；先证明「没有可选的活」，再纸面选一个候选走完全程。
>
> 结论：环路能走完，但 fresh agent 在第 5 步发现「没有合法任务」；沿路撞到 6 处文档自相矛盾；事实/载体问题不是 `dev-loop` 四问要求的，而是 `notes/README.md` 和 `tests/README.md` 顺带提的。

## 1. 实际顺序

| 步 | 打开 | 期望 | 实际 |
|---|---|---|---|
| 1 | `AGENTS.md:3` | 开工最小路径 + 命令表 | 维护者身份、五条命令、vendor 铁律 |
| 2 | `_backlog/AGENTS.md:9-34` | 目录路由 + 五道门 | 薄门牌 + 状态表 |
| 3 | `_backlog/README.md` | 授权、出口物、关闭条件 | 卡不授权；`待落地` 仍需用户点名/已批 RFC |
| 4 | `_backlog/issues/README.md:5-7` | 活跃清单 | 只有一张 1490 行探索卡 |
| 5 | 该卡 `:6-9`、`:1473-1489` | 一个可落地的改动 | `待落地` + `去向=implementation`，但正文「不改产品代码」；验收是「每面跑一轮」 |
| 6 | `docs/guides/dev-loop.md:32-41`、`docs/policy.md:7-17` | 任务源与 Plan Mode | 问题卡（含 `待落地`）不是任务源；无 RFC/点名则报告后停 |
| 7 | `notes/README.md:16`、`notes/proposed/README.md:3-31`、wiki Note `:118` | RFC/Note 载体与触发 | FTS 有形状无卡；触发写在研究材料（>100–200 页） |
| 8 | `tests/README.md:27-41`（尤其 `:35`）、`src/README.md:10-16`、`docs/contracts/data-model.md:7-12` | 新持久化路径的登记义务 | 只能从 tests README 看到 carrier-registry；data-model 没有 readers 列 |
| 9 | `src/index.ts:155-159`、`tools/lib/carrier-registry.mjs`、`checks/gates/company-root-carriers.mjs:81-83` | 命令注册与写入口 | 实际注册 5 个命令；未登记写入口 verify 红 |
| 10 | `close-out-definition/SKILL.md:19-51`、`notes/README.md:61-66` | 收尾次序与门禁 | 六行回执；notes 门只查状态行与 `## 决定` |

**纸面产物（不写盘）**：新卡 `推敲中 → 待落地`（验收写命令/断言/红形态，去向 rfc）→ RFC（带 `批准：`、`## 验收`、输掉的方案）→ 先红 `新建:tests/host/wiki/wiki-index.spec.ts` → `src/host/wiki/wiki-index.ts` + `/wiki search` + `RUN_BUNDLE_PATHS` + carrier 登记 → 同 diff Note → 收尾四件套。候选 = wiki L1 FTS；它只是纸面候选，不是授权。

## 2. 最大卡点：没有合法任务

- 活跃区只有一张卡，卡自己写「本卡不改产品代码」；`待落地` 不是任务源（[`dev-loop.md:37`](../../../../docs/guides/dev-loop.md)）；没有已批 RFC / 用户点名，规则要求「报告后停止」。
- 要合法走完全程，必须**假设**用户在 2026-11-13 点名 wiki FTS，并明确接受越过「wiki 页数 >100–200」的升级触发器。
- 这不是它不会找，是环路的真实形状：**backlog 是思考层，用户才是队列**（D32）。但 `_backlog/AGENTS.md` 的五道门把 `待落地` 写得像「下一步」，fresh agent 会误读。
- 它建议：门牌和 root 开工路径各加一句「`待落地` = 等授权，不是任务源；用户让你挑 = 先列候选 + 请示，不自行开工」。

## 3. 六处两份说法

1. `_backlog/README.md:24` 落地出口写「Note 回链」；`:40` 却允许 `implementation`「不建 Note」。同一张表两个读者会得出两种收尾物。
2. `notes/README.md:16` 定义 proposed = 未实施；唯一 RFC（`notes/proposed/2026-11-12-bilingual-company.md:10`）自述 Phase 0/A1/A3a/A2-tab-shell 已实现，A2 其余/A3b/A4 未开始。
3. `docs/contracts/data-model.md:10` 说字段全集含 `readers/writers`；`:12` 表头只有 `事实 | Owner | Authority | 写者 | 位置 | 保留/迁移`，没有 `读者/写者` 两列；完整字段集还指向仓外 FAQ。
4. `src/README.md:13` 说「四个 `/命令`」；`src/index.ts:155-159` 实际注册 deliverables/prd/req/delivery/settings 五个。
5. `src/README.md:39` 把 `docs/contracts/` 的 language 合同与 `checks/gates/` 的 `client-copy` 写成将来时——两者都不存在，违反「docs 只写 now」。
6. `_backlog/triggers.md:5` 明确不收「用户点名」；FTS 的触发（>100–200 页）写在研究材料里，当前 dev workspace 没有 wiki 指针，触发器无法评估。

## 4. 事实/载体：会问，但问得太晚

- 它问「谁读」**不是**因为 `dev-loop §3` 四问（那四问只问 ctx 键、模型可见状态、UI 层、证据），而是 `notes/README.md:108`「谁还会读它」和 `tests/README.md:35`「新持久化路径 → shape + carrier-registry」。
- `data-model` 第 10 行说字段集含 readers/writers，表头却没有这两列——于是「谁读」在现行合同里没有格子可填。
- `company-root-carriers` 在 `verify` 阶段才红——代码已经写完；四问照做可以全答完再写代码，然后被门禁抓住。
- FTS 这个具体改动还会逼出「索引住哪」的选择：`.dsh-company/exports`、`kb/`、新 `cache/` 三选一；`RUN_BUNDLE_PATHS` 是唯一家，但没有文档说派生索引该放哪。

## 5. 最容易被「走过场」的三处

1. **验收标准**：门禁只查「非空 `## 验收标准` / `## 验收`」，不查可执行；写「测试通过」就能过。
2. **红先行/真证据**：RFC 合同要求先红，但机器只查 `状态：` 行与 `## 决定` 节；Note 里的「红长什么样」全靠自述。
3. **语义审**：四输入 + 一句话记录，没有可检查的产物；仓库自己记录过连续 24 次「语义审未执行」。

共同点：都是「自报 prose」，门禁只查标题在场，不查内容是否真的能复现。

## 6. 它给的三处最小改动

1. **模板**：`_backlog/issues/README.md` 卡模板加 `## 事实与读者`（新事实/写者/读者/环境坏法四行）+ `## 验收标准` 三列骨架（命令 | 断言 | 红形态），仅 `毕业：做` 的卡必填。
2. **门禁**：`checks/gates/proposals.mjs` 与 `tools/lib/backlog-liveness.mjs` 的「非空」升级为「至少一个可执行标记」（`pnpm test|verify|typecheck`、`node checks/`、`Given/When/Then`、`assert` 任一），配 `zz` 负例卡写「测试通过」必须红。
3. **文档**：`docs/guides/dev-loop.md:64-71` 四问后加第 ⑤ 行「谁读这个事实 / 环境怎么坏」，落点指 `tests/README.md:35` 与 `tools/lib/carrier-registry.mjs`，不另造新清单。
