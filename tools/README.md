# tools/ · 维护工具面

> 面：operate（改世界的操作）。只看/收证据的入口住 `probes/`（show），见 [surface-contract](../docs/surface-contract.md) 与 [例外登记](../docs/reference/surface-exceptions.md)。

> 什么时候读：要手工跑一件维护工具、或给新工具选家时。
> 本页是**目录规则**，不是文件清单（清单 = 目录本身，D28）；逐工具入口与链接 = [检查索引](../checks/INDEX.generated.md) 的「维护工具」一节。
> 为什么叫 `tools/` 不叫 `scripts/`：本仓的「脚本」= 验证面入口（`checks/` 的 lane / audit 与 `probes/` 的 probe，四道 `script-*` 门禁管它们的头注）；工具面是维护者按任务挑的那一类，故叫 tools。

## 三组 = 你正处在哪一步

| 目录 | 什么时候进 | 跑完改什么 |
|---|---|---|
| [`dev/`](./dev/) | 把仓库跑起来：首次装、建 dev 公司盘、起 dev 会话、排练场 | 环境（`.dsh-company/`、`runtime/`、git hooks） |
| [`repo/`](./repo/) | 维护仓库自身：收敛、索引 / census / 覆盖生成物、清理、**升 pin 簿记（`sync-dsh`）** | 会改仓库文件（tracked 或 gitignored） |
| [`release/`](./release/) | 产出仓库外的字节：tarball、安装手册、市场索引 | `_dist/` 与发布 manifest |

`dev/`、`repo/`、`release/` 都会留下东西（环境 / 仓库文件 / `_dist`）；`archive/` 只保留已耗仪器。拿不准时先看工具头注的「何时跑」，再决定进哪个门；只读视图（运行态、诊断、notes 审计、证据导出）不在这里，走 `probes/analyze/`（例外：纯查询 `repo/snapshot-path.mjs` 已在例外表登记）。

## 实现层（不是入口）

- [`lib/`](./lib/) —— **共享地基**（三个面都 import；自包含，不反向 import 面专属库）：`core/` 路径/仓库根/home/会话日志/注册表/pin、`probe/` 探针运行管道（web 启动/CDP/页签目录，跨面共用）、`session/` 会话投影、`company/` 公司域（含 candidate-scan / delegation-model 等共享模型）、`repo/` 生成器、`release/` 发布与安装。**不启动进程、不联网**；「纯逻辑」不等于「不碰盘」：辅助函数会显式读写盘，副作用只发生在被调用时。
- **面专属 / 局部支撑各有其家**：judge-wide → [`checks/lib/`](../checks/lib/)；gate-local → [`checks/gates/lib/`](../checks/gates/lib/)；lane-local → [`checks/lanes/lib/`](../checks/lanes/lib/)；show 证据/判词 → [`probes/lib/`](../probes/lib/)；test-only → [`tests/support/`](../tests/support/)。判据 = 谁主要用它；局部支撑只许其子树 import（`face-boundaries` spec 机械守）。
- [`drivers/`](./drivers/) —— **真实驱动**：Playwright / CDP / 发布子进程 / zstd 解压；只被入口层与 lanes 调用，不被 tests import（layering 门禁）。
- [`archive/`](./archive/) —— **已耗仪器**：一次性任务用完即收，保留只为可复现。

## 新增一件工具：四问

1. **是入口还是纯逻辑？** 会被别的脚本 import 的判据/解析 → `lib/`；只有 `node tools/...` 才跑的 → 三组之一。
2. **它属于哪一步？** 装环境 → `dev/`；改仓库 → `repo/`；往外发 → `release/`。三步都不像 = 先别加工具，问是不是该进 `checks/` 或 `probes/`。
3. **它默认安全吗？** 会删/会改的必须默认 dry-run（范本 = `repo/prune-runtime.mjs`），确认旗标显式（`--apply` / `--write`）。
4. **头注齐吗？** 第一屏必须有 `// 状态：` 与 `// 何时跑：`（`script-status` / `script-triggers` 门禁会查），自述里点名自己的新路径。
