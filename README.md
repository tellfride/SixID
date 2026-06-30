# SixiD

**Sistema de Gestao de Ativos e Inventario de TI**

Sistema completo para monitorar, gerenciar e controlar remotamente dispositivos Windows em redes corporativas. Coleta automaticamente informacoes de hardware e software atraves de um agente Windows invisivel e exibe tudo em um dashboard web em tempo real.

---

## Stack Tecnologica

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| **Backend** | Python + FastAPI + Uvicorn | 3.11+ / 0.115.0 |
| **Frontend** | React + TypeScript + Ant Design | 18.3 / 5.6 / 5.21 |
| **Banco de Dados** | SQLite (dev) / MySQL 8.0 (prod) | - |
| **Agente** | Python + PyInstaller + pywin32 | 3.11+ |
| **Graficos** | Recharts | 2.12.7 |
| **Estado** | Zustand | 4.5.5 |
| **Build** | Vite | 5.4.7 |
| **Infra** | Docker Compose | 3.8 |

## Funcionalidades

### Dashboard em Tempo Real
- 6 cards de metricas clicaveis (Total, Online, Offline, Alertas, Uptime Medio, Tempo Offline Medio)
- Graficos: distribuicao de SO, RAM por faixa, armazenamento por tipo, dispositivos por unidade
- Top 10 softwares mais instalados
- Tabela de saude dos discos (tipo, capacidade, status)
- Historico de alteracoes de hardware (30 dias)
- Auto-refresh a cada 15s + WebSocket

### Inventario Automatico
- **Hardware**: CPU, RAM (slots), discos, rede, placa-mae, BIOS, monitores, impressoras
- **Software**: lista completa com versao, editor e data de instalacao
- **Servicos**: todos os servicos Windows com status
- **Usuarios locais**: com info de admin, dominio, ultimo logon
- Deteccao automatica de mudancas de hardware
- Exportacao em Excel (.xlsx)

### Controle Remoto
| Comando | Descricao |
|---------|-----------|
| Bloquear Tela | Tela fullscreen HTA via CreateProcessAsUser, com mensagem personalizada |
| Desbloquear Tela | Remove bloqueio (mata mshta.exe) |
| Acesso VNC | Inicia TightVNC (auto-install) + download .vnc, senha alteravel pela web |
| Bloquear/Desbloquear Teclado e Mouse | Hooks globais de baixo nivel (WH_KEYBOARD_LL/WH_MOUSE_LL) via CreateProcessAsUser na sessao do usuario |
| Bloquear/Desbloquear USB | Ativa/desativa USBSTOR no registro |
| Criar Usuario Administrador | net user + grupo Administrators |
| Alterar Senha | Individual, em lote ou para todos os dispositivos via caixa de selecao |
| Habilitar/Desabilitar Usuario | net user /active:yes ou /active:no |
| Reiniciar/Desligar | shutdown /r ou /s |
| Executar Comando Shell | Execucao remota arbitraria (run_shell) |

> Bloqueio de teclado/mouse: a API legada `BlockInput()` e ignorada silenciosamente em muitas configuracoes do Windows moderno. A implementacao atual instala hooks globais (`SetWindowsHookEx` com `WH_KEYBOARD_LL`/`WH_MOUSE_LL`) que interceptam e descartam os eventos antes de chegarem a qualquer janela — a mesma tecnica usada por softwares de kiosk/controle parental.

### Localizacoes
Hierarquia de 3 niveis, editavel pela interface: **Empresa > Andar > Setor**. Dashboard com visao agregada por andar.

### Impressoras
Pagina dedicada com cards reordenaveis (drag-and-drop via @dnd-kit), status e modelo de cada impressora detectada nos dispositivos.

### Seguranca
- Autenticacao JWT (access + refresh token)
- Senhas com bcrypt hash
- 3 roles: admin, technician, viewer
- Auditoria completa de todas as acoes
- Agente autenticado via API key

### Interface
- Identidade visual SixID (favicon, logo e paleta de cores proprios)
- Tema claro/escuro com toggle (persiste em localStorage)
- Versao dinamica no footer (lida da tag git)
- Busca global no header
- Cards responsivos, reenquadrados para qualquer tamanho de tela
- Paginas: Dashboard, Dashboard de Hardware, Ativos (com filtro "Todos"), Inventario, Localizacoes, Impressoras, Gestao de Usuarios Remotos, Usuarios do Sistema, Auditoria

## Agente Windows

Instalador unico (.exe) compilado com PyInstaller. O agente roda em segundo plano, invisivel, com auto-start redundante (tarefa agendada ONSTART como SYSTEM + watchdog a cada 5min + Registry Run como fallback).

**Coletores**: hostname, SO, CPU, RAM (slots), discos, rede, placa-mae, BIOS, monitores, impressoras, software, servicos, usuarios locais, processos

