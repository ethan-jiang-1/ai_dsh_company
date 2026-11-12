# Company delegation · team spawn (Team Lead only)

- Only a **Team Lead** can `spawn_teammate`. The root session is the Lead; named children / workflow branches are not; teammates see the tool but only the Lead can execute it.
- Members **inherit the Lead's composition**; there is no per-member preset. Give each member a **role pack**: role name, brief path, CHARTER, role skill, KB, output path, boundary; the role is softly covered by the brief/files, not impersonated by the member name.
- Context defaults to `fresh` (no Lead history); to bring the Lead's **completed rounds**, explicitly set `context: 'fork'`. The current round's brief is not in the fork seed — still pass it by path/body.
- After `spawn_teammate`, record the target; write owner, `blockedBy`, `writeScopes` on the task board; `ready` does not auto-dispatch — the Lead uses `send_message`/dispatch.
- Members may not impersonate a role; a role's conclusion can only come from that role's named child.
