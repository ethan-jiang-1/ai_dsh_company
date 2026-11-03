# 2026-11-03 · 第五轮打扫批次 A：让绿有意义（content 门禁 / 隔离真页面 / diagnose 全文匹配）

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」，批次 A 为真实性止血，不动 `_backlog` 章程）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md)
> 批次 A 范围 = R5-01 / R5-02 / R5-08 / R5-11 / R5-21 / R5-22 + E1（R5-30）。R5-03/04/05/06/07/10/31 等留给后续批次。

## 决定

1. **随包内容门禁根 = `packages/company-pack/content`。** `shipped-links` 与 `nav-count-claims` 从已删除的出厂骨架目录迁到 v3 的 `content/`；根缺失时**报缺失并退出**，不再在空目录上 PASS。`shipped-links` 对 content 相对链接按 content 根解析、对 skill 的非相对目标按运行盘路径放过（`.dsh-company/...` 由 host 首启创建，不能在包里要求存在）。
2. **隔离真页面档走产品同形预置。** `ui-scene-smoke --isolated` 不再 spawn 已删除的独立启动器：官方 web 模板建 `company` profile → `plugin add <pack 目录>`（link）→ 以 `--profile company` boot；`.dsh-company/` 由 host 首启自举。`--golden` 金样随现行 UI 刷新，连续两次隔离跑一致。
3. **`diagnose` 的非零退出匹配未截断全文。** 先 slice 再正则会把末尾的 `[exit code: N]` 切掉；改为全文匹配、证据取尾部片段，并补 >400 字符失败输出的守卫。
4. **`md-utf8` 跳过 gitignored 运行态。** `runtime/`、`company-workspace/`、`.pnpm-store/` 不是本仓 Markdown 源；隔离探针留下的 pnpm 缓存 README 不再把 `pnpm verify` 打红。
5. **同批真相修正**：`src/README` 的 `files` 清单改指 `package.json`；`terminology` 的组合链改指 `docs/design/architecture.md`；`.gitignore`、`templates.spec`、`markdown-links`、`replay-fixture-freshness`、`runtime/README` 的旧 `workspace/` / 独立启动器指针改指现行家；`layering.spec` 删掉“fetch/spawn/exec 由下方 call 表达式检查”的假声明；决策台账 D50/D51 按编号排序；`deliverables-catalog` Note 的生成索引路径改到 `.dsh-company/kb/`。

## 输掉的方案

- **保留 `--isolated` 已死、只删文档。** 会丢掉唯一的确定性真页面文本回归网；v3 产品路径已能提供隔离 home，重建成本低于永久失去这一层证据。
- **恢复 tools/standalone.mjs（已删除）。** 它与“无 launcher、产品入口 = named profile”的决定相反（v3）；恢复等于把已收掉的产品面重新长出来。
- **把 `shipped-links` 的 skill 非相对链接也要求包内存在。** skill 链接指向角色 cwd 的 `.dsh-company/...`，包内不存在是正常的；强行存在性会制造假红。
- **用正则直接扫 tests 的 fetch/spawn/exec。** 会把夹具字符串误判成调用；本轮只删假声明，不引入第二个误报源。真正的 call 级检查留给后续批次（R5-08 的剩余面）。
- **为 `content/` 链接另写一套解析器。** 复用原门禁的安装读者视角，只换根与 skill 分支；第二套解析器必漂。

## 验证（实跑）

```text
pnpm verify
# ALL PASS；shipped-links（content 17 份 + skill 14 份 + persona 6 份）
# nav-count-claims ×52
# 2 门无对象（replay-fixture-freshness / replay-ui-freshness）
pnpm test
# 124 files / 1049 tests（1046 pass / 3 skip）
pnpm typecheck
# exit 0
node checks/smoke/ui-scene-smoke.mjs --isolated --golden   # 连续两次
# exit 0 / 金样一致（9 个页签）/ ALL PASS
node checks/smoke/ui-scene-smoke.mjs                        # dev 模式
# ALL PASS（自起实例 + 全部公司页签 + 浏览器错误环零命中）
```

红证（逐条，真破坏真文件）：

- `shipped-links`：在 `content/AGENTS.md` 末尾加 `[broken](zz-missing-shipped.md)` →
  `FAIL shipped-links: packages/company-pack/content/AGENTS.md:158 链接目标不在随包 content：zz-missing-shipped.md`；
  还原 → PASS；`root` 缺失 → `FAIL … content 不在盘上`（不抛异常）。
- `nav-count-claims`：在 `content/AGENTS.md` 末尾加「右栏五个页签」→
  `FAIL nav-count-claims: …:158 → 页签计数声明「五个页签」`；还原 → `×52`；root 缺失 → 报缺失。
- `md-utf8`：`docs/zz-md-scope-probe.md` 无尾换行 → `FAIL md-newline`；删除 → PASS。运行态负例：
  隔离探针留下的 `runtime/tmp/ui-scene-*/user/.cache/.../README.md` 曾把 verify 打红（真实现场），
  跳过 `runtime/` 后绿。
- `diagnose`：新增 `>400` 字符输出末尾 `[exit code: 7]` 的 spec，修复前 `toolNonZeroExits` 为空，
  修复后为 1 且证据文本含 marker；`npx vitest run tests/harness/session/session-diagnose.spec.ts` 13 pass。
- 隔离真页面：修复前 `MODULE_NOT_FOUND` exit 2；修复后第一次对比金样时发现「培养 / 成品」两页签文本
  已漂（旧金样停更于 v3 前）→ 确认是现行 UI 后 `--refresh-golden`，再连续两次 `--golden` 绿。

## 后果与未收

- `shipped-links` 现在真的覆盖 17 份随包 Markdown；`nav-count-claims` 从 35 份扩到 52 份。
- 隔离金样档重新可用，且它立刻抓到了停更的 UI 文本（证明这层回归网有价值）。
- 收口：`probes/browser-visual/cultivation-gui-probe.mjs` 仍引用已删除的独立启动器与旧 `workspace/`
  骨架，已标「已耗（2026-11-03，复跑条件写在头注）」并移出「升 pin / 动培养面」复跑清单；
  培养页点击交互先由 `ui-scene-smoke --steps` 顶班。
- 未收：`diagnose` 的客户端错误落盘门（R5-31）、发布 readiness（R5-03）、授权门牌（R5-04）等仍在审计报告里待批。
- 隔离预置失败现在会回收 `runtime/tmp`，不再把半成品盘留给下一个门禁。

## 事实落点

- 门禁：`checks/gates/shipped-links.mjs`、`checks/gates/nav-count-claims.mjs`、`checks/gates/md-utf8.mjs`。
- 真页面：`checks/smoke/ui-scene-smoke.mjs`；金样 = `snapshots/visual/company-shell/ui.golden.json`。
- 诊断：`tools/lib/session-diagnose.mjs`；守卫 = `tests/harness/session/session-diagnose.spec.ts`。
- 产品面根 = `packages/company-pack/content/`（`workspace/` 已退役）。
