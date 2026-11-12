# .dsh-company · run bundle

This directory belongs to the current company/project, **not plugin content**. The plugin's personas, skills, company handbook, templates, and default charters
live in the installed package; here there is only runtime state and artifacts:

- `kb/`: company fact directory (read `kb/AGENTS.md` first for the map and missing-file discipline)
- `deliverables/`, `deliverables-archive/`: drafts and finals
- `cultivation/records/`: cultivation records
- `bundle.json`: run bundle identity
- `logs/`, `exports/`: upgrade logs and governance read-only exports
- `overrides/`: optional template/charter overrides (default content is in the plugin package)

The authority for the method layer and presented audit ledger is `DSH_HOME/company/`, not here; `exports/` is only a derived snapshot.
