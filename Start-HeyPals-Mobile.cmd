@echo off
cd /d "%~dp0"
set PORT=8798
node serve.cjs --lan
pause
