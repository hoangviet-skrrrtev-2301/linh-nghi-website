@echo off
rem Chay thu website tren Windows: bam dup file nay (hoac chay trong cua so lenh).
rem Tu dong: cai thu vien (lan dau), tao .env, tao database, nap noi dung ban giao, tao tai khoan admin, roi mo website.
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Tai ban LTS tai https://nodejs.org, cai xong chay lai file nay.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Dang cai thu vien, lan dau co the mat vai phut...
  call npm install
  if errorlevel 1 ( echo Cai thu vien that bai. & pause & exit /b 1 )
)

call npm run bootstrap
if errorlevel 1 ( pause & exit /b 1 )

echo.
echo Dang khoi dong website. De tat, bam Ctrl + C trong cua so nay.
start "" http://localhost:3000
call npm run dev
pause
