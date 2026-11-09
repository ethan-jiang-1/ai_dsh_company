# retro 候选 1+2 落地：判据写法进宪法、catalog 语义进入口

状态：implemented（2026-10-23；用户令「拟计划 → setup goal 推进」；
上游证据 = [residual verification Note](../archived/receipts/2026-10-23-residual-verification.md) 里两处判据读错面的实测）

## 决定

1. **测试宪法 §3 加第 9 条「判据读什么，写死」**（[testing.md](../../docs/testing.md)）。
   三要素：只读类型化字段（正文只认 `content[].type==='text'`、路径只认 `file_path`、行为只认事件 `type`）/
   结论必须有 `turn/end` 收口凭据，超时 = 无结论 / 判据要能拿同一份事件流离线复判（`--log`/`--evidence`）。
   依据：本轮两个探针是同一类错——`member-bounceback` 把 **reasoning 当正文**（假绿），
   `member-reject-in-team` 把**整段 arguments 当路径**（假红，正文提到路径即命中）。
2. **根 AGENTS.md 的 skills 行补 catalog 语义**：catalog 只收模型可加载项；
   带 `disable-model-invocation` 的用户命令（`/retro` 等）不进 catalog、需用户点名。
   依据：本轮开场 `skill retro` 硬错；`~/.agents/skills` 28 个里 16 个是用户命令。

## 输掉的方案

- **给判据写法建门禁**（grep `String(e.data.arguments)` / `collectText(e.data`）：合法用法也长这样
  （`domainWork` 就是有意匹配命令串），静态匹配误报率高；真正的守卫是「可离线复判」这个可执行性质，
  落成规范 + 探针自带 `--log`/`--evidence`，不造门。
- **给 probes 目录新建一份 README 存判据规范**：会变成第二份清单（D28/D34 同款教义），且不在必读路径上。
- **把 catalog 语义放 dev-loop**：它不是每次会话都读；放根 AGENTS.md 的 skills 行才在开口处生效。

## 后果

- 两个常驻面各一句；不新增门禁、不新增脚本、不改任何 probe。
- testing.md 71 → **72/75**（仍有 3 行头寸）；AGENTS.md 78/84（行数不变，只加从句）。
- 规范不证明「下一次写探针会照做」——这是规范不是机制，如实登记；若同类错再犯，再按门禁升格判据谈。

## 验证（真跑）

```text
wc -l docs/testing.md AGENTS.md     # 72, 78
pnpm verify                         # ALL PASS；doc-budget testing (72/75)、AGENTS (78/84)
pnpm test                           # 78 spec / 727 tests
```

红形态：超预算时 doc-budget 直接报 `docs/testing.md (76/75)` 并 FAIL，不看对话即可复现。
