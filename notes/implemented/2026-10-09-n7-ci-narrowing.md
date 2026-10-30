# N7 收窄：CI 窄是真的，但「缺 coverage 门禁」是我读错了

状态：已消化（2026-10-09；用户令「能修的就修，能补的就补」——本条 = 第二遍深挖 gap N7 的**收窄与部分撤回**；结论 = CI 宽度是**有据的取舍**，不是欠账）。

## 原主张拆成三条，逐条对账

第二遍深挖时我把 N7 报成「最贵的一条」：全 commit 直推 `master`、零 merge commit、无 PR/stack 纪律、
CI 1 job vs DSH 10、**且无 coverage 门禁**（而 `docs/testing.md` 点名 `test:coverage` 是 CI 覆盖门禁）。
逐条核过之后：**前两条成立（但性质需重述），第三条是我读错。**

### ① 无 PR / stack 纪律 —— **成立**，但不是"缺流程"

- 事实：分支 `master`，历史**零 merge commit**，全部直推。
- 更新：`docs/testing.md` 的「升级地图」节（[§6](../../docs/testing.md)）里那段确实提到 "coverage 死代码扫描"，
  但那是**未来可能加的检查**，用「→」串成一条升级路径。它**没有**说 `test:coverage` 是当前 CI 门禁——
  是我把「升级设想」读成了「现行承诺」。`package.json` 当时没有 `test:coverage` 脚本（2026-10 后期
  加了 `pnpm test:coverage` 观察档，不进 CI、不是门禁），所以不存在"点名了却没实现"的欠账。
- `.github/workflows/ci.yml` 的注释写得很清楚，而且是**带红证的决定**：test lane 不在 CI
  （2026-09-28 首跑红，run 36373885805），因为 vitest 解析 vendor 内部 `@deepseek-ai/*` 走包入口
  （未构建 lib），干净环境必红；补齐要付全量 vendor 构建链，负担不成比例 ⇒ test 挪进 pre-push hook，
  并写明**回 CI 的触发条件**（上游提供免构建路径 / 第二贡献者进场）。
  这是 DSH 的 "choose deliberately" 做派，不是疏忽。
- **不修**。一条有红证、有回退触发条件的取舍，不该被"DSH 有 10 个 job"这种**数量对比**推翻。

### ③ 我真正该报的（保留）

CI 窄**本身**没问题；问题在**别处**，而且比"缺 coverage"更实在：

- **pre-push hook 是唯一的 test 防线，而它可以被 `--no-verify` 静默绕过**——CI 注释自己说 CI 防的就是
  "`--no-verify` 绕过"，但 test lane 不在 CI，所以**这个绕过路径对 test 是敞开的**：绕过 push 后，
  CI 只跑 `verify`，355 个测试一个都不跑，而没有任何信号提示"这批 commit 从未跑过测试"。
- 这是**可验证的缺口**（不是猜测）：本仓 `docs/testing.md` §3.7 把「prove-it-red」立为普遍规则，
  而 test 面恰恰是最容易被静默跳过的那一面。

**处置建议（本轮不做，见下）**：让 CI 记录"本次 push 是否带着本地 test 收据"，或把 test 的
enforcement 从「hook 里跑」升级为「CI 里校验收据存在」。属于**独立一轮的设计**，不是本轮能顺手补的。

## 决定

- **修**：无代码改动。本条的价值是**把一条错报收窄成一条真报**，并把真问题写成可执行的下一步。
- **不改 CI**：test lane 出 CI 有红证与触发条件；本轮没有任何新证据推翻它（没出现"CI 绿但线上坏"的案例）。
- **不建 coverage 门禁**：原主张的前提（`testing.md` 已承诺）不成立。而且覆盖率门禁本身在 DSH 语料里
  也不是默认档——先有真需求再建，符合本仓「无复发不建 gate」的既有口径。

## 输掉的方案

- **照原主张加 `test:coverage` + CI job**：否决。为一条**我读错**的主张建门禁 = 用工程量掩盖判断错误，
  而且覆盖率阈值是典型的"数字好看但不管质量"的门禁——本仓 D26 明确「文件/行数仅观察，不是完成门槛」，
  覆盖率同属此类。
- **把 test lane 搬回 CI**：否决（本轮）。首跑红是事实，搬回去要先解决 vendor 构建链——那是独立一轮
  的事，且需要先在本地证明"干净环境能跑通"。
- **直接写一条"绕 hook"的纪律了事**：否决。「别用 `--no-verify`」是**劝告**，不是机制；本仓纪律是
  「机械不变量进执行门禁」。真要做就得让 CI 能**看见** hook 有没有跑过，那是设计问题。
- **静默删掉 N7**：否决。N7 一半是错的、一半是真问题；整条删掉会把真问题一起丢掉。**收窄比撤回诚实**。

## 验证记录（2026-10-09）

| 步 | 实跑命令 | 判据与结果 |
|---|---|---|
| coverage 主张 | `grep -n "coverage\|覆盖率" docs/testing.md` | 唯一命中在第 75 行「升级地图」节（未来时）⇒ **非现行承诺**，原主张前提不成立 |
| 脚本面 | `node -e` 读 `package.json` scripts | 只有 `dsh/orient/verify/test` 四个，**无** `test:coverage` ⇒ 无"点名未实现" |
| CI 面 | 读 `.github/workflows/ci.yml` | 1 job（`verify`）；注释载明 test lane 出 CI 的**红证**（run 36373885805）与**回退触发条件** |
| 分支史 | `git log` | 全 commit 直推 `master`，零 merge commit（①成立，性质已重述） |
| 绕过面 | 读 `.pre-push` + CI 注释 | hook 跑 verify+test；`--no-verify` 可绕过，而 CI **不**跑 test ⇒ 真缺口成立 |
