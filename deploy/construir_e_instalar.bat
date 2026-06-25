@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

title SixiD Agent - Construir e Instalar (v1.4.0)
color 0B

echo ============================================================
echo   SixiD Agent - Build e Deploy Automatizado (v1.4.0)
echo   Correcao: Bloqueio de tela com CreateProcessAsUser
echo ============================================================
echo.

:: ---------------------------------------------------------------
:: Verificar se esta rodando como administrador
:: ---------------------------------------------------------------
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Execute este script como Administrador!
    echo        Clique com botao direito ^> Executar como administrador
    echo.
    pause
    exit /b 1
)
echo [OK] Executando como Administrador

:: ---------------------------------------------------------------
:: Detectar Python correto (prioriza Python oficial, ignora Espressif)
:: ---------------------------------------------------------------
set "PYTHON="

:: Tentar Python 3.13 do usuario
if exist "C:\Users\tell\AppData\Local\Programs\Python\Python313\python.exe" (
    set "PYTHON=C:\Users\tell\AppData\Local\Programs\Python\Python313\python.exe"
    goto :python_found
)
:: Tentar py launcher (escolhe o mais recente automaticamente)
py -3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON=py -3"
    goto :python_found
)
:: Tentar caminhos comuns
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%PROGRAMFILES%\Python313\python.exe"
    "%PROGRAMFILES%\Python312\python.exe"
    "%PROGRAMFILES%\Python311\python.exe"
) do (
    if exist %%P (
        set "PYTHON=%%~P"
        goto :python_found
    )
)

echo [ERRO] Python nao encontrado!
echo        Instale o Python 3.10+: https://www.python.org/downloads/
pause
exit /b 1

:python_found
for /f "tokens=*" %%v in ('%PYTHON% --version 2^>^&1') do echo [OK] %%v
echo        Caminho: %PYTHON%

:: ---------------------------------------------------------------
:: Definir caminhos
:: ---------------------------------------------------------------
set "SCRIPT_DIR=%~dp0"
set "SRC_DIR=%SCRIPT_DIR%"
set "BUILD_DIR=%TEMP%\sysid9_build"
set "INSTALL_DIR=%PROGRAMFILES%\SysID9"
set "CONFIG_DIR=%PROGRAMDATA%\SysID9"
set "AGENT_EXE=SysID9Host.exe"

echo.
echo [INFO] Diretorio fonte: %SRC_DIR%
echo [INFO] Diretorio build: %BUILD_DIR%
echo [INFO] Diretorio instalacao: %INSTALL_DIR%
echo.

:: ---------------------------------------------------------------
:: Verificar se os fontes existem
:: ---------------------------------------------------------------
if not exist "%SRC_DIR%sysid9_agent\actions\screen_lock.py" (
    echo [ERRO] Pasta sysid9_agent nao encontrada!
    echo        Certifique-se de que a pasta sysid9_agent esta ao lado deste .bat
    pause
    exit /b 1
)
echo [OK] Fontes encontrados

:: ---------------------------------------------------------------
:: Instalar dependencias Python
:: ---------------------------------------------------------------
echo.
echo [1/6] Instalando dependencias Python...
%PYTHON% -m pip install --upgrade pip >nul 2>&1
%PYTHON% -m pip install pyinstaller pywin32 wmi psutil requests websocket-client apscheduler 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Algumas dependencias podem nao ter sido instaladas.
    echo         Tentando continuar...
) else (
    echo [OK] Dependencias instaladas
)

:: Verificar se PyInstaller esta acessivel
%PYTHON% -m PyInstaller --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] PyInstaller nao foi encontrado apos instalacao!
    echo        Tente manualmente: %PYTHON% -m pip install pyinstaller
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('%PYTHON% -m PyInstaller --version 2^>^&1') do (
    echo [OK] PyInstaller %%v disponivel
)

:: ---------------------------------------------------------------
:: Parar agente atual
:: ---------------------------------------------------------------
echo.
echo [2/6] Parando agente atual...
sc stop SysID9Agent >nul 2>&1
schtasks /End /TN SysID9Agent >nul 2>&1
taskkill /F /IM %AGENT_EXE% >nul 2>&1
taskkill /F /IM mshta.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo [OK] Agente parado

:: ---------------------------------------------------------------
:: Preparar diretorio de build
:: ---------------------------------------------------------------
echo.
echo [3/6] Preparando build...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"
copy "%SRC_DIR%*.py" "%BUILD_DIR%\" >nul 2>&1
xcopy "%SRC_DIR%sysid9_agent" "%BUILD_DIR%\sysid9_agent\" /E /I /Q /Y >nul
echo [OK] Fontes copiados para build

:: ---------------------------------------------------------------
:: Construir com PyInstaller
:: ---------------------------------------------------------------
echo.
echo [4/6] Construindo executavel com PyInstaller...
echo        Isso pode levar 1-3 minutos...
echo.
pushd "%BUILD_DIR%"

