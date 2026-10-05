# 2026-10-05 · RFC：company-pack 的 pack/source/generated 边界（毕业拆分 2/6）

> 状态：RFC（已批准待实施；实施次序由用户逐条点名，D32）｜批准：2026-10-05 用户对话拍板（来源 = 推敲卡
> [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md)
> 毕业；本条含同批拍板：src/lib 的 host/domain 物理拆分延后——先文档 owner 表与依赖图，拆分与否等证据）

## 问题

`packages/company-pack/` 一个包承载五种职责而无 owner 表；src 面文档失效（2026-10-05 核验）：

- [src/README.md](../../packages/company-pack/src/README.md) 把 `routing.ts` 列为 lib/ 文件——实际不存在
  （src/lib 九文件：attention/board/budget/cultivation/dag/ledger/presence/signoff/tool-card）；
  `delegation-keys` 实际住在 [src/client/index.ts](../../packages/company-pack/src/client/index.ts)，README 却归到 lib/。
- host 注册入口、共享读模型、client 注册入口及消费方向没有分开陈述；旧「host 空壳」描述过期。
- [lib/](../../packages/company-pack/lib/) 生成产物无醒目标识与刷新顺序（`tsc -b packages/company-pack` →
  tsdown）；「lib 不是源码、改源码 ≠ 浏览器已重建」没有就地警告。
- 开发形状（link: 联调）与发布形状（`files` 只含 lib/presets/cordis.patch.yml，src 不进 tarball）的边界
  只散落在 [docs/release.md](../../docs/release.md)。

## 方案

1. **pack owner 表**（唯一家 = [packages/company-pack/README.md](../../packages/company-pack/README.md)）：
   presets/ = persona/skills 声明；src/ = 自写实现（host 半：index.ts + lib/ 纯逻辑；client 半：src/client/）；
   lib/ = 生成发布产物；cordis.patch.yml = bundle 装配行；package.json = 发布/注入声明。
2. **修 [src/README.md](../../packages/company-pack/src/README.md)**：按实际文件重写 lib/ 清单；delegation-keys
   指到真实位置；host 注册入口 / 共享读模型 / client 注册入口分列及各自消费方向。
3. **lib/ generated 标识**：醒目段写 read-only 性质、刷新顺序、何时必须重建 Web 产物——构建事实家 =
   [docs/guides/bootstrap.md](../../docs/guides/bootstrap.md)，只引不抄。
4. **依赖图盘点**（实施时产出）：import/构建/发布/测试消费者图——谁消费 src/lib 哪些模块、经什么接口；
   归档进实施 Note 供拆分裁决引用。
5. **物理拆分延后（拍板）**：本 RFC 只做文档与依赖图。重启条件 = 依赖图或实施证据显示「目录名/位置
   导致错误修改」（按 README 找错文件复发、或 ≥2 独立消费者经同一 interface 使用共享模块且误改面扩大）；
   条件成立时新立卡或新 RFC 引用本条与原卡阶段 5 毕业条件（只改视觉不降错误概率即否决；迁移须路径
   门禁 / keyless / 构建 / 发布形状 / 真实入口全绿）。

## 输掉的方案（留尸）

- **现在就物理拆 src/host + src/domain**：同日刚落过 scripts/tests/snapshots 大迁移（b2b80c0），无证据
  先迁 = churn（用户裁决延后）。
- **owner 表复制进 docs/**：pack README 唯一家，docs/ 只导航。
- **把 lib/ 挪出包或改名**：发布合同（release-smoke 验收 lib 形状）不动。

## 验收

- 实测四问：新增/修改一个 persona、一个 skill、一个 host 工具、一个 client 页签——各给出唯一文件、
  构建路径、最窄验证（记录进实施 Note）。
- src/README 与实际文件一一对应（`pnpm verify` 的 bare-path/md-links 绿 + 人工对照）。
- lib/ 有 generated/read-only 说明与刷新顺序。
- 依赖图产出并归档，供未来拆分裁决引用。
