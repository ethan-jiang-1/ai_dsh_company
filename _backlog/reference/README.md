# reference/ · 喂活跃卡的研究材料

> 打磨场的原材料堆：推敲 [../plans/](../plans/README.md) 与 [../bugs/](../bugs/README.md) 里的卡时
> 收集的证据阅读、综述、机制笔记（2026-10-03 D33 借回，随卡归档制）。它承载推敲的**证据半边**
> ——卡的倾向由什么撑起；卡自己持有问题、候选与判断。章程 = [`../README.md`](../README.md)。

## 契约

- **什么进**：喂活跃卡、值得留存的研究——打磨时收集、被卡引用、喂它的毕业判断。半成品合法。
- **什么不进**：一次性废料（留仓外，AGENTS.md §工具态）；活得比卡久的材料（留存参考语义 =
  [docs/index.md](../../docs/index.md) §外部研究材料登记 + [notes/archived/](../../notes/archived/)）。
- **命名**：`YYYY-MM-DD-<slug>.md`（与 notes 树同款日期格式），slug = 所喂的卡或主题；喂的卡链接到它。
- **无状态行、无逐文件门禁**：纯约定；唯一文件级检查 = 索引点名（`backlog-liveness`），对
  plans/bugs 同样适用。
- **生命周期——跟着卡走**：卡毕业时 `git mv` 到 [`../_done/_reference/`](../_done/_reference/)，
  文件名不变、内容不重写。喂完最后一张卡的材料不留恋活跃区。

## 索引

| 文件 | 喂哪张卡 | 一句话 |
|---|---|---|
| [2026-10-04-multi-user-ux-walk](./2026-10-04-multi-user-ux-walk.md) | [plans/multi-user-concurrency-bdd](../plans/2026-10-04-multi-user-concurrency-bdd.md) + [plans/human-agent-unity-ux-bdd](../plans/2026-10-04-human-agent-unity-ux-bdd.md) | 两轮走查实录（人机合一 159s 全旅程 + 双成员同文件并发观察）+ Agent Team 能力面清单（内建并发机制与跨进程缺口） |
