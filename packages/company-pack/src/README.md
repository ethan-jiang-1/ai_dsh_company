# src/ —— 本包源码面（host 半 + client 半）

**布局**（2026-09-26 按盘核对重写；旧文描述的 `delegation/`、`tools/` 两个目录**从未落地**）：

- `index.ts` —— host 入口（bundle 行 `company-client` 指向它）。
- `lib/` —— **host 侧真正的家**：看板/依赖图/在场/台账/用量/委派的读模型与纯逻辑
  （`board.ts` / `dag.ts` / `presence.ts` / `ledger.ts` / `routing.ts` / `delegation-keys.ts` …）。
  这些是 keyless 单测（`tests/*.spec.ts`）的直接对象——UI 组件只做渲染。
- `client/` —— client 面（品牌皮肤 + 五个平台页签 + 整页公司视图），走 `dsh.client` 与 tsdown 的
  client 半构建（产物 `lib/client.js`，见 `../tsdown.config.ts`）。

**构建**：`tsc -b packages/company-pack` + tsdown（见 [dev-loop §7](../../../docs/guides/dev-loop.md)）。
⚠ 本目录**不进 tarball**（`files` 只含 `lib/**`、`presets/**`、`cordis.patch.yml`）——发布面是 `lib/`。
