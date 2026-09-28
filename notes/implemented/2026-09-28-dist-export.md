# dist-export：手动分发的 tarball + 生成式安装手册（2026-09-28）

> 状态：已交付｜触发 = 用户令「学习 ai_dsh_architect/_dist 怎么发布，把精神抄过来」｜合同落点 = [release.md §手动分发](../../docs/release.md)

## 决定

外部仓 `ai_dsh_architect` 的发布面（`docs/distribution.md` + `scripts/export-dist.mjs`）整体照搬精神，
适配到本仓 company-pack：

1. **一条命令完整导出**：`node scripts/export-dist.mjs` → `_dist/dsh-company-pack-<version>.tgz` +
   `_dist/安装手册.md`。无 registry、无克隆、拿到一个 tgz 就能装——这是「仓库即渠道」姿态下的
   第二条手动渠道（第一条 = clone 安装）。
2. **`_dist/` 是导出目的地，不是源**：tgz 全 gitignore（`_dist/*`）；《安装手册》是唯一 tracked
   例外（`!_dist/安装手册.md`）——tracked 生成物先例照 architect 的 scaffold packages.md。
3. **手册脚本生成、永不手改**：版本/日期/条目数在导出时注入，手册与旁边的 tarball 不可能漂；
   步骤镜像 release-smoke 每轮证明的安装路径（装 → dump-config 三标记 → 重启硬刷新 → 干净卸载）。
4. **打包步与冒烟同源**：同一条 `npm pack`（cache 钉 scratch，npm 不碰 `~/.npm`，§11）；导出后
   对产物本体再断言发布边界（cordis.patch.yml / lib/index.js / lib/client.js / presets 在场，
   无 `package/` 外文件）。
5. **导出 ≠ 发布**：不 bump 版本、不跑认证档、不进 registry——真实发布仍等第二个消费者
   （版本纪律原文不动）。

## 机械门禁：`dist-manual`（verify §2g）

tracked 手册的表头版本由 verify 对 pack `package.json` 核对；升版本忘重导即红。
**反证**（2026-09-28）：手改表头版本 0.2.0→9.9.9 → `dist-manual` FAIL（报出版本差与修法）→
还原 → ALL PASS。首次实现期还抓了一次自己：解析列写错（`split('|')[1]`）导致一致态也红——
负例先于反证出现，即改即绿。

## 输掉的方案

- **手册 tracked 与否**曾考虑「全 gitignore、要时再导」：输——手册进 git 是给 fresh agent 与
  协作者的稳定读面（版本门禁兜底防漂），且导出目的地里唯一 tracked 文件让 `_dist/` 在 clone 后
  自带「这里是什么」的说明书。
- **脚本逐文件清理改为整目录清空**：输——`_dist/` 是交付暂存地，别人可能往里放别的东西；
  只清脚本自己的旧产物（tgz 模式 + 手册名）。

## 需验证什么（下次触碰时）

- 升 pack 版本时同 diff 重跑导出，看 `dist-manual` 是否如设计拦截「忘导」。
- 若将来 tarball 内容面变化（新增 skills/ 顶层条目等），同步改 export 脚本的 must 清单与手册正文。
