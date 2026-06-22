@echo off
echo ============================================
echo   SixiD Agent - Build
echo ============================================
echo.

pip install -r requirements.txt
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo Compilando SixiDHost.exe...
python build.py
if errorlevel 1 (
    echo ERRO: Falha na compilacao
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Build concluido!
echo   Executavel: dist\SixiDHost.exe
echo ============================================
echo.
echo Copie dist\SixiDHost.exe para as maquinas
echo cliente e execute como Administrador.
echo.
pause
