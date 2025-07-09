echo

1. run quality
2. fix all findings until quality passes (no bypasses allowed)

# If failing: Read error, understand root cause, fix code, re-run

3. compact all old session recaps in CLAUDE.md
4. cut old session recap from CLAUDE.md and insert into SessionArchive.md
5. git commit
6. update current session recap in CLAUDE.md
7. insert current session recap into SessionArchive.md
8. git commit
9. Fix any issues the git actions quality check finds and commit again if needed
10. git push
