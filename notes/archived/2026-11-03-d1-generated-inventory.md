# 2026-11-03 · D1：checks 库存生成化 + 32/32 文档“什么时候读”

状态：implemented（2026-11-03；A- D1 第一批）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 评分 GAP：D1 手工库存（`checks/README.md` 80 行逐脚本枚举，`script-index` 反向强制）；9/32 文档无“什么时候读”。

## 决定

1. **公开入口库存改为生成物**：`tools/lib/checks-index.mjs` 扫描 smoke/audit/probes/tools 顶层并渲染
   `checks/INDEX.generated.md`；`tools/checks-index.mjs --write` 更新；`script-index` 门禁校验生成物与目录
   逐字一致，并检查 README 已链接它。`checks/README.md` 只留快速选择 + 清单指针（80→56 行）。
2. **补齐 32/32 文档“什么时候读”**：9 份缺失文档各加一行（零头寸的 3 份合并进现有 `>` 首行，不增长行数）。
3. **README 行预算随内容下调** 85→59（+5% 棘轮）。

## 输掉的方案

- **继续手维护 README 清单。** 正是 D28 说的“第二清单必漂”；门禁只能抓到“漏”，抓不到标签/分组漂移。
- **删掉库存、只留目录指针。** `script-index` 的原始目的（每个公开入口可发现）会丢；生成物两者兼得。
- **把整个 README 生成化。** 快速选择/触发复查是人的判断，不是目录投影；只生成库存这一段。

## 验证（实跑）

```text
node tools/checks-index.mjs --write        # 生成 119 行；107 个公开入口
node checks/gates/script-index.mjs 内嵌跑    # OK script-index ×107（生成库存与目录一致；README 已链接）
# 红：临时建 checks/smoke/zz-index-probe.mjs → FAIL「生成物与目录不一致（108 个公开入口）」；
#     --write 后绿；删除探针 → 再红；--write → 绿。
pnpm verify                                # ALL PASS
pnpm test                                  # 131 spec / 1071 例（1068 pass / 3 skip）
```

红证（doc-budget）：`checks/README.md` 上限临时 59→50 → `FAIL 56 行超上限 50`；还原 → PASS。

## 后果与边界

- `checks/INDEX.generated.md` 是生成物，**勿手改**；新增/移动公开入口后跑 `--write`，否则 `pnpm verify` 红。
- `tools/checks-index.mjs` 自身也是公开入口，会出现在生成物里。
- 零头寸预算（AGENTS 84/84、decisions 62/62、release-runbook 75/75、cdp-probe 68/68、environments 48/48）
  本轮未动：这是“顶格=饱和”的棘轮信号，不是本轮 D1 的 GAP；若要给增长余量，另开 Note 论证。
- dev-loop 空壳节保留为旧锚点重定向；live 引用已不再把它们当“唯一家”（§13/debugging 已改指）。
