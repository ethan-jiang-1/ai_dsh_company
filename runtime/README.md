# runtime/ —— 运行残留家（gitignored，不是版本控制面、不是证据权威）

> 2026-10-06 条目 A拆分（RFC driver-surface-package）：跑过留下的状态全部住这里，「怎么启动」的
> tracked 配置住 [run/](../run/README.md)。本文件是 runtime/ 树逐件的分类 owner。
> ⚠ **默认整树忽略**（`.gitignore` 的 `runtime/*`，2026-10-25 起）：`runtime/README.md`、
> `harness-home/README.md`、`probe-*.mjs` 是**唯一 tracked 白名单**（fresh clone 后那几件在场；共 5 件）；
> 其余目录/文件默认 ignored。`web-logs/` 是 **ignored** 的观察窗启动日志（横幅含 token，绝不入库；BUG-029）。
> 新增 runtime 子目录默认就忽略；只有必须跟 fresh clone 走的文件才加 `!`，并在本表登记 owner。
> fresh clone 后其余为空属正常，运行态按需再生；不是公司业务事实，也不是证据快照
> （四条状态轴的家 = [运行态地图](../docs/runtime-map.md)）。

## 一、逐件（按权威性与生命周期标记）

| 件 | 是什么 | 标记 |
|---|---|---|
| `harness-home/` | **开发主 DSH_HOME（dev bundle 的 home）**：`sessions/`（会话日志 = 数据层证据源，世代选择唯一口径 = [session-log-generation](../tools/lib/session-log-generation.mjs)）、`profiles/`（`headless` / `web` = current）、`storages/`、`cache/`、`oracle-tests/`、`replay-runs/` + `replay-diagnosis/`（replay 现场与失败诊断）、`diagnosis/`（浏览器探针失败截图/aria/console，2026-10-20 起）、`repository-migration-hashes.json`（迁移校验基线）；内部细则见其 [README](./harness-home/README.md) | runtime·current |
| `harness-home/bundle.json` | **dev run bundle 身份**（2026-10-24 起）：id / createdAt / pack 版本 / workspace 根 / 基部逐文件 sha256；首次 apply 写、只创建不覆盖，之后每次启动做基部升级判定 | runtime·current |
| `standalone/` | **目录独立启动的隔离 home**（2026-10-25 起，默认 `runtime/standalone/home`）：自建 web profile + copy 骨架，不碰 `harness-home/`；`pnpm standalone --reset` 只删带 `.standalone-home` 标记的 home | runtime·隔离实例 |
| ~~`harness-home/profiles/company/`~~ | **已删除**（2026-10-05 裁决轮：零功能消费面终核 + 48M 死重；理论重建 = git/vendor 历史 + `file:` 安装程序有文档）——若再现同名目录 = 异常，查来历 | deleted·2026-10-05 |
| `harness-home/b/`、`harness-home-b/` | 第二/嵌套 home——多 home 实验与跨 home 审计视角（authorship 口径：每家导出各审一次再拼结果） | runtime·实验面 |
| `pw-browsers/` | 浏览器二进制与 profile（`PLAYWRIGHT_BROWSERS_PATH` 重定向落点）；**UI 布局记忆按 origin 隔离**存在浏览器 profile——换端口重启即新 origin、记忆清零 | runtime |
| `rehearsal-workspace/` | **排练盘**：排练/探针 cwd——**绝不写 live 公司盘**（`company-workspace/`） | runtime·排练 |
| `human-exits-evidence/` | 行为探针（[human-exits 非阻塞支](../probes/session-context/human-exits-nonblocking-probe.mjs)）落盘的会话事件 JSON，供人工复核判定；gitignored，可从会话日志再生 | runtime·探针证据 |
| `ops/` | 窗口启动/人工检查截图等一次性产物（2026-10-23 起）；ignored，7 天清扫；被 tracked markdown 引用时保留 | runtime·本机证据 |

## 二、层级事实（四条，钉死）

1. **`DSH_HOME` 是数据层**（会话/凭据/storage），不决定代码来源——代码唯一权威 = `vendor/dsh/`（钉 SHA，只读）。
2. **session cwd 是业务事实层**：会话读写哪个工作区由 session/create 的 cwd 决定，与 repo cwd 无关。
3. **repo cwd 不是自动公司盘**：`company-workspace/` 只有被显式连接才成为会话 cwd。
4. **排练盘与真盘隔离**（上表）；两个归档语义别混——`company-workspace/deliverables-archive/` = **业务产物历史**（live 演进、持续归档），`外部私有证据仓（不进产品仓）/` = **证据时点副本**（冻结、按场景）。

## 三、系统 tmp 出口（诚实登记：运行残留不都在 repo）

| 出口 | 写入者 | 策略 |
|---|---|---|
| `tmpdir()/dsh-replay-<场景>-*` | [replay-smoke](../checks/smoke/replay-smoke.mjs) | 进程级 mkdtemp：进程内自清、重启即失；诊断需跨进程保留时按 §11 受控重定向进 repo gitignored 区（触发条件，不预建） |
| `tmpdir()/dag-visual-fixture-<pid>.json` | dag-visual-probe | 同上 |
| `tmpdir()/e2-cross-*` | cross-process-fs-probe | 同上 |
| `tmpdir()/dsh-export-dist-*` | export-dist | 同上 |

## 四、run bundle

**run bundle = 一次安装的运行单元**：`<DSH_HOME>/bundle.json` + 一个 DSH home + 一个 company workspace。
一次安装一个 bundle，**不在 git**；第二个 CEO 新开 `DSH_HOME`。dev bundle 的 home 就是本目录的
`harness-home/`，workspace 是仓库根 `company-workspace/`（整树 gitignored；制度件符号链接指回 pack）。
定义、升级口径与 base/grown 分层唯一家 = [运行态地图 §二·五](../docs/runtime-map.md)。

**run trace** = 一次运行的四件套**追溯视图（引用不复制）**：字段与引用规则唯一家 =
[snapshots/README](../snapshots/README.md)「Run trace 引用合同」节；live 权威 = DSH session + workspace。
别把 run trace 复制成目录（那是否决过的第二权威）。

## 五、保留与清扫（2026-10-23 立）

- **口径**：`runtime/` 下的生成物 **>7 天即清**（用户令 2026-10-23：「7 天前的数据都不需要了」）。
  插件内容（`packages/company-pack`）与 `docs/` `tests/` `checks/` `probes/` 不在射程；
  **tracked 文件、README、被 tracked markdown 引用的路径永不删**。
- **工具**：[prune-runtime.mjs](../tools/prune-runtime.mjs)（默认 dry-run，`--apply` 才删；`--days` 可调）。
  首次 apply（2026-10-23）：删 105 项 / 22.9M；留人 = referenced×17、fresh×39。
- **为什么留引用**：同日实测删 `write-conflict-evidence/` 与 `collab-audit/` 打断了两篇 archived research 的链接
  （`md-links` 门禁当场红）——引用是删之前唯一的硬判据。
- **会话日志也在射程内**（>7 天 + 无引用）：按 session id 引证的历史证据若需要长期保留，
  应把结论搬进 Note/卡，或把关键日志复制进 `snapshots/`（冻结副本），而不是赌本机日志一直在。
- **历史**：cold-storage 已随真实证据移出产品仓（2026-10-24/25）；本机若有副本，属 bundle/私有归档，不 track。
