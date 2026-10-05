# dev/ —— 开发环境配置与运行态（本目录的分类 owner）

> 职责由一个具名文件拥有（D35 同款精神）：本文件管 dev/ 树每件东西是什么、权威性与生命周期。
> 双 home 纪律与机制 = [architecture §6](../docs/design/architecture.md)；进入开发环境 =
> `source dev/env.sh`（双 home 兜底 + 裸 `dsh` 拦截 + pre-push 接线，幂等）；全链时序运行态地图 =
> docs/runtime-map.md（RFC entry-runtime-map 落地中立，届时转链）。
> ⚠ 本树运行态全部 gitignored——**不是版本控制面、不是证据权威**；`harness-home/` 内部细则见其
> [README](./harness-home/README.md)。

## 一、启动配置（repo 跟踪，非运行态）

| 件 | 是什么 |
|---|---|
| `env.sh` | 进入开发环境的唯一入口：双 home 兜底、裸 `dsh` 拦截（DSH_HOME 只护数据层护不住代码层）、pre-push 门禁接线 |
| `company.overlay.yml` | headless 动议实验 overlay（向无 web-app 行的组合补公司行） |
| `entry-probe.patch.yml` | entry-probe 用的 overlay |

## 二、运行态（gitignored，按权威性与生命周期标记）

| 件 | 是什么 | 标记 |
|---|---|---|
| `harness-home/` | **开发主 DSH_HOME**：`sessions/`（会话日志 = 数据层证据源，世代选择唯一口径 = [session-log-generation](../scripts/lib/session-log-generation.mjs)）、`profiles/`（`headless` / `web` = current）、`storages/`、`cache/`、`oracle-tests/`、`replay-runs/` + `replay-diagnosis/`（replay 现场与失败诊断）、`repository-migration-hashes.json`（迁移校验基线） | runtime·current |
| `harness-home/profiles/company/` | **退役 profile**（file: 复制形状 + 旧 Web 版本）——**非权威、不可作为当前入口**；处置 = 保留 + 标记（2026-10-05 拍板），删除需消费面清单 + 回滚方案 + 单独决定 | runtime·**retired** |
| `harness-home/b/`、`harness-home-b/` | 第二/嵌套 home——多 home 实验与跨 home 审计视角（authorship 口径：每家导出各审一次再拼结果） | runtime·实验面 |
| `pw-browsers/` | 浏览器二进制与 profile（`PLAYWRIGHT_BROWSERS_PATH` 重定向落点）；**UI 布局记忆按 origin 隔离**存在浏览器 profile——换端口重启即新 origin、记忆清零 | runtime |
| `rehearsal-workspace/` | **排练盘**：排练/探针 cwd——**绝不写 live 公司盘**（`company-workspace/`） | runtime·排练 |
| `logs/` | 当前无写入者（空目录，2026-10-05 核）——登记待处置；确认无用即可删 | runtime·空置 |

## 三、层级事实（四条，钉死）

1. **`DSH_HOME` 是数据层**（会话/凭据/storage），不决定代码来源——代码唯一权威 = `vendor/dsh/`（钉 SHA，只读）。
2. **session cwd 是业务事实层**：会话读写哪个工作区由 session/create 的 cwd 决定，与 repo cwd 无关。
3. **repo cwd 不是自动公司盘**：`company-workspace/` 只有被显式连接才成为会话 cwd。
4. **排练盘与真盘隔离**（上表）；两个归档语义别混——`company-workspace/deliverables-archive/` = **业务产物历史**（live 演进、持续归档），`snapshots/archive/` = **证据时点副本**（冻结、按场景）。

## 四、系统 tmp 出口（诚实登记：运行残留不都在 repo）

| 出口 | 写入者 | 策略 |
|---|---|---|
| `tmpdir()/dsh-replay-<场景>-*` | [replay-smoke](../scripts/smoke/replay-smoke.mjs) | 进程级 mkdtemp：进程内自清、重启即失；诊断需跨进程保留时按 §11 受控重定向进 repo gitignored 区（触发条件，不预建） |
| `tmpdir()/dag-visual-fixture-<pid>.json` | dag-visual-probe | 同上 |
| `tmpdir()/e2-cross-*` | cross-process-fs-probe | 同上 |
| `tmpdir()/dsh-export-dist-*` | export-dist | 同上 |

## 五、run bundle

一次运行的可追溯视图 = **逻辑合同（引用不复制）**：字段与引用规则唯一家 =
[snapshots/README](../snapshots/README.md)「Run bundle 引用合同」节；live 权威 = DSH session + workspace。
