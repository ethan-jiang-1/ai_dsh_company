# tools/ · 维护工具面

> 什么时候读：要手工跑一件维护工具、或给新工具选家时。
> 本页是**目录规则**，不是文件清单（清单 = 目录本身，D28）；逐工具入口与链接 = [检查索引](../checks/INDEX.generated.md) 的「维护工具」一节。
> 为什么叫 `tools/` 不叫 `scripts/`：本仓的「脚本」= 验证面入口（`checks/` 的 smoke / lane / audit / probe，四道 `script-*` 门禁管它们的头注）；工具面是维护者按任务挑的那一类，故叫 tools。

## 四组 = 你正处在哪一步

| 目录 | 什么时候进 | 跑完改什么 |
|---|---|---|
| [`dev/`](./dev/) | 把仓库跑起来：首次装、建 dev 公司盘、起 dev 会话、排练场 | 环境（`.dsh-company/`、`runtime/`、git hooks） |
| [`observe/`](./observe/) | 看运行态、收证据：会话诊断、延迟、日志、证据导出、notes 审计 | 只读，或只写报告 |
| [`repo/`](./repo/) | 维护仓库自身：收敛、索引 / census / 覆盖生成物、清理、搬移 oracle、**升 pin 簿记（`sync-dsh`）** | 会改仓库文件（tracked 或 gitignored） |
| [`release/`](./release/) | 产出仓库外的字节：tarball、安装手册、市场索引 | `_dist/` 与发布 manifest |

`dev/` 与 `release/` 是**会留下东西**的两组；`observe/` 是最安全的一组。拿不准时先看工具头注的「何时跑」，再决定进哪个门。

## 实现层（不是入口）

- [`lib/`](./lib/) —— **共享实现**：可被入口 / checks / tests 直接 import 的解析、生成与判据代码；**不启动进程、不联网**。注意「纯逻辑」不等于「不碰盘」：`kb-seeds` / `rehearsal` / `pin-transaction` 这些辅助函数会显式读写盘——副作用只发生在被调用时，模块 import 本身不写。
- [`drivers/`](./drivers/) —— **真实驱动**：Playwright / CDP / 发布子进程 / zstd 解压；只被入口层与 lanes 调用，不被 tests import（layering 门禁）。
- [`archive/`](./archive/) —— **已耗仪器**：一次性任务用完即收，保留只为可复现。

## 新增一件工具：四问

1. **是入口还是纯逻辑？** 会被别的脚本 import 的判据/解析 → `lib/`；只有 `node tools/...` 才跑的 → 四组之一。
2. **它属于哪一步？** 装环境 → `dev/`；只看/收证据 → `observe/`；改仓库 → `repo/`；往外发 → `release/`。四步都不像 = 先别加工具，问是不是该进 `checks/` 或 `probes/`。
3. **它默认安全吗？** 会删/会改的必须默认 dry-run（范本 = `repo/prune-runtime.mjs`），确认旗标显式（`--apply` / `--write`）。
4. **头注齐吗？** 第一屏必须有 `// 状态：` 与 `// 何时跑：`（`script-status` / `script-triggers` 门禁会查），自述里点名自己的新路径。
