@echo off
set timestamp=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
copy dev.db backups\dev_%timestamp%.db
echo Database backed up to backups\dev_%timestamp%.db
