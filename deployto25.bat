@echo off&setlocal enabledelayedexpansion
for /f "skip=4" %%a in ('dir "%~nx0" /ta') do (set a=!a!,%%a
                                       set b=!a:~1,4!&set c=!a:~6,5!
                                       set d=!c!-!b!)
echo 复制%d%以后的文件
xcopy /d:%d% "F:\Source\dolphindb_manager" "Z:\node_management\SiteManager"
pause