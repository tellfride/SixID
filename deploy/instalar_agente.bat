@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

title SixiD Agent - Instalador Rapido (v1.4.0)
color 0B

echo ============================================================
echo   SixiD Agent - Instalador Rapido (v1.4.0)
echo ============================================================
echo.
echo   Este script instala o agente ja compilado.
echo   Para compilar primeiro, use: construir_e_instalar.bat
echo.

:: Verificar admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Execute como Administrador!
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "AGENT_EXE=SysID9Host.exe"
set "INSTALL_DIR=%PROGRAMFILES%\SysID9"
set "CONFIG_DIR=%PROGRAMDATA%\SysID9"

:: Verificar se o .exe existe ao lado deste .bat
if not exist "%SCRIPT_DIR%%AGENT_EXE%" (
    echo [ERRO] %AGENT_EXE% nao encontrado!
    echo        Coloque o %AGENT_EXE% na mesma pasta deste .bat
    echo        ou execute construir_e_instalar.bat primeiro.
    echo.
    pause
    exit /b 1
)
echo [OK] %AGENT_EXE% encontrado

:: Parar agente
echo.
echo [1/3] Parando agente atual...
sc stop SysID9Agent >nul 2>&1
schtasks /End /TN SysID9Agent >nul 2>&1
taskkill /F /IM %AGENT_EXE% >nul 2>&1
taskkill /F /IM mshta.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo [OK] Agente parado

:: Instalar
echo.
echo [2/3] Instalando...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

if exist "%INSTALL_DIR%\%AGENT_EXE%" (
    copy /Y "%INSTALL_DIR%\%AGENT_EXE%" "%INSTALL_DIR%\%AGENT_EXE%.bak" >nul 2>&1
)

copy /Y "%SCRIPT_DIR%%AGENT_EXE%" "%INSTALL_DIR%\%AGENT_EXE%" >nul
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao copiar! Tente novamente.
    pause
    exit /b 1
)
echo [OK] Agente instalado em %INSTALL_DIR%

:: Iniciar
echo.
echo [3/3] Iniciando agente...

sc start SysID9Agent >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Agente iniciado como servico
    goto :done
)

schtasks /Delete /TN SysID9StartNow /F >nul 2>&1
schtasks /Create /TN SysID9StartNow /TR "\"%INSTALL_DIR%\%AGENT_EXE%\" --run" /SC ONCE /ST 00:00 /RU SYSTEM /RL HIGHEST /F >nul 2>&1
schtasks /Run /TN SysID9StartNow >nul 2>&1
timeout /t 3 /nobreak >nul
schtasks /Delete /TN SysID9StartNow /F >nul 2>&1

tasklist /FI "IMAGENAME eq %AGENT_EXE%" 2>nul | find /i "%AGENT_EXE%" >nul
if %errorlevel% equ 0 (
    echo [OK] Agente rodando
) else (
    echo [AVISO] Execute manualmente: "%INSTALL_DIR%\%AGENT_EXE%" --run
)

:done
echo.
echo ============================================================
echo   INSTALACAO CONCLUIDA! (v1.4.0)
echo ============================================================
echo.
pause
exit /b 0
