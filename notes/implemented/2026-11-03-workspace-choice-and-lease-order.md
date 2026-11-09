# workspace 便利设置真的会写；lease 挪到 workspace 解析之后

状态：implemented（2026-11-03 第六轮 D7 批）
上游 = [第六轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round6.md) ·
材料 = [第七维审计](../../_backlog/_archive/research/repo-hygiene-round6/2026-11-03-seven-dimension-audit-round6.md)（R6-15/R6-16）

## 决定

1. **「最近 workspace」从"文档承诺"变成"真的发生"**：`prepareCompanyRuntime` 解析到 workspace 后，若来源不是
   `saved` 且 lease 到手，就把 canonical workspace 写进 `<DSH_HOME>/company/settings.json`；内容未变不重写
   （避免每次启动 mtime 抖动）。写失败只告警，不影响启动。
2. **lease 从"解析之前"挪到"解析之后"**：没有 workspace 的启动不再在 home 根落 `company-pack.lock`。
   `dataBlocked` 语义不变（lease 失败 = 停写；无 workspace = 停写），但「无 workspace 时零写」这句话现在
   对 lease 文件也成立。

## 输掉的方案

- **把「最近选择」tier 从文档/代码里删掉**（另一种"让文档为真"的做法）：`readSavedWorkspace`、
  类型与测试都在，用户从不同 cwd 启动时确实会用到；删掉等于用一个文档改动换掉一个真实便利。
  且"记住"失败模式有护栏——它只是便利提示，不是权威（解析顺序里排第三，且 picker 仍是最后兜底）。
- **每次启动都写**：内容没变也写（mtime/updatedAt 抖动），而这是 home 面，没有收益。
- **保留 lease 先取**：与 README/profile 的「无 workspace 时零写」相反；更实际的是，一个尚未选
  workspace 的空启动会临时占住 home 的 writer 锁，把真正要写公司数据的会话挡在外面。
- **settings 写在 lease 之外**：两个 writer 同时写 home 便利设置，锁就失去意义。

## 后果

- home 数据面多一件**受允许**的写入：`<DSH_HOME>/company/settings.json`；`host-composition.spec.ts` 的
  home 白名单同步加它（那条用例正是"host 只许写这些"的合同）。
- 无 workspace 的启动：不写 run bundle / 身份 / 登记，**也不取 lease**——`runtime-guard.spec.ts` 的两条新断言钉住。
- 解析顺序不变：`DSH_COMPANY_HOME` → 启动 cwd → settings 最近选择 → DSH picker；文档无需改口（它们本来就写的是这个）。

## 验证

```text
# 1) 记住最近选择（新增断言：文件真的出现且内容 = canonical workspace）
npx vitest run tests/host/run-bundle/runtime-guard.spec.ts   # 4 passed
# 造红：把写入行换成 `void readSavedWorkspace` →
#   × 干净 workspace + 无 manifest：可写，bundleState=missing
#   （读 settings.json 时 ENOENT）；还原 → 4 passed

# 2) 无 workspace 零写（含 lease）
# 用例「DSH_COMPANY_HOME 指向不存在的目录」现在同时断言：
#   company/settings.json 不存在；company-pack.lock 不存在

# 3) 全链
pnpm test        # 139 files / 1112 tests 全绿（host-composition 的 home 白名单同步）
pnpm typecheck   # exit 0
pnpm verify      # ALL PASS（56 门 + 2 无对象）
```

未验：真机双 profile 并发下的 lease 行为（`concurrent-home-smoke` 未重跑；本轮只改了取锁时点，
锁语义与释放路径未动）。`_dist` 安装手册下次 `release --prepare` 再生后才会带上新的卸载清单。
