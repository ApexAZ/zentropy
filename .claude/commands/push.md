echo

run quality
fix all findings until quality passes (no bypasses allowed)

# If failing: Read error, understand root cause, fix code, re-run

condence all old session recaps in CLAUDE.md

# retain timestamps

cut old condensed session recaps from CLAUDE.md and insert into SessionArchive.md
update current session recap in CLAUDE.md
git commit
Fix any issues the git actions quality check finds and commit again if needed
git push
