---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-207：retired-path 的退役前缀表没有登记这一波 77 个 renames，脚本注释里的旧家仍全绿

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：修复就绪｜修复：2026-11-17（进行中）｜审查：—
>
> **关联**：[C12 归属波次探索卡](../issues/2026-11-17-ownership-wave-exploratory.md)（C12-1 / N1）。
> **留痕**：批次 Note `notes/implemented/2026-11-17-c12-ownership-wave-repairs.md`（本批共用）。

## 症状

`checks/gates/retired-path.mjs` 的头注把「退役前缀清单唯一家」写成本文件的
`RETIRED_PATH_PREFIXES`，并明确说脚本注释也在扫描面（「checks|probes|tools|tests 的脚本**注释行**
也运载指针」）。但 2026-11-16/17 归属波次的退役家一个都没有进表：

- 目录：tools/observe/（7 件已迁 `probes/analyze/`）
- 文件：tools/repo/refactor-drift.mjs、checks/lib/delegation-model.mjs、
  checks/lib/candidate-scan.mjs、checks/gates/lib/pin.mjs、checks/lanes/lib/mutation.mjs、
  tests/support/coverage-baseline.json、tools/lib/coverage-baseline.json 等

于是脚本注释里写旧家不会红：`retired-path` 只匹配表里的 4 个前缀；`bare-path` 只扫 Markdown
反引号（不扫脚本注释）；`command-refs`/`md-links` 也不扫脚本注释。

## 复现

```sh
python3 - <<'PY'
from pathlib import Path
p = Path('tools/lib/core/asset-lanes.mjs')
p.write_text(p.read_text() + '\n// probe: 旧家 tools/observe/ask-latency.mjs 已迁 probes/analyze\n')
PY
node checks/run-gates.mjs
git checkout -- tools/lib/core/asset-lanes.mjs
```

实测 `exit=0`，输出 `PASS retired-path ×294 文件 + 555 脚本注释面（退役目录前缀扫描：活跃面零残留）`，
而注释里的旧家正是本波刚退役的位置。还原后 `git status` 干净。

## 根因与证据

- 根因：`RETIRED_PATH_PREFIXES` 是手写数组；[retired-path.mjs](../../checks/gates/retired-path.mjs)
  没有从搬移提交/git 历史生成，也没有「本波 renames 必须登记」的检查。归属波次的 Note
  （[lib-ownership-split](../../notes/implemented/2026-11-17-lib-ownership-split.md) /
  [surface-ownership-cleanup](../../notes/implemented/2026-11-17-surface-ownership-cleanup.md)）
  没有提退役前缀。
- 证据：上负控实跑；`RETIRED_PATH_PREFIXES` 原文只有 _backlog/_done、_backlog/plans/、
  packages/company-pack/workspace、tools/standalone.mjs。
- 影响：agent 会照着脚本注释找工具/证据；旧家不存在，但门禁说「活跃面零残留」。这与 BUG-187/194/195
  同族，只是这次是**新退役目录**，不是 spec 后缀。

## 失败类与同类排查

**失败类 = 文档指针 / 退役登记未随搬移更新**（与 BUG-187..190 同族）。

同类：

- `bare-path` 仍能抓活跃 **Markdown** 里的旧家（路径不存在）；本卡的盲区是脚本注释。
- `live-pointer` 只抓 `tests/*.spec.ts`，不抓 tools/ 下/checks/ 下 路径；
  它自己的面缺口 = [BUG-205](BUG-205-live-pointer-faces-miss-moved-libs.md)。
- tools/observe 在 `_backlog/research` 的历史材料里仍有纯文本引用（研究材料，非活指针）。

## 已修判定

修成什么算修好：

1. 退役面不再只靠手写表：`retired-path` 从最近 300 个提交的 `git log --diff-filter=RD -M --name-status` 自动推导旧路径，扫描脚本注释面；当前波次的旧 observe 目录等手工表条目仍登记，且 `to` 必须是现行路径。
2. 手工表自检：`from` 不得仍存在；`_backlog/research`、归档树、历史引文（`FAIL …` 行）不判。
3. 最小负例（同一条命令）：`pnpm verify`——向 `tools/lib/core/asset-lanes.mjs` 注释注入旧 observe 目录下的探针路径 → 红；删除 → 绿。
