# 完成定义在代理一侧：真检查，不靠加长指令或规格流程（D15）

状态：已交付（研究结论 = D15。2026-10-09 删掉文献长文，决定与否决保留；原文在 git。）

两次当时的失败（preset 缺必填 config、client 插件静默不挂）的共同点不是「文档没读够」，
而是**失败的发现权在人一侧**。能拦住的是代理自己跑得了的真入口检查，外加「做完 = 该检查通过」。

## 决定

- 完成定义 = 该面最小真检查通过；发现权在代理，不在浏览器里的人。
- 指令文件只负责把检查命令送进上下文。它是 advisory，不是预防手段。
- 不为本类失败引入规格流程（Spec Kit / Kiro / OpenSpec）。它们对准「别做错东西」，
  对不上「做对了但装不上」（schema、模块解析）。无第一方证据表明它们减少这类返工。

## 输掉的方案

- **把 AGENTS.md / CLAUDE.md 写得更细**：无必填字段、无强制力。厂商自己的说法是指令文件
  靠迭代变长，hooks / 检查才保证动作发生。加长会稀释真正要守的规则。
- **规格驱动流程**：不校验 config schema，也不进浏览器模块表。
- **把「agent-ready repo」当既有官方概念**：当时未找到以此命名的第一方材料，不作为可引用概念。

## 后果

preset 改动的完成定义 = `node checks/smoke/preset-smoke.mjs`（真挂载）。client 面的完成定义
= 浏览器零挂载失败。事故复盘 = [postmortem 0001](../postmortem/0001-preset-required-config-mount-failure.md)
与 [0003](../postmortem/0003-duplicate-remote-mount.md)。操作落点 = [dev-loop §1](../../docs/guides/dev-loop.md)。

## 验证

原研究的检索与引用清单在 git 历史里，不在本文件复述。本轮清扫只改 Note 形状；
`pnpm verify` 的结果记在 [2026-10-09 清扫 Note](../implemented/2026-10-09-notes-curation.md)。
