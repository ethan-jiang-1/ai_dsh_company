# 交付物三态（谁写哪儿、什么算成品）

> 层：通用 · 加载：按需（T2）

## 交付物三态（谁写哪儿、什么算成品）

一个交付物 = 一个目录 `.dsh-company/deliverables/<kickoff 日期>-<slug>/`（**A1 命名：CEO 开局用注入的真日期建目录**；
`<slug>` 短横线小写英文，角色名固定写 `ceo` / `cmo` / `vp-eng` / `vp-sales` / `coo` / `cfo`）。
目录里另放 **meta.md**（动议户口——开局 CEO 写，收敛维护者回填；形状机器可查）。

| 态 | 位置 | 谁写 | 什么时候算数 |
|---|---|---|---|
| **成品** | `.dsh-company/deliverables/<日期>-<slug>/final.md` | **只有 CEO** | **必须来自一次 `present` 声明**（先 present、后把 meta「结果」改终态词；程序与反例 = chairing skill；判据映射 = 本手册「交付物三态」） |
| **过程稿** | `.dsh-company/deliverables/<日期>-<slug>/drafts/<角色>.md` | 各职能自己 | 自己产出、可被引用；它不是对外承诺 |
| **排练/探针产物** | **不进** `.dsh-company/deliverables/` | —— | 由操作员在会话外归档或删除 |

- 各职能**一律写 `drafts/`**，不要写 `final.md`——那是对外承诺，归 CEO；**slug 唯一性**：剥日期前缀查重（`.dsh-company/deliverables/` 与 `.dsh-company/deliverables-archive/` 两处都看），重跑同一件事换 slug（推荐 `-v2`）；平铺旧形状已废止（归档家只读）。
- **产品定义的文件名、编号与校验**：见本产品类型包 `product-types/<id>/document-map.md`（编号合同与校验命令的唯一家）。
- **成品首屏说人话**：署名行后第一段 = 「一分钟摘要」——结论（≤3 条业务语言）/ 下一步（谁·何时）/ 要用户拍板的事；present 的 description 写同款。
- `drafts/` 下的主题工作子目录（`sprint/`、`sources/` 等）= 过程物料，合法；`sources/` 专属 = HITL 取证落盘点。
- **收口核对**：操作员在会话外核对——每个 final 都能回溯到一次 present、被声明的文件仍在；公司角色不在工作区内跑审计脚本。
