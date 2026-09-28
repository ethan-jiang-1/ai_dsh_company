# 2026-09-28 · CI 样板化：verify-only CI + test 进 pre-push hook（首跑红定界）

状态：implemented（2026-09-28。起因 = 用户点名「还是需要一个简单负担不重的 CI，github 需要的那种」。
本轮含一次**红灯对照抓到自己错判**的完整闭环，如实入档。）

## 交付

1. **workflow `verify` → `ci`**（`git mv`，无 required check 引用故改名零成本；检查名 = `ci / verify`）。
   单 job：干净环境全量结构门禁；**concurrency 同 ref 取消旧跑**（「每条一 commit + push」节奏防排队）；
   **timeout-minutes: 15** 帽住网络类坑。README 加 badge 一枚。
2. **test lane 进 CI 的尝试被首跑红否决**（run 36373885805，红在 test 步）：根因 = vendor **内部**的
   `@deepseek-ai/*` 解析走包入口（`vendor/dsh/vendor/cordis/src/events.ts` → cosmokit → 未构建 lib）。
   本仓 tsconfig 是 `files: []` 门面——paths 只服务本仓文件，vendor 内部文件走 node 解析；本地能过
   纯粹因为 dev 树已构建 lib。**「import 面无构建产物」的核查漏了 vendor 内部这一层**——DSH 自己的
   `"test"` 脚本 = `build:native-system && vitest run`，即 DSH 本尊也是先构建再测。
3. **test 的 enforcement 挪进 pre-push hook**（本仓 dev 树按 bootstrap 必然已构建，test 1.3s 便宜
   高置信——正中「hook 只装便宜高置信缺陷」口径）：hook 现跑 `verify` + `pnpm test`，行为测试从此
   推不上未过关的 origin。CI 保持 verify-only（其定位 = 干净环境差异 + --no-verify 绕过的穷举档）。
4. **负例留证**：临时失败 spec → hook exit **1**（pnpm test 红）→ 删除 → exit **0**；CI 红腿 =
   test 步 exit 1（日志在案），撤步后 CI 应回绿。

## 输掉的方案

- **vitest 配 src 别名修 vendor 内部解析**：失败 spec 全是 client 链，牵涉 ~20 个 `@deepseek-ai/*`
  包 + 各自传递依赖——别名映射是维护无底洞，且与 vendor 自己的包入口语义对着干。不借。
- **CI 里跑 vendor 全量构建再 test**：DSH 同款（build && vitest）但 `pnpm --dir vendor/dsh run build`
  在本仓嵌套工作区必失败（D27 在案）；等于把升 pin 的坑再挖一遍，负担远超「样板 CI」定位。
- **CI 只跑「不碰 vendor 链」的 22/27 个 spec**：排除清单随 spec 增长必腐，覆盖静默缩水——发明脆弱机制。
- **分支保护 / required checks / 矩阵 / cron / coverage**：同前论，不做。

## 验证（实际跑过的）

- 本地：`pnpm verify` ALL PASS + `pnpm test` 230/230（提交前实跑）。
- CI 首跑（36373885805）：verify ✓（53s 内过）→ test ✗（红在 cosmokit 包入口解析，日志已取）。
- CI 撤 test 步后的提交：**回填于此**（预期绿）。
- hook 负例：失败 spec → exit 1；还原 → exit 0（上节）。

## 登记

- intents.md 同批修正 CI 行；[enforcement Note](./2026-09-27-enforcement-channel-and-boundaries.md)
  的 test lane 指针改为终态（进 hook 非 CI）；dev-loop §12 push 落点 bullet 补 hook 跑 verify+test。
- test 回 CI 的触发条件：上游提供免构建 test 路径，或第二贡献者进场值得付构建链成本。
