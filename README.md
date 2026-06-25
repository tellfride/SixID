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
| Bloquear Tela | Tela fullscreen HTA via CreateProcessAsUser |
| Desbloquear Tela | Remove bloqueio (mata mshta.exe) |
| Acesso VNC | Inicia TightVNC (auto-install) + download .vnc |
| Bloquear Teclado/Mouse | BlockInput via Win32 API |
| Bloquear USB | Desativa USBSTOR no registro |
| Criar Usuario | net user + grupo Administrators |
| Alterar Senha | Em massa para multiplos dispositivos |
| Reiniciar/Desligar | shutdown /r ou /s |

### Localizacoes
Hierarquia de 5 niveis: **Unidade > Empresa > Filial > Setor > Sala**

### Seguranca
- Autenticacao JWT (access + refresh token)
- Senhas com bcrypt hash
- 3 roles: admin, technician, viewer
- Auditoria completa de todas as acoes
- Agente autenticado via API key

### Interface
- Tema claro/escuro com toggle (persiste em localStorage)
- Versao dinamica no footer (lida da tag git)
- Busca global no header
- 8 paginas: Dashboard, Ativos, Inventario, Localizacoes, Senhas Remotas, Usuarios, Auditoria

## Agente Windows

Executavel unico (.exe) compilado com PyInstaller. Roda como servico SYSTEM invisivel.

**Coletores**: hostname, SO, CPU, RAM, discos, rede, placa-mae, BIOS, monitores, impressoras, software, servicos, usuarios, processos

**Intervalos**: heartbeat (60s), inventario (6h), deteccao de mudancas (30min), polling de comandos (30s)

**Instalacao**:
```bash
# GUI
SysID9Host.exe

# Silenciosa
SysID9Host.exe /silent /server=http://IP:8000 /token=CHAVE
```

**Locais**:
- Executavel: `C:\Program Files\SysID9\`
- Config: `C:\ProgramData\SysID9\config.ini`
- Logs: `C:\ProgramData\SysID9\agent.log`

## Banco de Dados

26 tabelas em 4 grupos:

- **Dispositivos** (14 tabelas): devices, device_os, device_cpu, device_ram, device_storage, device_network, etc.
- **Rastreamento** (5 tabelas): hardware_changes, audit_logs, pending_commands, remote_sessions, screen_locks
- **Localizacoes** (5 tabelas): units, companies, branches, sectors, rooms
- **Usuarios** (2 tabelas): users, responsible_persons

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
| POST | /api/remote/{id}/lock | Bloquear tela |
| POST | /api/remote/{id}/command | Enviar comando |
| WS | /ws/dashboard | Atualizacoes em tempo real |
| WS | /ws/agent/{id} | Canal do agente |

## Documentacao

A documentacao tecnica completa esta disponivel em PDF: [`docs/SixiD_Documentacao.pdf`](docs/SixiD_Documentacao.pdf)

## Historico de Versoes

| Versao | Descricao |
|--------|-----------|
| **v1.3.5** | Dashboard avancado, tema claro/escuro, versao dinamica, cards clicaveis |
| **v1.3.4** | Fix bloqueio de tela (CreateProcessAsUser), auto-refresh WebSocket |
| **v1.3.0** | Bloqueio USB/teclado, senha VNC, cards responsivos |
| **v1.2.0** | Inventario com abas, localizacoes, export Excel, senhas remotas |
| **v1.1** | Rebrand para SixiD, novo agente com instalador GUI |
| **v1.0** | Versao inicial |

---

**SixiD** - Sistema de Gestao de Ativos e Inventario de TI
