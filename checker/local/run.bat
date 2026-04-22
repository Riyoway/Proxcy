@echo off
title Proxy Checker Loop

:loop
echo ======================================================
echo Proxy Checker Started at: %date% %time%
echo ======================================================
echo.

call npx tsx index.ts

echo.
echo ======================================================
echo Script execution finished.
echo Waiting 10 seconds before next run...
echo ======================================================
timeout /t 10 /nobreak

goto loop