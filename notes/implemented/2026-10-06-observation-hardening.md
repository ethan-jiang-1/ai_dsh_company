# 2026-10-06 · 观测硬化包：seam 集中化 + orient preset 字段 + 白话层扩展

状态：implemented（三条目全部毕业：A `897dce8` / B `a51d6f5` / C `05b5223`；授权链 = driver-surface-package review 收口三笔债 → 用户 2026-10-06「建议的下一步都想弄」+「三条全要」+ 次序 A→B→C + ongoing goal 推进；前包 = [driver-surface-package](2026-10-06-driver-surface-package.md)）

## 背景（为什么立这包）

前包 review 收口登记的三笔债：探针 seam 债（24 个消费脚本硬编码排练盘路径，10-05「发现集中共享模块」教训在 scripts 侧只完成一半）；orient 会话清单缺 preset 字段（前包 RFC 方案承诺过，当时以 keyless 秒级面为由未实现）；白话层只铺到合同层、design/guides 未动。

## 已交付（三条目）

- **A 探针 seam 集中化**：smoke 4 + probes 20 的排练盘路径常量统一 `join(ROOT, REHEARSAL_REL)`（seam = `scripts/lib/rehearsal.mjs`）；presence-e2e 的 console.log 模板串同步改插值。run-gates 前缀清单与 archive 已耗仪器按 RFC 不动（各有冻结理由）。机械守卫 = runtime-layout.spec 新增断言（smoke/probes 代码行硬编码即红，注释放行）。
- **B orient preset 字段**：lib 纯函数 `parseSessionPreset`（只认 type:session 头行；三态 = string | null「头行在场无 preset——裸 CLI 会话」| undefined「不可判定」）+ orientState/render 注入列（gitStatus 同款注入模式）；CLI 侧 `zstd -d -c` 解最近 slug 最新会话头部前 64KB（Node 内置只解第一帧，教义 = dev-loop §3.7），zstd 缺失/失败如实「不可用」。
- **C 白话层扩展**：architecture / roles-isolation / ui-demo / role-content-plan / dev-loop / budget-and-ops 六篇首屏补「什么时候读」行（与合同层同款格式）；bootstrap.md 已有「何时读」行（范本）不动——7 篇中 6 篇需改，D26 删重复优先。

## 输掉的方案（备选必载，留尸）

- 把 run-gates 的 RUNTIME_PREFIXES 也 seam 化——它是「前缀类清单」非「路径常量」，耦合 gate 文件到 lib 收益不抵。
- archive 两处一并转换——已耗仪器「移动不恢复资格」冻结原则，改它们是给死代码续命。
- lib 内直接解 zstd（node:zlib）——Node 内置只解第一帧（R1 实证），多帧解不全；且解码器进 lib 扩大 keyless 图守卫面。
- orient 每会话全量解码——只为一个字段失去秒级性格；截头部即可。
- 白话层一次铺满全部 docs 子文档——漂移面失控；先到 design/guides 层顶。
- bootstrap.md 补重复「何时读」行——它已有该行（范本）；D26 删重复优先于格式统一。

## 验证记录（红绿收据 + 走查）

- **A**：红 = 新守卫 spec 对现状报红（25 处：24 常量 + 1 模板串）；绿 = spec 5/5 + 反证（临时在 date-rule-probe 加回硬编码 → 1 failed → 还原 5/5）+ `node --check`/import 目标全过 + verify ALL PASS + vitest 340 项。
- **B**：红 = orient.spec 2 failed（parseSessionPreset is not a function）；绿 = 13/13 + verify ALL PASS + vitest 342 项 + layering 守卫绿（lib 未引入 child_process）；走查 = 真实会话三态全对（company-workspace 与 rehearsal-workspace 最新会话 `preset ceo` 与日志原文一致；裸 CLI 会话「无——非 preset 会话」；无日志 slug「不可用」）+ zstd 缺失模拟（PATH 去 homebrew）全部如实「不可用」不崩溃。
- **C**：走查 = 每篇首屏一句话可懂何时读；md-links 绿（verify ALL PASS）；行预算不升（dev-loop 375/395，其余无预算文件）。
- 补偿口径（同前包 A）：被改脚本未整批实跑真实入口（触发条件归各自头注）；`node --check` + 相对 import 目标存在性全过。

## 边界与未做

- preset 解码只取日志头部 64KB——覆盖 type:session 头行足够；如未来头部字段后移需同步调大。
- design 之下的子文档（如 design/ 内更深文件）与其它 docs 子目录未铺白话首屏——先到 design/guides 层顶，扩展待点名。
- orient 的 preset 只看每 slug 最新一个会话文件；历史会话的 preset 口径走 session-log-export。
