# probes/ · 展示面（show）

> 面：show（给人看的证据——截图、摘要、报表、导出；红了只是让人来看，不阻塞变更）。规则与例外 = [surface-contract](../docs/policy.md)。
> 什么时候读：要复核某机制/视觉行为、收现场证据，或给新探针选域时。逐探针的触发、成本与状态 = 各自头注；库存 = [检查索引](../checks/INDEX.generated.md) 的探针节。
> 五域 = 按「主要证据/失败模式」分（team / fs-taskboard / session-context = 被测机制；browser-visual = 观察通道；analyze = 只读日志/静态分析）。同一主题允许按证据形态分居（如 `ask-latency` 在 analyze、`ask-user-timed` 在 session-context）；跨域时按主失败模式选，不按名字猜。
> `lib/` = show 专属证据/判词与开场步骤（被探针与 keyless spec 消费；不是 judge 判据、不是入口）；fixture 入口（`<域>/<fixture>/index.mjs`）不是探针。

本页是目录规则，不是清单（清单 = 目录本身）。
