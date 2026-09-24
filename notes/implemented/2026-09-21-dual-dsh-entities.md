# 2026-09-21 · 三个 DSH 实体立为一等事实（双 DSH 区分 + 环境级拦截）

## 决定

1. **AGENTS.md "DSH 源码在哪、怎么读"改为三实体表**：① `vendor/dsh`（钉 tag，唯一权威，
   验证一律 `pnpm dsh`）；② 日用全局安装（npm 全局，跑日常会话与改本 repo 的 coding
   会话的就是它，版本随全局升级漂移，不作机制依据）；③ 外部研究树
   `/Users/bowhead/deepseek-harness/`（`_digested`/FAQ 宿主，只读）。表内明写
   "当前恰同为 0.1.5-rc.2 是巧合不是保证"，并点名"改本 repo 的会话本身可能跑在 ② 上"。
2. **`dev/env.sh` 增加裸 `dsh` 拦截函数**（fail-loud：提示用 `pnpm dsh`；bypass =
   `command dsh`）。理由：`DSH_HOME` 只护数据层护不住代码层——source 过 env.sh 后
   裸 `dsh` 也落在 dev home，但跑的仍是全局代码，版本漂移后验证会静默失真。
   沿用双 home 教义"靠环境兜底不靠提醒"。
3. guides/dev-loop §6 扩为"双 home 与双 DSH"（补第 4 条：代码层规则）；index 地图行同步、
   外部材料登记表补研究树 HEAD 事实（rc.2 后 149 提交，`_digested` 审计基线仍 rc.2，
   引外部笔记以基线对齐）。

## 输掉的方案

- 只在文档写"请勿裸调 dsh"——输给环境级拦截：软提醒挡不住版本漂移下的静默误用，
  且 coding agent 不会自己想起这个区别。
- 把全局安装替换/链接到 vendor——日用环境不归本 repo 管辖，破坏日用 DSH 独立性
  （双 home 教义的同构延伸：日用的一切原样不动）。

## 验证（实际跑过）

- 三实体版本核实：全局 `@deepseek-ai/dsh@0.1.5-rc.2`（npm 全局路径 +
  `which dsh` → `~/.nvm/.../bin/dsh`）；`vendor/dsh/package.json` = 0.1.5-rc.2
  （tag `dsh-v0.1.5-rc.2` = fb2c4b9e）；研究树 `git describe` =
  `dsh-v0.1.5-rc.2-149-gc4442c6928`。
- `pnpm verify` → ALL PASS。
- 拦截函数实测（bash）：`source dev/env.sh && dsh --version` → 打印提示并 exit 1；
  `command dsh --version` → 正常放行，输出 `0.1.5-rc.2`。

## 未验证 / 已知风险

- zsh 下的拦截表现未实测（函数定义为 POSIX 兼容写法，预期同样生效）。
