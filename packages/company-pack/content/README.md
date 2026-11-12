# Plugin content (read-only)

This directory is `dsh-company-pack`'s **read-only product content**; it updates with the package version after install, and is not the user's run bundle:

- `AGENTS.md`: company handbook. The host injects it as a system-prompt section when an agent is created; **do not copy it to the workspace**.
- `templates/`: shared writing templates (templates are partitioned by product type: SyRS/IRS/allocation live in `product-types/<id>/templates/`). Roles read here by default; to change, copy to
  `<workspace>/.dsh-company/overrides/templates/`. **This is prompt-level override**: sessions are instructed to prefer the override
  (declared in the host-injected preamble), not filesystem enforcement.
- `charters/<role>.md`: default role charters. On first start, only missing
  `<workspace>/.dsh-company/kb/<role>/CHARTER.md` files are generated; the user edits the instance in the run bundle.
- `generic/`: generic layer (hard rules present at the start + collaboration detail read on demand).
- `product-types/<id>/`: product-type layer (requirements chain, document map, terms, templates, checker rules).
- `company/`: company layer (single home of policy lines, etc.); seeded into the run bundle's `kb/`.
- `state/`: default state instances for company/org/owners/ledger; first start only fills missing files.
- `wiki-template/`: starting skeleton for a project's reference wiki (protocol `AGENTS.md`, `index.md`, `log.md`, one example page). **Not loaded by roles** and not in `manifest.json`: it is copied out (`cp -R`) and then lives wherever the project's strategy `wiki` pointer says. Copying is the only way it enters a run; the pack never writes it.

The run bundle lives in the user's workspace `.dsh-company/`, initialized by the host; plugin code (`src/host`, `src/client`)
and preset/persona/skills live in other package directories. **Do not write runtime data in this directory.**
