# 2026-10-10 · 公司更名 wochen → 梦之队（Dream Team）（D41）

状态：implemented

## 决定

1. **公司名 = 梦之队**（英文 handle Dream Team，ascii slug `dreamteam`）——用户从两轮候选
   （圆桌 / 峰会 / 梦之队 / 五虎将 / 五重奏 / 桃源 / 鱼缸 / 走马灯）中点名。判据：好记、亮堂、
   有形象、口语顺，一听是"全明星班子"。
2. **D14 的显示名序列化机制原样沿用，只换前缀值**：五个 `packages/company-pack/presets/<role>/agent.cordis.yml`
   的 `config.name` = `梦之队 <角色>`；preset id 仍是不动的 kebab（vendor id 正则只限 id 不限显示名）。
   统一前缀的用途 = preset 面板五卡聚族、可搜（用户点名的硬要求）。
3. **品牌字面同步换代**：侧栏 wordmark `DSH Wochen Team` → `DSH 梦之队`
   （`packages/company-pack/src/client/Brand.tsx`，函数名 WocheBrandName → DreamTeamBrandName）；
   `DSH_CLIENT_TITLE` 构建期 env 值同换（[bootstrap](../../docs/guides/bootstrap.md) 两条构建命令、
   client-load-smoke 与 cdp-probe 的断言字面同 diff）。标签页标题 = 前端 dist 构建（vite）烤入；
   应用内主标题 = ui-layout client 包（vendor client 构建）烤入。
4. **指令基线守卫换锚**：`tools/lib/entry-probe.mjs` 的公司手册标题字面 → `# 梦之队 · 公司手册`
   （spec 与 `company-workspace/AGENTS.md` 标题三方同 diff）。
5. **历史证据不改**：snapshots/、deliverables-archive/、journal、authorship 兼容 fixture 里的
   `wochen` 是冻结样本（署名正则本就不匹配公司名字面），保持原样。D14 Note 名字部分由此
   **部分取代**（互链 = 该 Note 顶部指针行）；显示名序列化机制仍以 D14 为 owner。

## 输掉的方案

- **圆桌 Roundtable**（维护者首选）：结构贴（五椅一桌）、不绑数字、亚瑟王 + 商务圆桌双典故；
  用户点名梦之队，落选。
- **峰会 Summit**：字面"高层"最直给，但撞名多、烟火气弱。
- **五虎将 / 五重奏**：都把"五"焊进名字——将来加第六个角色即成包袱（重写显示名系列 + 测试）。
- **桃源 / 鱼缸 / 走马灯**：意境或形象好，但"高层班子"的层级感不足（用户新增判据）。
- **保留 wochen**：德语"周"，无叙事、无形象、无连接——正是本轮要修的病。

## 后果

- **profile 无需刷新**：dev home web profile 以 `link:` 装 pack（`profiles/web/package.json`
  dependencies 指向 `packages/company-pack`）→ preset yml 与重建后的 lib/ 即刻生效；
  D14 时代的 file: 副本刷新步骤不适用现行安装形状。
- **构建期品牌两条命令都要带 env**：前端 dist（标签页标题）与 vendor client（AppFrame 主标题）
  各烤一次；漏一条则两处标题短暂不一致。
- **vendor client 全量重建在本机不稳定**（两次 rolldown `Missing field \`code\``，分别挂在不同的
  并行构建索引；vendor 源码零改动）：失败包的旧产物内容等价，不阻断——本轮品牌所需两包
  （ui-layout client、pack client）均构建成功。抖动根因属上游工具链，留独立轮追。
- **replay-smoke 未跑**（需 r2-motion 真盘 run bundle）：在场板显示名来自现役
  `packages/company-pack/src/lib/presence.ts` 映射而非录制内容，锚字面已同 diff 换；
  单元面由 presence-board 防漂移断言覆盖。

## 验证（实际跑过）

- **红证（prove-it-red）**：五名换齐后把 `cfo` 显示名临时退回 `wochen CFO` →
  `pnpm test tests/presets` 红：`AssertionError: 显示名未共用 梦之队 前缀：梦之队 CEO / … / wochen CFO`
  （1 failed | 12 passed）→ 还原后同套件 **13/13 绿**。前缀门真咬人。
- `pnpm test`：**43 文件 / 441 测试全绿**（显示名断言、presence-board 防漂移、entry-probe
  守卫、品牌字面同步换代）。
- `node checks/smoke/preset-smoke.mjs`：**ALL PASS**——5 preset 经真 web RPC session/create
  全部挂载 + skills 隔离 + client 模块闭包 68 模块缺失 0。
- `node checks/smoke/client-load-smoke.mjs`：**ALL PASS**——真浏览器零挂载失败、零 loader
  错误、品牌槽在场（`DSH 梦之队`）。
- `pnpm verify`：**ALL PASS**——notes-liveness（新 Note 状态行）、ledger-routing（D41 行
  ≤100 字符、家可解析）、doc-budget（index.md 压行腾 D41 位仍 143/143）、presets ×5、
  preset-required-config ×32 行、vendor-clean 全过。
