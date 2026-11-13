# client 面层次化：src/client 五分目录、tests/client 镜像

状态：implemented（2026-11-03 第六轮 D/E 批）
上游 = [第六轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round6.md) ·
材料 = [第七维审计](../../_backlog/_archive/research/repo-hygiene-round6/2026-11-03-seven-dimension-audit-round6.md)（R6-10）

## 决定

`packages/company-pack/src/client/` 从 41 个文件平铺改为 **1 个入口 + 5 个关切目录**；`tests/client/` 以同名五组镜像，
根只留 whole-client 组合 spec：

| 目录 | 放什么 | 判据 |
|---|---|---|
| `wiring/` | 组合与接线（context-wiring、session-adapters、attention、member-navigation、title-state、instance-guard、error-ring、delegation-keys） | 改它影响「谁挂到哪里」，不改用户看到的内容 |
| `data/` | 数据面（company-data-plane、use-company-data、deliverables-index、workspace-text、session-source） | 读模型/订阅/路径常量，可被 UI 与 wiring 同时消费 |
| `ui/` | 共用视觉件（styles、Brand、RoleBadge、tab-icons、float-geometry、DelegationCard、TeamToolCard） | 无业务状态、只吃 props |
| `tabs/` | 页签面（company-tabs、company-panels、company-tab-registration、四个页签体、TasksPanel） | 注册面与页签壳/体 |
| `cultivation/` | 培养域（view/tab 壳、看板/收件箱/创作/背景选择器、actions/data/context-data、use-cultivation-board） | 同一产品子域，互相引用最密 |

顶层只留 `index.ts`：读一个目录名就知道去哪，而不是先吃 41 个文件名。**这是用户 2026-11-03 的明示要求**，
与第五轮 D2「不建议重组平铺」的结论相反——按用户改判，并把理由记在这里而不是散在对话里。

## 输掉的方案

- **保持平铺**：第五轮的反证是「教义 + 门禁 + 一屏可扫」。但 41 个名字里混着五种关切，`ls` 不传达架构；
  用户明确把这列为维度 ② 的验收点。
- **按文件类型分组**（`components/` + `hooks/` + `lib/`）：按实现形态分组不传达领域，改动时仍要跨三个目录找同一件事。
- **每个文件一个目录**：过度，目录数 41，扫描面一样大。
- **同时重组 `checks/gates`(53) / `tools/lib`(48) / `tests/harness`(53)**：这三处被 53 门与 86 脚本以**相对路径**引用
  （`../lib/*.mjs`），搬迁的收益（同屏可扫）低于一次性 diff 的风险（引用面 ~200 处，且门禁自身在验证链上）；
  留待下一轮单独论证、单独验证。

## 后果

- 94 处相对 import 重写（脚本按旧路径解析→新路径重算，不手改）；47 份 client spec 移入五组，根留
  `company-client-composition.spec.ts`（whole-client 组合）。
- 同 diff 必须跟着改的「路径即契约」面：`tsconfig.test-client.json` 的三条 exclude（直引 vendor 源码的 spec）、
  `vitest.config.ts` 的覆盖阈值路径、`checks/gates/ui-golden-freshness.mjs` 与 `tests/ui/company-tab-catalog.spec.ts`
  读的 `company-tab-registration.ts` / `tab-icons.tsx`、`cdp-probe` 的源路径、`tests/client` 里读 `styles.ts` 的 CSS 夹具（client-css / motion-css / 三个视觉夹具）。
- 历史文档里的路径指针（`docs/`、`notes/implemented/`、`notes/archived/`、`_backlog/_archive/`）按**事实落点**机械更新
  ——归档层只改路径、不改决定正文（与 2026-10-30 移动归档时补 66 处断链同一口径）。
- 新增 `checks/gates/link-debt.mjs`（C 批）：本次搬迁会制造/修复死链，门禁把豁免区从「不看」变成「有数字只许降」；
  基线 = `checks/gates/lib/link-debt.json`（archived 32 / moved 0 / live 0）。

## 验证

```text
# 结构面
pnpm typecheck   # exit 0（中途两次真红被抓住：① CultivationChatPanel 的 `import './session-source.ts'`
                 #   侧效应导入漏改 → TS2882；② tsconfig.test-client 的三条 exclude 路径随移动失效 →
                 #   vendor 源码被拉进 client 项目报 TS7053/TS2532。两处都按新路径修好）
pnpm test        # 139 files / 1109 tests 全绿
pnpm verify      # ALL PASS（56 门 + 2 无对象）
../../node_modules/.bin/tsdown   # host 162.00 kB / client 352.21 kB，Build complete（产物形状不变）

# 真页面（改的是用户可见面，必须看渲染）
node checks/smoke/ui-scene-smoke.mjs --isolated --golden
# ui-scene-smoke: 金样一致（9 个页签）
# ui-scene-smoke: ALL PASS（自起实例 + 全部公司页签 + 浏览器错误环零命中）

# 计数前后
find packages/company-pack/src/client -maxdepth 1 -type f   # 41 → 1（index.ts）
find tests/client -maxdepth 1 -type f                       # 48 → 1（company-client-composition.spec.ts）
```

未验：`release-smoke`（安装形状）未在本轮重跑——`lib/` 产物形状与 `files` 清单未变，发布轮会跑；
真模型档与本轮无关。`checks/gates` / `tools/lib` / `tests/harness` 的重组未做（见输掉的方案）。
