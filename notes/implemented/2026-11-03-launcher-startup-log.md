# 2026-11-03 · dev 启动器输出自动落盘：起窗崩溃不再只剩终端

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D6 R5-33）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-33

## 决定

`tools/company.mjs` 的最终 `dsh --profile company` 从 `spawnSync(stdio:'inherit')` 改为
`spawn` + 逐块 tee：终端照旧显示原文，同时把 **token 脱敏后的**输出追加到
`runtime/web-logs/company-<ISO 时间戳>.log`。启动时打印日志路径。

## 输掉的方案

- **只写 runbook 让人手动 `tee`。** 审计实测：`pnpm company` 崩了只有终端，agent 事后零信息；
  文档已经写了手动 tee，但没有人在崩溃时来得及做。
- **日志写 `$DSH_HOME/logs/`。** token URL 与 home 数据混住，且 `--home` 可能指向用户真 home；
  `runtime/web-logs/` 是 gitignored 的运行残留家，边界更清楚。
- **原样落盘不脱敏。** 启动横幅带 token；日志会被 `grep token` 扫到或误提交。用现成的
  `redactTokenUrls`（纯逻辑）把 `token=` 值替换成 `<redacted>`。
- **只在失败时写。** 失败前的启动过程（profile 初始化、bundle 装载警告）正是要查的现场；
  全量 tee 才能事后还原。

## 验证（实跑）

```text
node /tmp/test-company-tee.mjs   # 真起 dev company（--link --no-open --port 0）
# company(dev): 启动日志 → …/runtime/web-logs/company-2026-11-02T17-40-39-168Z.log（含运行输出，token 已脱敏；勿提交）
# banner true
# log-exists 238 has-token-raw false has-redacted true
# tail: dsh web: http://127.0.0.1:51139/?token=<redacted>
```

进程组已回收（测试 wrapper 用 detached + `kill(-pid)`）。日志文件在 `runtime/`（gitignored）。

## 后果与边界

- 只覆盖 repo dev wrapper；`pnpm dsh web` / vendor CLI 直起仍只有终端。
- 日志会累积；`pnpm prune-runtime` 会按 7 天清理（runbook 已写）。
- tee 是逐块写，极端情况下多字节字符跨块可能被替换字符破坏；token 脱敏不受影响。
