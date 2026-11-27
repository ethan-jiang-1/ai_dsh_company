# dsh-company-pack

Six-role virtual company for DSH — CEO / VP-Eng / VP-Sales / COO / CFO / CMO presets, worker and
quality-loop support presets, company handbook, and the company Web tabs.

This README ships inside the npm tarball. Repository-only documentation, tests, probes and release
tooling are intentionally not part of the package.

## Install

In DSH, open **Plugins → Add plugin** and enter `dsh-company-pack` (registry) or the absolute path of
the tarball (manual distribution). The same operation from the CLI is:

```sh
dsh plugin add dsh-company-pack
```

The DSH plugin installer uses pnpm. DSH Desktop bundles pnpm; for the npm-installed CLI, pnpm must be
on `PATH`. When it is missing, DSH prints the remediation instead of a silent failure:

```text
dsh: pnpm was not found; install pnpm and make it available on PATH.
```

Restart the profile you installed into, then start with the same entry point.

## Runtime contract

- DSH window: `engines.dsh` (`>=0.2.1-rc.2 <0.2.2`). A version outside the window is rejected by
  the installer.
- Client surface: **web** only. The client factory requires the web platform baseline modules
  `react`, `react/jsx-runtime` and `@deepseek-ai/dsh-client-ui-primitives`; the host module table
  provides the React baseline, and `dsh.client.inject` declares the package row the factory needs.
  The other `dsh.client.inject` entries are **composition/ordering edges**: their code is inlined in
  this bundle, but the host still needs those package rows to arrive before the company client
  activates. `inject` is therefore not a one-to-one mirror of the factory's `require` calls.
- Company state lives in `<workspace>/.dsh-company/`, never inside the installed package directory.
  Upgrading the package replaces package bytes; user state is only filled in where missing.

## Verify

- `dsh --profile company --dump-config` lists the `company-client` and `company-session-search` rows.
- Starting the profile produces no `did not activate` / `skipping profile bundle` diagnostics.
- The Plugins page shows the bundle and all eleven preset rows without a broken marker.

## Upgrade / remove

- Upgrade by installing a newer version over the old one, then restart the profile and hard-refresh
  the browser. There is no separate Update button for external plugins.
- Remove the plugin from the same profile. Company state under `<workspace>/.dsh-company/` is user
  data and is not removed by the package.
- Roll back by installing the previous tarball version.

## Links

- Installation, checksum, backup and rollback manual:
  <https://github.com/ethan-jiang-1/ai_dsh_company/blob/master/_dist/安装手册.md>
- Source repository: <https://github.com/ethan-jiang-1/ai_dsh_company>
- License: MIT (`LICENSE` is included in the package).
