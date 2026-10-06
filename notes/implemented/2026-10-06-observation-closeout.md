# 2026-10-06 · 观测收尾包：orient --session + 白话层收尾 + 实跑清偿

状态：implemented（三条目全部毕业：A `ff04873` / B `553b551` / C 本 commit；授权链 = observation-hardening 毕业边界节三债 → 用户 2026-10-06「留给你裁决的都想做，如何安排你定」→ RFC 拟序 A→B→C + ongoing goal 推进；前包 = [driver-surface-package](2026-10-06-driver-surface-package.md) / [observation-hardening](2026-10-06-observation-hardening.md)）

## 已交付（三条目）

- **A orient `--session`**：`pnpm orient --session <slug>[/<id前缀>]`——列该 slug 历史会话的 preset/cwd/createdAt（列表视图解最近 10 个头部，64KB 界），单查前缀双兼容（全 id / uuid 段），slug 不存在/前缀无命中/歧义 fail-loud 带提示。lib = `listSlugSessions` + `parseSessionHead`（`parseSessionPreset` 改为其 preset 投影，三态语义不变）+ `renderSessionView`；CLI 解码复用 `decodeSessionHead`。
- **B 白话层收尾**：index.md 性质段原地并入「什么时候读」（148/148 零增长）+ orient.md 指针；runtime-map.md 性质块同款原地补。全 docs 顶层 20/20 首屏覆盖复核通过（判据 = 前 8 行含什么时候读/何时读/这页给/这份地图之一）——白话层自此销账。
- **C 实跑清偿**：四个真实入口实跑全 PASS（收据见验证记录）——两包改过路径的脚本首次过真实入口。

## 输掉的方案（备选必载，留尸）

- orient 主视图解全部历史会话的 preset——只为历史口径拖慢主视图，违背秒级性格；历史口径走 --session 增量入口。
- `--session` 解全量日志——头部字段在前 64KB，全解是浪费。
- 实跑全部 24 个 seam 消费脚本——多数需多用户/模型/浏览器长跑，成本失控；机械守卫 + rehearsal-init + 本轮四个代表性 lane 已覆盖风险面。
- 白话层强行铺到 index 台账内部——台账行有 own 格式，首屏行覆盖即止。
- preset 前缀只认全 id——用户从输出里抄 uuid 段是自然行为，双兼容才是对的（实施中实测发现并修正）。

## 验证记录（红绿收据 + 走查）

- **A**：红 = orient.spec 3 failed（三个函数不存在）；绿 = 16/16 + verify ALL PASS + vitest 345 项；走查 = `--session --Users-…-company-workspace--` 列表解出 ceo/cfo/vp-sales 历史口径（显示 10 / 共 66）、单查 uuid 前缀与全 id 前缀双通、前缀歧义与无命中与 slug 不存在三类 fail-loud exit 1。
- **B**：预算门禁绿（index 148/148 零增长、runtime-map 58 行不破）；覆盖复核 20/20；md-links 绿。
- **C**（实跑收据，全部 source dev/env.sh 后真跑）：
  - `node scripts/smoke/replay-smoke.mjs --scenario replay/r2-motion --wall 60` → **ALL PASS**（无 key 重放 33s：member/task 集合等价 + 在场板同形 + 全程无 key）——replay-runs 路径真实验证。
  - `node scripts/smoke/client-load-smoke.mjs` → **ALL PASS**（headless 真浏览器：console 零 loader 错误 + 品牌槽在场）——web profile 装配真实验证。
  - `node scripts/smoke/snapshot-motion-smoke.mjs` → **PASS**（keyless CLI 集成：actual captured, independent expected preserved）。
  - `node scripts/smoke/preset-smoke.mjs` → **ALL PASS**（真模型：5 preset 全部可挂载 + 各角色 skills 隔离 + client 模块闭包 lint 68 模块缺失 0）。
- 补偿口径收口：实跑后本包与前包路径改动已被真实入口覆盖 replay/装配/CLI 集成/preset 挂载四个风险面。

## 边界与未做

- preset/头部解码只取日志前 64KB——覆盖 type:session 头行足够；字段后移需同步调大。
- headless 会话收尾会删目录（walk 实证）：`--session` 单查对已清理的 id 如实报「无命中」，属运行态生命周期非缺陷。
- 20 个重探针保持按头注触发（多用户/模型/浏览器长跑不入常规清偿）。
- orient 主视图形状未改（--session 是增量入口）。
