# 2026-11-03 · 退役路径门禁补 v3 两类退役：workspace/ 与独立启动器

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D4 R5-11/R5-01）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-11 / R5-01

## 决定

`checks/gates/retired-path.mjs` 的退役前缀表新增两条：

- **packages/company-pack/workspace**（已删除） → 现行家 `packages/company-pack/content`（v3 内容迁移）；
- **tools/standalone.mjs**（已删除） → 现行入口 `checks/smoke/ui-scene-smoke.mjs`（产品入口 = `dsh --profile company`）。

同时把三处仍写旧路径的活引用改成现行描述：`ui-scene-smoke` 头注、`cultivation-gui-probe` 头注、
`2026-10-28-d5-ui-golden` Note 的“当时用独立启动器”句。

## 输掉的方案

- **只靠人工扫。** 本轮就是人工扫出来的；上一轮删 `standalone` 后两个消费者活了两天。门禁的职责正是
  把“重复出现的改名残留”变成机械红灯。
- **新增一个通用的“引用路径存在性”门禁。** 会大量误报运行态/输出目录（`runtime/`、`snapshots/` 产物）；
  `retired-path` 只认“已知退役前缀”，边界更窄、误报更低。
- **把 **tools/standalone.mjs**（已删除） 指向一个空字符串/无现行家。** 失败信息必须可操作；指向现行入口让下一
  个 agent 知道该跑什么。

## 验证（实跑）

```text
node -e "…retired-path.run…"
# OK retired-path ×177 文件 + 352 脚本注释面（活跃面零残留）
```

红证（真破坏）：在 `docs/orient.md` 的反引号里临时写退役的 workspace 路径 →
`FAIL retired-path: docs/orient.md:79 → … 用了退役路径——改指现行家 packages/company-pack/content`；
还原 → 绿。门禁注释已记这条负例。

## 后果与边界

- 活跃面（NOW_FILES + `.agents/skills` + checks/README + run/README + scripts 注释）再写这两类旧家即红；
  归档树仍豁免（记录当时事实）。
- 只覆盖这两类；`snapshots/ui` 等其它退役名未入表，等有复发证据再加（门禁升格判据 = policy P2）。