%PYTHON% -m PyInstaller ^
    installer.py ^
    --onefile ^
    --name=%AGENT_EXE% ^
    --hidden-import=win32timezone ^
    --hidden-import=win32serviceutil ^
    --hidden-import=win32service ^
    --hidden-import=win32event ^
    --hidden-import=servicemanager ^
    --hidden-import=wmi ^
    --hidden-import=psutil ^
    --hidden-import=sysid9_agent ^
    --hidden-import=sysid9_agent.main ^
    --hidden-import=sysid9_agent.config ^
    --hidden-import=sysid9_agent.api_client ^
    --hidden-import=sysid9_agent.scheduler ^
    --hidden-import=sysid9_agent.service ^
    --hidden-import=sysid9_agent.change_detector ^
    --hidden-import=sysid9_agent.actions ^
    --hidden-import=sysid9_agent.actions.command_executor ^
    --hidden-import=sysid9_agent.actions.screen_lock ^
    --hidden-import=sysid9_agent.actions.vnc_manager ^
    --hidden-import=sysid9_agent.actions.input_blocker ^
    --hidden-import=sysid9_agent.actions.usb_blocker ^
    --hidden-import=sysid9_agent.collectors ^
    --noconsole ^
    --uac-admin ^
    --icon=NONE

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Build falhou! Verifique os erros acima.
    popd
    pause
    exit /b 1
)
popd

if not exist "%BUILD_DIR%\dist\%AGENT_EXE%" (
    echo [ERRO] Executavel nao foi gerado!
    pause
    exit /b 1
)

for %%A in ("%BUILD_DIR%\dist\%AGENT_EXE%") do (
    echo [OK] Executavel gerado: %%~nxA ^(%%~zA bytes^)
)

:: ---------------------------------------------------------------
:: Instalar novo executavel
:: ---------------------------------------------------------------
echo.
echo [5/6] Instalando novo agente...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Backup do anterior
if exist "%INSTALL_DIR%\%AGENT_EXE%" (
    copy /Y "%INSTALL_DIR%\%AGENT_EXE%" "%INSTALL_DIR%\%AGENT_EXE%.bak" >nul 2>&1
    echo [OK] Backup do agente anterior criado
)

copy /Y "%BUILD_DIR%\dist\%AGENT_EXE%" "%INSTALL_DIR%\%AGENT_EXE%" >nul
if %errorlevel% neq 0 (
    echo [ERRO] Nao foi possivel copiar o executavel!
    echo        O agente pode estar em uso. Tente novamente.
    pause
    exit /b 1
)
echo [OK] Novo agente instalado em %INSTALL_DIR%

:: Copiar executavel tambem para a pasta deploy
copy /Y "%BUILD_DIR%\dist\%AGENT_EXE%" "%SCRIPT_DIR%\%AGENT_EXE%" >nul 2>&1
echo [OK] Copia do executavel salva em %SCRIPT_DIR%

:: ---------------------------------------------------------------
:: Reiniciar agente
:: ---------------------------------------------------------------
echo.
echo [6/6] Iniciando agente atualizado...

:: Tentar via servico Windows
sc start SysID9Agent >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Agente iniciado como servico Windows
    goto :done
)

:: Fallback: schtasks
schtasks /Delete /TN SysID9StartNow /F >nul 2>&1
schtasks /Create /TN SysID9StartNow /TR "\"%INSTALL_DIR%\%AGENT_EXE%\" --run" /SC ONCE /ST 00:00 /RU SYSTEM /RL HIGHEST /F >nul 2>&1
schtasks /Run /TN SysID9StartNow >nul 2>&1
timeout /t 3 /nobreak >nul
schtasks /Delete /TN SysID9StartNow /F >nul 2>&1

:: Verificar se esta rodando
tasklist /FI "IMAGENAME eq %AGENT_EXE%" 2>nul | find /i "%AGENT_EXE%" >nul
if %errorlevel% equ 0 (
    echo [OK] Agente rodando em segundo plano
) else (
    echo [AVISO] Agente sera iniciado no proximo boot.
    echo         Ou execute: "%INSTALL_DIR%\%AGENT_EXE%" --run
)

:done
echo.
echo ============================================================
echo   ATUALIZACAO CONCLUIDA!
echo ============================================================
echo.
echo   Versao: 1.4.0
echo   Correcoes aplicadas:
echo     - Bloqueio de tela agora usa CreateProcessAsUser
echo       para exibir a janela na sessao do usuario
echo     - schtasks agora usa /RU usuario /IT como fallback
echo     - Verificacao real se mshta.exe esta rodando
echo     - Agente reporta falha quando lock nao funciona
echo.
echo   O executavel tambem foi salvo em:
echo   %SCRIPT_DIR%%AGENT_EXE%
echo   (Use-o para instalar em outras maquinas)
echo.

:: Limpeza
rmdir /s /q "%BUILD_DIR%" >nul 2>&1

pause
exit /b 0
