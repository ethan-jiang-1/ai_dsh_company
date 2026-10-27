---
状态：implemented（2026-10-27，六维提分 D1：开工最小路径）
---

# D1 提分：把"开工要读什么"写进入口文件本身

> 上游 = [六维提分卡](../../_backlog/issues/2026-10-27-six-dim-raise.md) 批一。

## 决定

1. **AGENTS.md 顶部改成"开工最小路径"**（不新增路由器）：读完三样就够开工——① 本文件；
   ② 任务 owner（改角色 = presets.md / host·Web = src/README / 文档 = docs/AGENTS.md / 机制 = profile.md）；
   ③ tests/README 的「改动面 → 最窄检查」对应行。其余（project-map / runtime-map / dev-loop / policy /
   testing / checks/README / orient）明确标成**按需**，并给出每个的"什么时候读"。
2. **热链带锚点**：AGENTS → dev-loop `#05-任务入口与交接` / `#1-执行链从授权到有证据交接`
   （`md-links` 已校验 heading 锚点，slug 规则 = 小写、去符号、空格→`-`）。
3. **删重复路由**：AGENTS 后文原有一句"任务入口与执行规则唯一见开发环"与新块重复，删掉；
   入口只有一处。
4. **验证三件套各加一句分工**：testing = 政策与证明边界；tests/README = 改动面映射 + 命令与预算；
   checks/README = 逐脚本索引。三份文件顶部互相点名，读者不用读完才知道选哪份。

## 输掉的方案

- **新建一份 docs/start.md 开工卡**：会变成第五个路由器（project-map / index / orient / README 已在）；
  AGENTS 本来就是会话自动注入的文件，把最小路径放它顶部是零跳。
- **裁 project-map / 合并 orient**：空间地图对"改哪里"仍有用；本轮只改**读的顺序**，不动内容 owner。
- **提高 AGENTS 预算放更多内容**：82/84 已接近顶格；本轮净增 2 行（合并重复句后），没有再涨额度。

## 后果

- 入口链的"必读"从 6 份 570 行变成 3 份（AGENTS + 任务 owner + tests/README 对应行）。
- 实测（fresh-agent 只读走查，空上下文子代理）：
  - 「新增右栏公司页签」：文档读入 **206 行**（AGENTS 82 + src/README 32 + tests/README 92），
    加实现文件 670 行；dev-loop **未读全文**，只按锚点读 §0.5–§1（31 行）。
  - 「改 CEO persona」：文档读入 **369 行**（AGENTS 82 + presets.md 195 + tests/README 92），
    加目标文件 602 行；子代理判断为机械单步、跳过 dev-loop。
  - 三件套分工"无不确定"；两处歧义（tab 注册算 src/README 还是 profile.md；presets.md 指向 pack README 的额外跳）
    都由 tests/README 的改动面行与 presets.md 内的文件指针化解。
- `doc-budget AGENTS 82/84`、`md-links`（含新锚点）全绿。

## 验证（真跑）

```text
node checks/run-gates.mjs   → verify: ALL PASS；2 门无对象（doc-budget AGENTS 82/84；md-links 含锚点）
# fresh-agent 走查（只读子代理，不改文件）：见上"实测"两行数字
```

未验：没有用真模型驱动入口探针对新文案打分（entry-probe 属认证档，留待批四）。
