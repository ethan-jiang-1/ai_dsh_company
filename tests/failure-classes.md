# 失败类 → 最低层 → 本仓载体（决策表）

> 用途：变更先归**失败类**，再选「最便宜、但确实能看见它的层」（DSH 05 的 12 行分类在本仓的投影）。
> 主键是失败类，不是目录：目录表答「改这里跑什么」= [README「改动面 → 最窄检查」](./README.md#改动面--最窄检查)；
> 本表答「这类失败哪层才看得见」。两张表并存，不是重复。
> **每行必须点名一个本仓真实载体**；只能写「无」的行 = 缺口，立卡补，不绕过。
> 规则来源与判据 = `_backlog/_archive/research/dsh-test-strategy/`（digest §4、gap-audit §3、roadmap §10）。

| # | 失败类 | 最低能看见的层 | 本仓载体 | 状态 |
|---|---|---|---|---|
| 1 | 纯逻辑 / 编解码 / 数据变换 | keyless unit | `tests/lib`、`tests/tools` | 有 |
| 2 | 服务 / 注册表 / 贡献生命周期（dispose 后残留） | unit + 生命周期 | `tests/host`、`tests/client`（client 面 dispose 已点名） | 部分：host 侧 registry 的 dispose 未逐一点名 |
| 3 | 导出形态 / 包入口（Loader 丢弃 inject、default export） | 静态门 + 导出守卫 | `tests/repo/pack-exports.spec.ts` + pack-shape / pack-source | 有 |
| 4 | 工具定义（schema / args / result 渲染） | unit（真 `tools.execute`）+ 组装 | `signoff-tool` 等行为 spec | 部分：无录制钉 schema |
| 5 | 模型可见文本（prompt / 工具描述 / 诊断） | **组装转录**（keyless 回放） | 现有只有真模型冒烟（抽样） | **缺**：待组装回放场景（研究 B6） |
| 6 | 会话 / 持久化 / 迁移 | unit + 世界断言 | `tests/host/ledger`、`run-bundle`、`presented-*` | 有 |
| 7 | provider / adapter / 模型路由 | unit + with-key e2e | 本仓无 provider 插件 | 不适用 |
| 8 | 子进程 / 沙箱 / 并发写 | 真进程 + 独立 home | `company-root-process-smoke`、`two-homes`、`cross-process-fs-probe` | 有资产；**按面 pre-push 已接，进程级矩阵在 weekly** |
| 9 | client UI / 浏览器 / 布局 | 组件 spec（jsdom）+ 真页面 | `tests/client` 62 个 spec + `ui-scene-smoke` | 有；真交互不在 push 链（weekly / 手动） |
| 10 | 配置 / profile / 组合（`cordis.yml`） | 静态门 + 真挂载 | `preset-smoke` / `client-load-smoke` + manifest specs | 有；真挂载已进按面 pre-push |
| 11 | 性能敏感路径（时间 / 内存 / 吞吐） | benchmark + 预算 | 无 | **缺**：本仓无性能层（显式未覆盖） |
| 12 | 文档 / 生成物 / 指针 | 静态门 | `md-links` / `bare-path` / `doc-budget` / `dist-freshness` | 有（本仓最强的一类） |

## 怎么用（一句话）

改动落笔前问一句：**「这次最可能坏的是哪一类？」** 选中一行，按「最低能看见的层」挑检查；
一行都选不出来 = 要么这次没有行为变更（走文档/静态门），要么表缺一行——立卡改表，不许硬套。
同一变更常跨多行（例如改 preset 同时触碰模型可见文本与组合装配），每行各要一条证据。
