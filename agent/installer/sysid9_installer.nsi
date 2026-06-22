; SysID9 Agent Installer - NSIS Script
!include "MUI2.nsh"

Name "SysID9 Agent"
OutFile "SysID9Host.exe"
InstallDir "$PROGRAMFILES\SysID9"
RequestExecutionLevel admin

Var SERVER_URL
Var AGENT_TOKEN

; UI
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY

Page custom ServerConfigPage ServerConfigPageLeave

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "PortugueseBR"

; Server config page
Function ServerConfigPage
  !insertmacro MUI_HEADER_TEXT "Configuração do Servidor" "Informe os dados de conexão"
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateLabel} 0 0 100% 12u "URL do Servidor:"
  Pop $0
  ${NSD_CreateText} 0 14u 100% 12u "http://servidor:8000"
  Pop $SERVER_URL

  ${NSD_CreateLabel} 0 36u 100% 12u "Token de Registro:"
  Pop $0
  ${NSD_CreateText} 0 50u 100% 12u ""
  Pop $AGENT_TOKEN

  nsDialogs::Show
FunctionEnd

Function ServerConfigPageLeave
  ${NSD_GetText} $SERVER_URL $SERVER_URL
  ${NSD_GetText} $AGENT_TOKEN $AGENT_TOKEN
FunctionEnd

Section "Install"
  SetOutPath $INSTDIR

  ; Copy agent executable
  File "dist\sysid9_agent.exe"

  ; Create config directory
  CreateDirectory "$PROGRAMDATA\SysID9"

  ; Write config file
  FileOpen $0 "$PROGRAMDATA\SysID9\config.ini" w
  FileWrite $0 "[server]$\r$\n"
  FileWrite $0 "url = $SERVER_URL$\r$\n"
  FileWrite $0 "api_key = $AGENT_TOKEN$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "[agent]$\r$\n"
  FileWrite $0 "id = $\r$\n"
  FileClose $0

  ; Install and start Windows service
  nsExec::ExecToLog '"$INSTDIR\sysid9_agent.exe" --startup auto install'
  nsExec::ExecToLog '"$INSTDIR\sysid9_agent.exe" start'

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Add to Programs list
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SysID9Agent" \
    "DisplayName" "SysID9 Agent"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SysID9Agent" \
    "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SysID9Agent" \
    "Publisher" "SysID9"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SysID9Agent" \
    "DisplayVersion" "1.0.0"
SectionEnd

Section "Uninstall"
  ; Stop and remove service
  nsExec::ExecToLog '"$INSTDIR\sysid9_agent.exe" stop'
  nsExec::ExecToLog '"$INSTDIR\sysid9_agent.exe" remove'

  ; Remove files
  Delete "$INSTDIR\sysid9_agent.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  ; Remove config
  Delete "$PROGRAMDATA\SysID9\config.ini"
  Delete "$PROGRAMDATA\SysID9\inventory_cache.json"
  Delete "$PROGRAMDATA\SysID9\agent.log"
  RMDir "$PROGRAMDATA\SysID9"

  ; Remove registry
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SysID9Agent"
SectionEnd

; Silent install support
Function .onInit
  ${GetParameters} $0
  ${GetOptions} $0 "/silent" $1
  IfErrors +2 0
    SetSilent silent

  ${GetOptions} $0 "/server=" $SERVER_URL
  ${GetOptions} $0 "/token=" $AGENT_TOKEN
FunctionEnd
