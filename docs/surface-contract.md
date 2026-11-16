# 维护面合同：两层 · 三面

> 什么时候读：给新脚本选家，或判断一件入口「跑它是为了裁决、证据，还是改世界」时。
> 判据一句话：**主要产出什么？** 裁决 → judge；证据 → show；持久状态 → operate。目录默认面 = `checks/` judge · `probes/` show · `tools/` operate；例外登记 = [surface-exceptions](./reference/surface-exceptions.md)。

## 两层（先判在不在面内）

- **oracle**：由 `pnpm test` 的 runner 跑（vitest / node:test）→ `tests/`。不是面；判 runner，不判进程数。
- **entry**：要自己起命令/进程/浏览器 → 下面三面。

## 三面（只对 live entry）

- **judge**：产出**裁决**——会红，且有人（hook/CI/验收）据此放行或退回 → `checks/`。
- **show**：产出**证据**——截图、摘要、报表、导出；红了只是让人来看，不阻塞变更 → `probes/`。
- **operate**：产出**持久状态**——环境/仓库/发布物/生成物 → `tools/`。两种模式：**run**（起/复用进程，失败 = 没起来，重试即可，如 `pnpm company`）；**act**（持久改动，失败可能半途，需要 converge/repair，如 `sync-dsh`）。

## 两个前置轴（先于三面判定）

- **生命周期**：头注 `状态：已耗` → 非面（归档候选），不进面计数；`script-status` 门禁强制该字段。
- **管道件**：lib / driver / fixture / runner / reporter / 索引生成器 / 纯查询 / support → 非面，跟消费者住。

## 判定顺序

1. 已耗 → 非面。 2. 管道件 → 非面，跟消费者。 3. 主要产出 → 裁决/证据/状态。 4. 混合件按终端产物；双模件按主产物；被 judge 调用不改变面（消费方头注记依赖）。 5. 仍冲突：**产物 > 失败语义 > 名字**。
