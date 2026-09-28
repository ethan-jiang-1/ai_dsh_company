# 2026-09-28 · CI 加 test lane + 样板化（ci.yml）

状态：implemented（2026-09-28。起因 = 用户点名「还是需要一个简单负担不重的 CI，github 需要的那种」
——既定触发条件（第二贡献者/忘跑成常态）未到，**用户指令即新触发**，不包装成判据产物；
有此前见 = [enforcement 通道](./2026-09-27-enforcement-channel-and-boundaries.md) 的 verify-only 道。

## 交付

1. **workflow `verify` → `ci`**（`git mv`，无 required check 引用故改名零成本；检查名从此为
   `ci / verify-and-test`）。单 job 顺序两步：`verify` → `pnpm test`——不并行，省一份重复 install。
2. **test lane 进 CI**：核查依据 = vitest 走 tsconfig paths 指 vendor **src**（纪律本就不走 lib），
   230 测试的 import 面无一指向构建产物（vendor src + 本仓 TS/TSX + react 等 npm 依赖）——
   Note 里旧断言「需 §7 全量构建链」被证伪。唯一实证风险 = 根 install 不覆盖 vendor 根包传递依赖
   （昨天 CI 二跑同款坑的变体）：红则补最小依赖，修不动则带证回退本步。
3. **concurrency** 同 ref 取消旧跑（「每条一 commit + push」节奏下防排队）；**timeout-minutes: 15**
   帽住网络类坑。真模型/浏览器/preset-smoke/replay 不进 CI（分层纪律 + 需 dev home）。
4. **README badge** 一行（ci.yml 徽章）——「GitHub 需要的那种」的可见性面。

## 输掉的方案

- **分支保护 / required checks**：会把「直接 push master 的条目制」逼成 PR 流；hook（忘跑）+
  CI（环境差异/绕过）的 DSH 分工已覆盖真实风险。第二贡献者进场再议。
- **并行双 job**：install 重复付一遍（~40s），顺序总时长反而短。
- **矩阵 / cron / coverage gate**：单 OS 单 node 是本仓现实；无长驻分支 cron 即空转；coverage 不借
  （判定稿在案）。

## 验证（实际跑过的）

- 本地：`pnpm verify` ALL PASS + `pnpm test` 230/230（提交前实跑）。
- CI 首跑（ci.yml 首次 push）：**结果回填于此**（预期红点 = 传递依赖缺；打法 = 三跑闭环先例）。

## 登记

- intents.md 同批一行指针；[enforcement Note](./2026-09-27-enforcement-channel-and-boundaries.md)
  「输掉的方案」中 test lane 延后行补反转指针。
- 后续若有第二个消费者/贡献者：required checks + 分支保护重新评估（触发条件在案）。