**Intervalos**: heartbeat (60s), inventario (6h), deteccao de mudancas (30min), polling de comandos (30s) + WebSocket em tempo real

**Comunicacao**: WebSocket para comandos instantaneos, com fallback de polling REST a cada 30s caso a conexao caia

**Instalacao**:
```bash
# GUI (assistente passo a passo)
SysID9Installer.exe

# Silenciosa
SysID9Installer.exe /silent /server=http://IP:8000 /token=CHAVE
```

O instalador preserva o ID do agente em reinstalacoes (nao duplica o dispositivo no dashboard) e testa a conexao com o servidor antes de configurar o auto-start.

**Locais**:
- Executavel: `C:\Program Files\SysID9\SysID9Host.exe`
- Config: `C:\ProgramData\SysID9\config.ini`
- Logs: `C:\ProgramData\SysID9\agent.log`

> Antivirus: se o Windows Defender sinalizar o agente como suspeito (comum para executaveis PyInstaller nao assinados), adicione uma excecao manual: `Add-MpPreference -ExclusionPath 'C:\Program Files\SysID9' -ExclusionProcess 'SysID9Host.exe'`

## Banco de Dados

Tabelas organizadas em 4 grupos:

- **Dispositivos**: devices, device_os, device_cpu, device_ram, device_ram_slot, device_storage, device_network, device_motherboard, device_bios, device_monitor, device_printer, device_software, device_service, device_process, etc.
- **Rastreamento**: hardware_changes (filtrado para registrar so mudancas relevantes de hardware/contas, ignorando ruido de campos volateis), audit_logs, pending_commands, remote_sessions, screen_locks
- **Localizacoes**: units, companies, branches, sectors, rooms
- **Usuarios**: users, responsible_persons, local_users

## Deploy

### Docker (producao)
```bash
docker-compose up -d
```

### Manual (desenvolvimento)
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Agente Windows
```bash
# Na maquina com Python:
cd deploy
construir_e_instalar.bat  # como Admin

# Outras maquinas:
instalar_agente.bat + SysID9Host.exe
```

## API

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | /api/auth/login | Login (retorna JWT) |
| GET | /api/devices/ | Listar dispositivos |
| GET | /api/devices/{id} | Detalhe completo |
| GET | /api/devices/export | Exportar Excel |
| GET | /api/dashboard/stats | Metricas do dashboard |
| GET | /api/dashboard/ram-distribution | Distribuicao de RAM |
| GET | /api/dashboard/disk-health | Saude dos discos |
| GET | /api/dashboard/top-software | Top softwares |
| GET/POST/PUT/DELETE | /api/locations/* | CRUD de empresas, andares e setores |
| GET | /api/printers/ | Listar impressoras de todos os dispositivos |
| POST | /api/remote/{id}/command | Enviar comando (lock_screen, block_input, change_password, disable_user, etc.) |
| POST | /api/remote/batch/change-password | Alterar senha em lote (dispositivos selecionados ou todos) |
| GET | /api/agent/commands | Polling de comandos pendentes (usado pelo agente) |
| GET | /api/audit/ | Trilha de auditoria de todas as acoes |
| WS | /ws/dashboard | Atualizacoes em tempo real |
| WS | /ws/agent/{id} | Canal do agente |

## Documentacao

A documentacao tecnica completa esta disponivel em PDF: [`docs/SixiD_Documentacao.pdf`](docs/SixiD_Documentacao.pdf)

## Historico de Versoes

| Versao | Descricao |
|--------|-----------|
| **v1.4.4** | Fix definitivo de bloqueio de teclado/mouse (hooks de baixo nivel via SetWindowsHookEx), fix de desabilitar/habilitar usuario e troca de senha remota |
| **v1.4.3** | Hierarquia Empresa > Andar > Setor, dashboard por andar |
| **v1.4.2** | Dashboard de impressoras, cards moveis (drag-and-drop), localizacoes editaveis |
| **v1.4.1** | Filtro "Todos" em dispositivos, deteccao de mudanca de hardware filtrada (sem ruido) |
| **v1.4.0** | Identidade visual SixID (favicon, logo, paleta de cores) |
| **v1.3.5** | Dashboard avancado, tema claro/escuro, versao dinamica, cards clicaveis |
| **v1.3.4** | Fix bloqueio de tela (CreateProcessAsUser), auto-refresh WebSocket |
| **v1.3.0** | Bloqueio USB/teclado, senha VNC, cards responsivos |
| **v1.2.0** | Inventario com abas, localizacoes, export Excel, senhas remotas |
| **v1.1** | Rebrand para SixiD, novo agente com instalador GUI |
| **v1.0** | Versao inicial |

---

**SixiD** - Sistema de Gestao de Ativos e Inventario de TI
