@echo off
title SysID9 - Inicializando Sistema
color 0A
echo.
echo  ========================================
echo       SysID9 - Sistema de Inventario
echo  ========================================
echo.

:: Configuracoes - AJUSTE CONFORME SUA INSTALACAO
set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin
set MYSQL_DATA=C:\Users\Tell\mysql_data
set BACKEND_DIR=C:\Users\Tell\Desktop\Claude system\sysid9\backend
set FRONTEND_DIR=C:\Users\Tell\Desktop\Claude system\sysid9\frontend
set NODE_BIN=C:\Program Files\nodejs

:: -----------------------------------------------
:: 1. MySQL
:: -----------------------------------------------
echo [1/3] Verificando MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if %ERRORLEVEL%==0 (
    echo       MySQL ja esta rodando.
) else (
    echo       Iniciando MySQL...
    start "SysID9-MySQL" /MIN "%MYSQL_BIN%\mysqld.exe" --datadir="%MYSQL_DATA%" --port=3306 --console
    timeout /T 4 /NOBREAK >NUL
    echo       MySQL iniciado.
)

:: -----------------------------------------------
:: 2. Backend (FastAPI)
:: -----------------------------------------------
echo.
echo [2/3] Verificando Backend...
netstat -ano 2>NUL | find ":8000" | find "LISTENING" >NUL
if %ERRORLEVEL%==0 (
    echo       Backend ja esta rodando na porta 8000.
) else (
    echo       Iniciando Backend...
    start "SysID9-Backend" /MIN cmd /C "cd /D "%BACKEND_DIR%" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    timeout /T 6 /NOBREAK >NUL
    echo       Backend iniciado.
)

:: -----------------------------------------------
:: 3. Frontend (React/Vite)
:: -----------------------------------------------
echo.
echo [3/3] Verificando Frontend...
netstat -ano 2>NUL | find ":5173" | find "LISTENING" >NUL
if %ERRORLEVEL%==0 (
    echo       Frontend ja esta rodando na porta 5173.
) else (
    echo       Iniciando Frontend...
    start "SysID9-Frontend" /MIN cmd /C "cd /D "%FRONTEND_DIR%" && "%NODE_BIN%\node.exe" node_modules/vite/bin/vite.js"
    timeout /T 4 /NOBREAK >NUL
    echo       Frontend iniciado.
)

:: -----------------------------------------------
:: Resultado
:: -----------------------------------------------
echo.
echo  ========================================
echo       Sistema SysID9 iniciado!
echo  ========================================
echo.
echo  Dashboard:  http://localhost:5173
echo  API Docs:   http://localhost:8000/docs
echo  Login:      admin / admin123
echo.
echo  Acesso remoto via rede:
for /F "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    for /F "tokens=1" %%b in ("%%a") do (
        echo    http://%%b:5173
    )
)
echo.

:: Abrir navegador automaticamente
start http://localhost:5173
echo  Navegador aberto. Pode fechar esta janela.
echo.
timeout /T 5 >NUL
