@echo off
setlocal
cd /d "%~dp0"
title Excel SQL Loader - local

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado. Instala Node 20+ desde https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] Fallo npm install.
    pause
    exit /b 1
  )
)

if not exist .env.local (
  copy /y .env.local.example .env.local >nul
  echo Se creo .env.local a partir de .env.local.example.
  echo Edita SQL_HOST, SQL_DATABASE, SQL_USER y SQL_PASSWORD y guarda el archivo.
  start /wait notepad .env.local
)

echo Iniciando en http://localhost:9002 ...
start "" /b cmd /c "timeout /t 6 >nul & start http://localhost:9002"
call npm run dev
pause
