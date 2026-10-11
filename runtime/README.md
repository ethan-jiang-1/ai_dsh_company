# runtime/ —— 运行残留家（gitignored，不是版本控制面、不是证据权威）

> 2026-10-06 条目 A拆分（RFC driver-surface-package）：跑过留下的状态全部住这里，「怎么启动」的
> tracked 配置住 [run/](../run/README.md)。本文件是 runtime/ 树逐件的分类 owner。
> ⚠ **本树绝大部分 gitignored（含 harness-home 内容、pw-browsers、排练盘），但不是整树**：按 `.gitignore`
> 逐条规则，`runtime/README.md`、`harness-home/README.md`、`cold-storage/snapshots/replay/r6-baseline/`
> 与 `probe-*.mjs` 是 **tracked**（fresh clone 后那几件在场）。fresh clone 后其余为空属正常，运行态按需
> 再生；不是公司业务事实，也不是证据快照
> （四条状态轴的家 = [运行态地图](../docs/runtime-map.md)）。

## 一、逐件（按权威性与生命周期标记）

| 件 | 是什么 | 标记 |
|---|---|---|
| `harness-home/` | **开发主 DSH_HOME**：`sessions/`（会话日志 = 数据层证据源，世代选择唯一口径 = [session-log-generation](../tools/lib/session-log-generation.mjs)）、`profiles/`（`headless` / `web` = current）、`storages/`、`cache/`、`oracle-tests/`、`replay-runs/` + `replay-diagnosis/`（replay 现场与失败诊断）、`repository-migration-hashes.json`（迁移校验基线）；内部细则见其 [README](./harness-home/README.md) | runtime·current |
| ~~`harness-home/profiles/company/`~~ | **已删除**（2026-10-05 裁决轮：零功能消费面终核 + 48M 死重；理论重建 = git/vendor 历史 + `file:` 安装程序有文档）——若再现同名目录 = 异常，查来历 | deleted·2026-10-05 |
| `harness-home/b/`、`harness-home-b/` | 第二/嵌套 home——多 home 实验与跨 home 审计视角（authorship 口径：每家导出各审一次再拼结果） | runtime·实验面 |
| `pw-browsers/` | 浏览器二进制与 profile（`PLAYWRIGHT_BROWSERS_PATH` 重定向落点）；**UI 布局记忆按 origin 隔离**存在浏览器 profile——换端口重启即新 origin、记忆清零 | runtime |
| `rehearsal-workspace/` | **排练盘**：排练/探针 cwd——**绝不写 live 公司盘**（`company-workspace/`） | runtime·排练 |
| `human-exits-evidence/` | 行为探针（[human-exits 非阻塞支](../probes/session-context/human-exits-nonblocking-probe.mjs)）落盘的会话事件 JSON，供人工复核判定；gitignored，可从会话日志再生 | runtime·探针证据 |
| `cold-storage/` | **外置冷存**（2026-10-07，RFC r7-motion-final 预算处置）：snapshots 超线时按 [snapshots/README](../snapshots/README.md) 政策外置的大件。现持 r6-baseline 的四个归一化 child fixtures（`cold-storage/snapshots/replay/r6-baseline/replay/`，≈15M；仓内 raw.tar.zst 可解包+`--prepare` 恢复，r6 不声明可运行 replay 故无 replay 消费面断裂）；**本目录是仓内证据的本地副本、不进 git 备份**——remote 备份连续性由仓内 raw.tar.zst 承担 | runtime·冷存 |

## 二、层级事实（四条，钉死）

1. **`DSH_HOME` 是数据层**（会话/凭据/storage），不决定代码来源——代码唯一权威 = `vendor/dsh/`（钉 SHA，只读）。
2. **session cwd 是业务事实层**：会话读写哪个工作区由 session/create 的 cwd 决定，与 repo cwd 无关。
3. **repo cwd 不是自动公司盘**：`company-workspace/` 只有被显式连接才成为会话 cwd。
4. **排练盘与真盘隔离**（上表）；两个归档语义别混——`company-workspace/deliverables-archive/` = **业务产物历史**（live 演进、持续归档），`snapshots/archive/` = **证据时点副本**（冻结、按场景）。

## 三、系统 tmp 出口（诚实登记：运行残留不都在 repo）

| 出口 | 写入者 | 策略 |
|---|---|---|
| `tmpdir()/dsh-replay-<场景>-*` | [replay-smoke](../checks/smoke/replay-smoke.mjs) | 进程级 mkdtemp：进程内自清、重启即失；诊断需跨进程保留时按 §11 受控重定向进 repo gitignored 区（触发条件，不预建） |
| `tmpdir()/dag-visual-fixture-<pid>.json` | dag-visual-probe | 同上 |
| `tmpdir()/e2-cross-*` | cross-process-fs-probe | 同上 |
| `tmpdir()/dsh-export-dist-*` | export-dist | 同上 |

## 四、run bundle

一次运行的可追溯视图 = **逻辑合同（引用不复制）**：字段与引用规则唯一家 =
[snapshots/README](../snapshots/README.md)「Run bundle 引用合同」节；live 权威 = DSH session + workspace。
