@echo off
title SysID9 - Parando Sistema
color 0C
echo.
echo  ========================================
echo       SysID9 - Parando Sistema
echo  ========================================
echo.

echo [1/3] Parando Frontend...
taskkill /F /IM node.exe >NUL 2>&1
echo       Frontend parado.

echo.
echo [2/3] Parando Backend...
taskkill /F /IM python.exe >NUL 2>&1
echo       Backend parado.

echo.
echo [3/3] Parando MySQL...
taskkill /F /IM mysqld.exe >NUL 2>&1
echo       MySQL parado.

echo.
echo  ========================================
echo       Sistema SysID9 parado!
echo  ========================================
echo.
pause
