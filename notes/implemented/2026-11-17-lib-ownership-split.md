# 2026-11-17 · 共享实现按归属分层：跨面地基 / judge / show / 测试专属

状态：implemented（2026-11-17 落地；任务源 = 用户「长期做正确的做法，不要短视」「有些文件可能是应该移到别处去」「确保挪动之后没有引入任何副作用」）

> 上游 = [D63](../../docs/decisions.md#d63) 的分类法（管道件非面、跟消费者住）+ [D64](../../docs/decisions.md#d64) 的根名统一；本轮把「跟消费者住」从**面**贯彻到**库**。
> 决策台账 = [D65](../../docs/decisions.md#d65)。

## 决定

1. **共享实现按归属分三个落点**，判据 = 谁主要用它 **且** 依赖方向：
   - **跨面共享地基 → `tools/lib/`**：`core/`（仓库根/家/会话日志/注册表）、`probe/`（探针骨架）、`session/`（会话投影）、`company/`（公司域）、`repo/`（生成器）、`release/`（发布与安装）。**自包含**：不得 import `checks/lib/`、`probes/lib/`（反向依赖 = 面专属库伪装成共享）。
   - **judge 专属判据 → `checks/lib/`**（作者/交付物核对、覆盖基线、分层与面判据、回放/快照判据、密钥与 token 扫描）。
   - **show 专属探针骨架 → `probes/lib/`**（协作/团队/回收证据判词、探针开场与步骤、orient 纯核心）。
   - **测试专属 → `tests/support/`**（`keyless-imports`）。
2. **「lib 不是入口」写进门禁**，不靠约定：`checks-index` 的 `EXCLUDED_PREFIXES` 增 `probes/lib/`；`naming-contract` 对 `probes/lib/**` 豁免 `*-probe.mjs` 规则。这样 support 目录不会被当公开入口或探针统计。
3. **仓库根解析与文件深度解耦**：`findRepositoryRoot(startDir)` 纯函数住在 `core/repository-layout.mjs`，`markdown-links` / `repo-markdown` 复用它（此前各自按 `../../` 算深度，多下一层即解析失败）。
4. **覆盖率面按新家扩**：`vitest.config` include 增 `checks/lib/*.mjs`、`probes/lib/*.mjs`（**顶层**，不含冻结的 `checks/lib/ci-security-gates/`）；测试专属件离开覆盖率面，其基线键同 diff 删除。
5. **不变量测试跟依赖走，不锁深度**：`pack-source` spec 的断言从「精确路径字符串」改为「依赖存在」的路径正则，lib 内部分组不再误红。

## 输掉的方案

- **只在 `tools/lib` 内部打七个格子**（`core/ probe/ session/ …`）：判据仍住在 operate 面，fresh agent 仍要跨面找 judge 支撑——用户点名的「有些文件该去别处」没被解决。
- **把全部 63 件塞进 `tools/lib/core/`**：同款短视，只是把平铺改成一层子目录。
- **建根级 `lib/`**：语义上干净，但破坏 D64 的「三仓同根骨架」（另两仓的共享支撑住各自面内），为一个仓另开第四根不划算。
- **把 `repo-markdown` / `markdown-links` 也迁 `checks/lib/`**（按入口消费者分类的结果）：**实测红**——共享地基的 3 个模块依赖它们，迁走即违反「共享地基自包含」（layering 门禁当场点名）。按依赖方向留在共享地基。
- **`keyless-imports` 留在 `tools/lib`**：它只被两个结构 spec 使用，留在共享地基 = 假共享。
- **改覆盖率基线把回归吃掉**：改为抽出可测的纯函数 + 补 spec（`tests/tools/repository-layout.spec.ts`，含「找不到即报错」负控）。

## 状态事实与载体

- **事实**：共享实现三个落点 + 依赖方向规则（共享地基自包含；面专属库可依赖共享地基）；`tools/lib/` 内 6 组；`checks/lib/` = judge 判据模块 + `coverage-baseline.json` + 冻结 CI 套件；`probes/lib/` = show 专属支撑；测试专属支撑 = `tests/support/`（`keyless-imports` / `mutation` 等）。件数不在这里手写——目录本身是清单（D28）。
- **唯一入口**：规则 = [surface-contract](../../docs/policy.md)「管道件」条 + [tools/README](../../tools/README.md) 实现层节 + [checks/README](../../checks/README.md) 共享实现节。
- **读载体 / 写载体**：读 = fresh agent 的三个 README 首屏与 lib 目录本身；写 = 新增模块先判「跨面 / judge / show / 测试」再落家，改门禁扫描面时同 diff 扩 `EXCLUDED_PREFIXES` 与 naming 规则。
- **环境坏法**：来源 = 反向依赖（layering spec 挡）；内容 = 按固定深度算仓库根（`findRepositoryRoot` + 本轮实证挡）；扫描面 = 新 lib 目录被当入口/探针（`checks-index` + `naming-contract` 挡）；覆盖率 = 新家不在 include（`coverage:ratchet` 挡）；统计口径 = lib 目录未跳过（`asset-consumers` 的 `isSupportDir` 挡）。

## 未覆盖轴

- [covered] 结构门禁：`pnpm verify` ALL PASS（含 script-index / naming-contract / company-root-carriers / surface-coverage） → `checks/run-gates.mjs`
- [covered] 回归与门禁自测：`pnpm test` 253 文件 / 2159 tests 全绿 → `tests/repo/structure/layering.spec.ts`
- [covered] 类型面：`pnpm typecheck` exit 0（pack 两面 + 三个 test 配置） → `tsconfig.test-harness.json`
- [covered] 覆盖率：`pnpm coverage:ratchet` PASS（196 文件） → `checks/lib/coverage-baseline.mjs`
- [covered] 行为面：`pnpm orient` / `diagnose` / `notes:audit` 均 exit 0 → `probes/lib/orient.mjs`
- [covered] 真挂载：`preset.entry` ALL PASS（6 角色 + 5 support） → `checks/lanes/preset.entry.mjs`
- [covered] 真启动 + 零挂载失败：`pnpm company` 起在 `127.0.0.1:60600`，`client-load.entry` ALL PASS → `checks/lanes/client-load.entry.mjs`
- [policy] 另两仓的 lib 归属各自决定（用户 2026-11-17：另两仓不归本仓管）；本仓只保证根名与面骨架同形 → `_backlog/_archive/research/maintenance-surface-taxonomy/README.md`
- [environment-gap] 未跑真模型 / 真浏览器交互：本轮零模型可见面与 UI 变更（只动仓内支撑层） → `checks/lanes/preset.entry.mjs`
- [unprovable] 「以后新增模块会放对家」没有机械 oracle；判据写在合同 + 由 layering / checks-index / naming 三门共同兜底 → `docs/policy.md`

## 验证（真跑过的红→绿）

| 判据 | 命令 | 层 / 失败类 / 负控（见过红） | 原话 |
|---|---|---|---|
| 依赖方向（共享地基自包含） | `pnpm test tests/repo/structure/layering.spec.ts` | 结构 / 服务装配 / 红 | 首轮红：`tools/lib 只能保持 keyless 纯逻辑…: ["checks/lib/repo-markdown.mjs → local dependency leaves tools/lib [tools/lib/bug-coverage.mjs → checks/lib/repo-markdown.mjs]"]` → 回滚 `repo-markdown`/`markdown-links` 到共享地基 → 绿 |
| 仓库根与深度解耦 | `pnpm verify` | 结构 / 纯逻辑 / 红 | 红 1：`ERR_MODULE_NOT_FOUND … tools/lib/session/repo-markdown.mjs`；红 2：`Error: mdast-util-from-markdown 在 vendor 根包与 ui-primitives 成员处都解析不到` → 改 `findRepositoryRoot` 向上找根 → ALL PASS |
| 消费者统计口径 | `node tools/repo/test-census.mjs --write` | 结构 / 注册生命周期 / 红 | 红：`无消费者资产 57 → 53`（`probes/lib` 未被跳过，库文件被误算成探针消费者）→ `isSupportDir` 通用规则 → 回到 57 |
| 覆盖率面 | `pnpm coverage:ratchet` | 回归 / 纯逻辑 / 红 | 红：`coverage-ratchet: 20 FAILURE(S)`（`checks/lib/ci-security-gates/*` 0% + `keyless-imports` 回退 + 两模块新增分支）→ 收窄 include / 移测试专属 / 抽纯函数补 spec → `PASS（196 文件）` |
| 不变量测试不锁深度 | `pnpm test tests/repo/structure/pack-source.spec.ts` | 回归 / 工具定义 / 红 | 红：`expected … to contain "from '../lib/pack-source.mjs'"` → 改正则 → 绿 |
| 全量结构 | `pnpm verify` | 结构 / 全类 / 红已见 | `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）` |
| 全量回归 | `pnpm test` | 回归 / 全类 / 见上 | `Test Files 253 passed (253)`；`Tests 2159 passed (2159)` |
| 类型面 | `pnpm typecheck` | 类型 / 工具定义 / 无 | 四个 tsc 全绿（exit 0） |
| 真挂载 | `node checks/lanes/preset.entry.mjs` | 组合 / 配置组合 / 无 | `preset-smoke: ALL PASS（6 个角色 + 5 个非角色 preset 全部可挂载）` |
| 零挂载失败 | `node checks/lanes/client-load.entry.mjs` | 行为 / client UI / 无 | `client-load-smoke: ALL PASS（真浏览器加载，client 面健康）` |
