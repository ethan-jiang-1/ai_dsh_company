---
status: 已结
opened: 2026-10-25
---

# 推敲：分发契约与产物身份（陌生人拿到的是什么）

> 立卡：2026-10-25 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：做；去向 = `notes/archived/2026-10-25-distribution-lifecycle.md`（与卡 2 合并）

**问题与期望结果：** 现在的 tgz + 生成手册能证明“装得上、首启能起”，但不能让一个陌生人回答：这包要哪个 DSH / Node / OS、怎么核对字节、装错了怎么退、谁会支持哪个版本。期望：只拿 tgz + 手册 + 一个兼容 DSH，就能走完“识别 → 校验 → 安装 → 首验 → 失败退出”，并且 `pnpm verify` 有机械门禁。

**当前情况：**
- 包声明（[package.json](../../../packages/company-pack/package.json)）有 `private: true`，没有 `engines`、`license`、`repository`；`dsh.compatibility.dshReleases` 是本地台账，DSH 运行时不读它，真正拦安装的是 peer 范围。
- 手册（[_dist/安装手册.md](../../../_dist/安装手册.md)）假设收件人已有 `dsh`，只写“验证基线”，没有获取方式、sha256、降级/回滚、支持窗口。
- 导出器（[tools/export-dist.mjs](../../../tools/export-dist.mjs)）生成手册与 tgz，但没有产物指纹。
- DSH 官方兼容字段是 `engines.dsh`（[publish.md](../../../vendor/dsh/docs/user/develop/basic/publish.md)）；安装期/启动期拒绝不兼容包（[app-boot](../../../vendor/dsh/packages/boot/app-boot/README.md)）。
- 包内没有面向最终用户的 README；pack README 是维护者视角。

**未决问题：**
- Q3：渠道是“少量已知收件人 + 手递 tgz”，还是“陌生人自助 + npm”？渠道决定 license/名字/发布自动化/支持承诺。
- `engines.dsh` 用“与 peers 同宽的 0.2.x 范围”，还是“只列验证过的精确版本”？推荐前者 + 矩阵台账做“已认证”标记。
- 谁是支持者、支持多久？现在没有承诺。

**下一步：** 等 Q3 决策；按决策写 RFC（manifest + 手册生成器 + 门禁），再用真实不兼容 DSH 跑一次拒绝、用 sha256 跑一次校验。

## 范围与排除项
- 范围：pack manifest、`_dist` 手册生成、`dist-manual` / `pack-shape` 门禁、release 文档。
- 排除：npm publish、market 索引、代码签名、离线预构建。

## 已知与未决
- 已知：`engines.dsh` 一旦存在就忽略 peers；两者不能各说各话。
- 未决：license 选什么（内部/开源/专有）；包名是否加 scope；是否支持降级。

## 方案与取舍
- A 手递 tgz + 补齐契约（推荐）：成本低，适合少量已知收件人。
- B 直接 npm：自助/可发现，但要 license、发布自动化、支持承诺；当前生命周期证据不足，风险高。
- C git 安装：可追溯，但要求构建/`allowBuilds`，不适合非开发者。
- 取舍：先 A，按 B 的标准准备；第二个消费者出现再切 B。

## 验收标准

（初稿；Q3 决策与 RFC 时定稿。）

- `pnpm verify` 的 `dist-manual` / `pack-shape` 断言手册含前置、sha256、回滚，`engines.dsh` 与矩阵一致。
- 对不匹配 DSH 真跑 `plugin add` → `incompatible-version` 拒绝；匹配 → 通过。
- `shasum -a 256` 与手册一致；篡改一个字节 → 校验失败。

## 关闭条件
- Q3 已决；卡顶写结论与去向；若“做”，RFC 已批、验收已跑；若“不做”，写明适用边界。

## 裁决（2026-10-25）

- Q3 = 手递 tgz + registry-ready，本轮不 publish。license 先 `UNLICENSED`（内部交付），发布时再定；`engines.dsh` 取与 peers 同宽的 0.2.x 范围，矩阵保留“已认证 tag”台账。
- 去向：`notes/archived/2026-10-25-distribution-lifecycle.md`（与卡 2 合并）。
