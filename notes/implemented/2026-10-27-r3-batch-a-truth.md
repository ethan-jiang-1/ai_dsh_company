---
状态：implemented（2026-10-27，R3 批次 A：真实性止血）
---

# R3 批次 A：把"已移出产品仓的资产"从活跃面如实下架，并让 pin 判据绑定单一事实家

> 上游 = [第三轮六维度打扫卡](../../_backlog/issues/2026-10-27-repo-hygiene-round3.md)（R3-05/09/15/16/26）；
> 证据 = [审计报告](../../_backlog/research/repo-hygiene/2026-10-27-six-dimension-audit-round3.md)。
> 前序决定（不移交、只兑现其后果）：产品仓只留合成证据 = [run-bundle-install-unit](./2026-10-24-run-bundle-install-unit.md)（D46）。

## 决定

1. **活跃文档与工具不再把已撤的资产当现行**：回放舰队（r2/r3）、真实动议归档、判据语料都已随真实证据移出产品仓
   （2026-10-25）。本轮把 `release.md §升 pin`、`dev-loop §5`、`testing.md §1/§4`、`cdp-probe.md` 对照表、
   `client-load-smoke` 头注、`replay-smoke` 头注、`design/ui-demo.md` 两行验收、`demo.md` 四处基线全部改成
   "真实证据已移私有仓 / 本仓只有合成 fixture"，并把 `--ui` 标成"仅对声明 uiEvidence 的场景开放（当前无）"。
   UI 回放场景另立（R3-C1），不在这批假装存在。
2. **`candidate-scan-eval` 缺语料时 exit 2**，打印缺失路径与原因（语料不在产品仓），不再 ENOENT 崩栈。
3. **入口探针的 Q4 判据绑定现行 pin**：spec 的答案从 `AGENTS.md §vendor 簿记` 现读；评分器新增可选
   `{ expectedTag }`，`entry-probe-smoke` 用门禁常量 `checks/gates/lib/pin.mjs` 注入严格判据。旧 pin 的答卷
   从此判红（新增 3 个 spec）。
4. **页签计数门禁扩面**：`nav-count-claims` 扫描面增加 `packages/company-pack/README.md` 与
   `packages/company-pack/workspace/*.md`（随包分发的收件人文档与会话注入手册），并修掉包 README 的
   "五个页签"（注册面实际 9 个）。
5. **`snapshot-motion` 不再默认往 `r2-motion` 写**：`--out` 变必填（场景名随动议）；`snapshot-path` 的用法示例
   改成现行合成场景。

## 输掉的方案

- **只把数字改对（把 Q4 写死成 0.2.1-rc.2）**：下次升 pin 同一处又腐，且这正是本轮在治的"易腐常量多拷贝"；
  选"从簿记/单一常量取"。
- **把 `checks/gates/lib/pin.mjs` 搬进 `tools/lib/` 让 spec 合法 import**：会牵动 `tools/sync-dsh.mjs` 的
  解析路径与多篇 Note 的历史落点，收益只是 import 好看；选"spec 从 AGENTS 现读 + 评分器注入"（分层守卫
  本身也不许 tests import `checks/`，这条边界值得保留）。
- **恢复 r2/r3 回放场景以保住文档**：真实证据不进产品仓（D46），重录要真模型；文档如实下架 + 另建合成场景
  才是正路。
- **`candidate-scan-eval` 缺语料时静默跳过**：会制造一句新的真空绿；选 exit 2。
- **不扩门禁、只修包 README**：同一类计数漂移已在 docs 面复发两次，扩面是"让绿有意义"的一半。

## 后果

- 包 README 不再声称页签数量；`nav-count-claims` 现在扫 47 个文件（含随包文档）。
- `pnpm test` 从 907 → 910（新增 Q4 严格档 3 例）；`entry-probe-smoke` 的机器分从此对旧 pin 不宽容。
- 升 pin 文档如实说明"本仓回放网只证明管线可跑"，语义回归网在部署仓；C1 落地后再补一句新场景。
- `snapshot-motion` 调用方必须显式给 `--out`（仓内无调用方，无破坏面）。

## 验证（真跑）

```text
# 门禁扩面红→绿（破坏真文件，不是构造夹具）
packages/company-pack/README.md 追加「公司视图与五个页签。」
  → FAIL nav-count-claims packages/company-pack/README.md:117 → 页签计数声明「五个页签」
还原 → PASS nav-count-claims ×47（导航面零页签计数声明）

# 语料缺失不再崩栈
node checks/audit/candidate-scan-eval.mjs
  → exit 2 + "判据语料缺失（…/snapshots/corpora/candidate-scan-corpus/cases）——语料随真实证据移出产品仓"

# 回归
npx vitest run        → 97 files / 910 tests passed
node checks/run-gates.mjs → verify: ALL PASS
```

未验：`entry-probe-smoke` 真模型档未跑（成本）；它现在会传 `expectedTag`，真模型是否答对现行 pin 未观察。
