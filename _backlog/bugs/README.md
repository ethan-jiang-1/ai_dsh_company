# bugs/ · 活跃缺陷卡

> 一文件一张卡：`BUG-<NNN>-<slug>.md`。修完 `git mv` 到
> [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)，文件名不变、内容不重写；查实但修复未确认的
> 迁 [`../_done/_suspended_bugs/`](../_done/_suspended_bugs/)（id 保留）。**编号权威在归档侧**：
> 新号 = [`../_done/_fixed_bugs/README.md`](../_done/_fixed_bugs/README.md) 的 Next BUG ID
> （已分配最大号 + 1，活跃 ∪ 归档一起算）。**状态行追加律**：修完只在状态行**追加**判定
> （`状态：活跃 — 已修复 YYYY-MM-DD：<判定，Note 指针>`），不重写原行；搁置不追加（无判断落地）。
> 本文件是账本，章程 = [`../README.md`](../README.md)。

## 活跃列表

| Bug | 标题 | 严重级 | 发现 |
|---|---|---|---|
| [BUG-002-dual-ceo-silent-supersession.md](BUG-002-dual-ceo-silent-supersession.md) | 多人模式双 CEO 门无检测——已收口 final 被另一门静默改版取代（B 盘面行为规范，缺门级防线） | P1 | 2026-10-06 |
| [BUG-005-dual-signoff-single-door-routing.md](BUG-005-dual-signoff-single-door-routing.md) | 双签线多门形态退化为单签——request_signoff 按发起会话路由，CEO 人无批准通道（日志只读可见半旁路，批准通道为零） | P1 | 2026-10-06 |

## 卡片模板

```markdown
# BUG-<NNN>：<一句话标题>

> 严重级别：P0（阻断）/ P1（重要）/ P2（次要）｜发现：YYYY-MM-DD｜状态：活跃

## 症状
观察到什么错误行为（现场、报错、复现路径）。

## 根因（假设）
机制层原因——越到契约/结构层越好，避免只描述表象；未定位就写假设与验证途径。

## 暴露的失败类
这个 bug 是哪一类失败的探针；横切排查是否值得做、排查面是什么（契约探针纪律）。

## 复现
最小复现步骤 / 命令 / 输入。

## 修复关联
落地方式（修复 commit / 拆窄 follow-up / 搁置池行 / 上游 seam），修完归档时补。
```

**边界**：当场修掉的缺陷不建档（轮次 Note 照旧）；建档 = 发现时决定不当场修。
