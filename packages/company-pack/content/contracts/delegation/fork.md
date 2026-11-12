# Company delegation · fork (`subagent_fork`)

- `subagent_fork` clones this session to the prefix **up to the last `turn/end`**; **the current turn is not in the seed**.
- Use for "continue/review this completed conversation"; use spawn for a new independent task, not fork as a shortcut.
- Fork inherits your current preset composition and **cannot pin another preset**; for an independent role, still use named spawn.
- The seed is captured once at creation; later parent turns do not automatically enter the child. Put new instructions in the prompt, or continue with `send_to_subagent`.
- The child still captures a fresh tool surface/permissions from its composition; fork carrying history does not carry permissions.
