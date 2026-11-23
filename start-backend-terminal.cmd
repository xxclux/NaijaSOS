@echo off
cd /d J:\NEMA
title NaijaSOS Backend - Live Logs
echo NaijaSOS backend running on http://localhost:4000
echo Press Ctrl+C to stop.
echo.
node server/index.js
echo.
echo Backend stopped.
pause
