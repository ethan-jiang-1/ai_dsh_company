# 2026-10-28 · 数据设计硬化：写通道、权威归位与迁移

状态：待实施（批准：用户 2026-10-28 会话授权——「你发现的问题我都想修复」；按 M1→M4 逐条实施，
M2/M3 动数据路径前单独呈迁移/回滚一页纸）
进度：M1 已落地（2026-10-28；records schema、client-errors 迁 home logs+轮转、T4/preset-smoke
数据感知、data-model v2、README Data 6+2、home 白名单；111 files / 983 tests、verify、typecheck 全绿）。
M2 已落地（2026-10-28；presented 账本迁 domain `company_deliverables`、旧 W 迁移/fallback、
release/lifecycle smoke 全绿）。M3–M4 待做。
已知：`@deepseek-ai/dsh-storage-domain` / `zod` 由 base 提供；pack `package.json` 的 peer 声明 +
可控 lock 更新留 M4（本轮不引入 lock 漂移；release-smoke 真装通过）。

> 依据：外部研究 FAQ 24（发布与 agent 数据平面；rc.3 基线，但本仓 pin rc.2 已核
> `ctx.storageDomain`、storage-json `single`、`fs-sandbox`、`sessionQuery`、`workspaceRegistry`、
> `dshCachePath`、`deliverables/presented` 均在）与 FAQ 26（数据家/承诺）。现合同 =
> [data-model.md](../../docs/data-model.md)；用户侧摘要 = [pack README Data](../../packages/company-pack/README.md#data)。
>
> **取代关系**：部分取代 [agent-cultivation-loop](../implemented/2026-10-13-agent-cultivation-loop.md)
> 的「方法层 = profile×角色」作用域与路径（其余决定、尤其是「workspace 根被否」保留）；
> 部分取代 [r4-d6-client-errors](../implemented/2026-10-28-r4-d6-client-errors.md) 的 client-errors
> 落点；部分取代 [data-model-alignment](../implemented/2026-10-27-data-model-alignment.md) 的
> 「presented 账本留 W」落点（「bundle.json 不迁 storageDomain」维持）。事实落点随改动就地更新
> [data-model-p1-p2](../implemented/2026-10-27-data-model-p1-p2.md)、
> [data-model-r1-r6](../implemented/2026-10-27-data-model-r1-r6.md)、
> [run-bundle-install-unit](../implemented/2026-10-24-run-bundle-install-unit.md) 中被改路径的引用。

## 问题

1. **权威与位置倒挂**：`presented` 账本写的是 P3（宿主账本），物理却在公司盘
   `kb/deliverables-presented.json`——W 是模型可写面（每个角色挂 `tool-fs`，bash 也可写），
   于是「操作员审计」只是文案。反过来 `kb/deliverables-index.json` 是派生视图，客户端却直接
   读它展示 `presented`；该保护的账本是软的，该当缓存的索引反被信任。
2. **作用域按路径方便**：方法层住 `<profile>/company-cultivation/<role>/`（`customSkillDirs`
   是 deployer 所有权，不是 profile 配置）；换 profile 丢方法，同 home 多 profile 各一份。
   浏览器诊断日志住公司盘的 `cultivation/client-errors.log`（运维日志混进公司内容）。
   自造状态散在 home 根（`bundle.json`、lease、logs），ownership 不一眼可见。
3. **数据卡缺维度**：现表没有「谁拥有/关于谁、谁必须看见、谁可以写、走哪条通道、硬还是软、
   版本/迁移/测试」。账本问题在表里看不见；方法层的隔离强度也没有「沙箱模式」这一列。
4. **软约束被写成硬边界**：方法层「分身写不了」只在 `workspace-write`/`read-only` 成立；
   `danger-full-access` 无围栏（[run/env.sh](../../run/env.sh#L47) 在本机 Seatbelt 不可用时正是
   该处方）；角色私有目录是约定，不是数据隔离；签字线是 prompt + approval，只有工具被调用时硬。
5. **测试/发布耦合**：`preset-smoke` 断言 `skills/list` **恰好等于**包内技能，dev home 一旦有
   adopt 过的方法就假红；`tests/presets` 把「未注入指令面」说成「没有模型可见路径」，但索引在
   workspace 内、fs 可读。发布面的 `files`/`exports`/技能发现/`dsh.client.inject` peers 也要
   在改数据路径时同步核。

## 方案

### M1 · 合同 + 低风险（不改数据路径）

- 重写 `docs/data-model.md`：数据卡 v2（事实 / 拥有·关于 / 写者·通道 / 权威 / 落点·键 / 可见性 /
  寿命·删除 / 版本·测试）、写矩阵、硬软边界表、六个版本、标识符 API 清单、威胁模型；备份/删除
  细节搬到 README 或安装手册，保住 doc-budget（现 71/76）。
- `packages/company-pack/README.md` Data 节：按 6+2 分行（D/C/W/U/S/H/K/X），把 `U` 与 `H` 拆开，
  `I`/`R`/`B` 降为「派生/宿主登记/客户端边界」说明；补「W 是模型可写内容、H 是宿主账本」。
- `tests/presets/presets.spec.ts` 的 T4 措辞改为「未注入指令面；workspace 文件可被 fs 读取」。
- `checks/smoke/preset-smoke.mjs`：expected 集改成「包内 + 本角色方法层」的数据感知集合；仍断言
  看不见其他角色；用临时 home 或先把方法层清空两种方式至少选一种并在头注写明。
- 培养记录加 `schema: 1`：`recordText` 写新字段，`parseRecord` 缺字段按 1 读；旧记录不改写。
- client-errors 日志迁 `$DSH_HOME/logs/company-client-errors.log`（保留旧
  `cultivation/client-errors.log` 只读 fallback 一版）；`/company-diagnostics` 与
  [budget-and-ops](../../docs/guides/budget-and-ops.md) 读路径同 diff；加轮转/上限（按大小截断）。
- 新增 home 白名单 diff 检查：首启/二启后 `$DSH_HOME` 的相对路径集合必须落在声明白名单内
  （sessions/profiles/storages/bundle.json/logs/company-workspace 等），意外文件判红。

### M2 · 账本迁宿主状态（H）

- 新增 host 模块（计划 `presented-domain.ts`）：`defineDomain({ name: 'company_deliverables',
  version: 1, layout: 'single', tables: { ... } })`（vendor `UNIT_NAME_RE` 只认
  `/^[a-z][a-z0-9_]*$/` ⇒ 下划线，不是连字符）；`ctx.inject(['storageDomain'], …)`，缺席时
  回退 W 文件并显式告警（降级不是静默）。
- `setPresentedAudit` / `recordPresented` 写 domain；`readPresentedLedger` 读 domain；
  `regenerateCatalog` 与 `/deliverables audit` 只通过 domain 读写；`present` 事件仍由 host 记 `true`。
- 迁移：启动时若 domain 为空且旧 W 账本在场，读旧账本 → 写 domain → 保留旧文件一版并标记
  migrated；domain 打不开（invalid-record/version-mismatch）→ fail loud，保留原文件、停写公司数据。
- 备份/卸载：`business` 加入 domain 文件（`storages/company_deliverables.json` 或后端实际文件），
  手册的备份/卸载/恢复三节同 diff；`full` 保持整 home。
- 客户端仍读派生索引；文档明确「索引 = 显示缓存，审计以 domain 为准」。

### M3 · 方法层归位到公司级

- 方法层根从 `<profile>/company-cultivation/` 迁 `$DSH_HOME/company/methods/<role>/`
  （`!!js` 从 `baseUrl` 上两级 + `company/methods/<role>`；host config `cultivationRoot` 同源）；
  六份 preset 的 `customSkillDirs` 与 `cordis.patch.yml` 同 diff。
- 迁移：启动时若新根缺某 role/slug、旧 profile 根有，复制过去（不删旧）；同 role/slug 两边内容
  不同 → 保留新、旧文件加 `.conflict` 备份并告警，不静默覆盖。迁移幂等，记录 marker。
- 双 profile 一致性：同 home 两个 profile 的新会话看到同一套方法；旧「一公司一 web profile」
  告警可以退役或降为提示。
- `$DSH_HOME/company/` 作为增量命名空间：methods、client-errors、lease/logs 中至少 methods 与
  client-errors 先入住；`bundle.json` 保持原位一版，后续再议。

### M4 · 收口

- 会话全文索引分类为 K（派生，可删可重建）；是否从 profile 目录挪 cache 按「单进程 owner」
  约束决定，默认只改分类与文档，不做跨 profile 共享。
- `ctx.fs` 替换 `cultivation_propose` 的 `node:fs`（模型发起的写走 native 通道；provisioning/
  派生索引仍是显式 node:fs 例外）。
- 发布/安装手册/CHANGELOG/版本 bump：数据路径与账本位置变 → **0.4.0**；`_dist` 手册重导，
  `dist-manual` 关键句、`release-ready`、`release-smoke`、`lifecycle-smoke` 同 diff。
- 旧路径保留只读一版；回滚 = 停新 pack、恢复旧 home 备份；`bundle.json`、公司盘内容不动。

## 输掉的方案

- **账本留 W + `fs/write-intent` 守卫**：挡不住 bash；`danger-full-access` 无围栏；首个 listener
  的顺序也不可控。只保留为 M2 的降级实现，不作为主方案。
- **方法层保持 profile 级**：profile 是运行组合，不是数据 tenant；换 profile 丢方法、同 home
  多 profile 分叉。若「一公司一 profile」升级为正式产品合同，才回到此方案。
- **`$DSH_HOME/company/` 全量大迁（含 bundle.json）**：身份文件被工具/手册/smoke 直接引用，一次性
  搬风险大于收益；采用增量命名空间。
- **`bundle.json` 迁 `ctx.storageDomain`**：需在插件加载前存在、被人读、被备份/smoke 引用
  （[data-model-alignment](../implemented/2026-10-27-data-model-alignment.md) 已否决，维持）。
- **公司内容搬 H/数据库**：用户要看见、编辑、带走；违反 P2。
- **per-role 数据隔离**：DSH 没有 per-role tenant；共享盘是产品事实，只能写清不是隔离。
- **会话索引跨 profile 共享**：`session-query-sqlite` 明确每个索引路径单进程 owner；共享会争用。
- **外部 memory/DB / 第三方记忆服务**：没有原生必要，扩大依赖面。
- **全仓改 `run bundle` / `bundle.json` / `agent.cordis.yml` 名**：成本大于收益；用术语表与分阶段
  迁移。
- **`ctx.fs` 一刀切**：provisioning/派生索引/宿主维护仍用 node:fs；只有模型发起的写走 native。

## 验收

> 每段先立判据、先跑红、再最小实现；命令链用 `set -o pipefail`，只报实跑结果。

### M1

- `pnpm verify` 绿（doc-budget / md-links / bare-path / proposals）；红样：删除 data-model 的
  「写者·通道」列或制造死链 → 对应门禁红，还原 → 绿。
- `pnpm test tests/presets tests/company tests/client` 绿；新增 records schema 断言在实现前红
  （旧解析器不写 `schema`）→ 实现后绿；红样可临时删 `recordText` 的 schema 行。
- `source run/env.sh && node checks/smoke/preset-smoke.mjs` 绿；在 dev profile 方法层放一个
  `SKILL.md` 后旧断言红（extra skill）→ 数据感知后绿。
- 新 home 白名单检查：首启前红（client-errors 在公司盘/白名单外）→ 迁移后绿；二启零变更。
- `pnpm typecheck` 绿（host/client 类型面）。

### M2

- 新增 domain spec：打开/写/读/版本不匹配/坏记录；实现前红（domain 不存在）→ 实现后绿。
- 真入口：`present-catalog-smoke` 扩展——删 index + domain 后 `true` 仍可从事件回扫；`false`
  审计在删 index 后保留；模型经 fs 写旧 `kb/deliverables-presented.json` 后，catalog 的
  `presented` **不变**（权威在 domain）；命令 `/deliverables audit` 写 domain 后索引刷新。
- `release-smoke`/`lifecycle-smoke`：首启 domain 写入、二启字节不变、business 备份含 domain、
  restore 后 `false` 仍在；卸载后 domain 保留（文档声明）。
- 红样：把 `recordPresented` 暂时改回写 W 文件 → 模型 fs 写测试红（权威被改）；还原 → 绿。

### M3

- `pnpm test tests/presets` 绿；`preset-smoke` 六个角色只看见包内 + 本角色方法层；红样：把
  `customSkillDirs` 指回旧 profile 路径 → 新 home 无方法时探针红。
- `node probes/session-context/cultivation-method-layer-probe.mjs`：目录冷启动发现 / 角色隔离 /
  缺目录容忍 / adopt 落新根 / 新会话跨会话生效 / `workspace-write` 下分身 fs 写被拒；
  `danger-full-access` 一档如实记「无围栏」，不冒充。
- 迁移：旧 profile 根有方法、新根空 → 启动后新根有同内容；两边冲突 → `.conflict` 备份 + 告警；
  迁移幂等（二次启动零复制）。
- 双 profile：同 home 两个装本包的 profile，新会话 `skills/list` 看到同一方法集。

### M4

- `pnpm verify` + `pnpm test` + `pnpm typecheck` 全绿；`release-smoke`、`lifecycle-smoke`、
  `preset-smoke` 全绿；`pnpm release --check` READY 0.4.0；`_dist` 手册版本/关键句/`bundle.json`/
  `company-workspace`/domain 路径一致。
- 回滚演练：旧 pack + 旧 home 能读旧路径；新 pack 首启迁移后旧文件保留；无半截文件。

## 迁移与回滚

- 一次性迁移代码住 host 启动段，**幂等**：先读旧、再写新、校验条数与抽样、保留旧一版；
  失败保留原文件并 fail loud。
- M2 与 M3 各自有 marker（domain 记录 / `company/methods/.migrated`），不依赖「跑过几次」。
- 版本 0.4.0；旧路径只读一版；回滚按备份恢复，不手改 domain/JSON。
- 旧会话 `header.cwd` 不迁移（DSH 限制），与既有合同一致。

## 边界与不做什么

- 单 Host、单 `$DSH_HOME`；多租户/跨机器同步不在范围。
- 不新增 session event 类型；不改 vendor；不引入 E1 依赖。
- `danger-full-access` 下没有文件级保护；文档如实写，不宣称绝对隔离。
- 角色边界、owners、签字线是 prompt/approval 级，不升级为数据 ACL。

## 风险

- 账本 H 后用户不能直接手改 JSON；用命令/索引查看，若产品必须手改则退回「W + 声明为自报」。
- 方法层 home 级会改变「同 home 多 profile」语义；迁移冲突处理必须可见。
- 备份/卸载/安装手册/`dist-manual` 关键句与 domain 路径耦合，漏一处会红或误导。
- `preset-smoke` 数据感知后仍要保留跨角色泄漏判据，不能为凑绿放宽成子集。
