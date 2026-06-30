# SixID

**Sistema de Gestão de Ativos e Inventário de TI**

Sistema completo para monitorar, gerenciar e controlar remotamente dispositivos Windows em redes corporativas. Coleta automaticamente informações de hardware e software através de um agente Windows invisível e exibe tudo em um dashboard web em tempo real, com controle remoto, gestão de impressoras (SNMP) e alertas acionáveis.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Backend** | Python + FastAPI + Uvicorn | 3.11+ / 0.115.0 |
| **Frontend** | React + TypeScript + Ant Design | 18.3 / 5.6 / 5.21 |
| **Banco de Dados** | MariaDB (produção) / SQLite (dev) | 11.4.4 |
| **Agente** | Python + PyInstaller + pywin32 | 3.11+ |
| **Gráficos** | Recharts | 2.12.7 |
| **Drag-and-drop** | @dnd-kit | core/sortable |
| **Estado** | Zustand | 4.5.5 |
| **Build** | Vite | 5.4.7 |
| **Agendamento (backend)** | APScheduler | 3.10.4 |
| **Excel** | openpyxl | - |
| **Infra** | Docker Compose (opcional) / binário portátil | 3.8 |

> O backend detecta automaticamente o dialeto SQL (SQLite ou MySQL/MariaDB) e adapta funções de data/agrupamento — o mesmo código roda em ambos sem alteração.

---

## Funcionalidades

### Dashboard em Tempo Real
- 6 cards de métricas clicáveis (Total, Online, Offline, **Alertas**, Uptime Médio, Tempo Offline Médio)
- **Painéis reorganizáveis** por drag-and-drop (ordem salva no navegador, botão "Resetar Layout")
- Gráficos: distribuição de SO, RAM por faixa, armazenamento por tipo, dispositivos por andar
- Top 10 softwares mais instalados
- Tabela de saúde dos discos (tipo, capacidade, status) e discos com uso ≥80%
- Capacidade total de armazenamento por tipo (usado vs. livre)
- Histórico de alterações de hardware (30 dias)
- Todo gráfico/card é clicável e abre detalhamento (drill-down) com lista de dispositivos
- Auto-refresh a cada 15-60s + WebSocket (atualização instantânea sem F5)

### Sistema de Alertas
- Card "Alertas" soma **dispositivos offline há mais de 24h** + **mudanças críticas de hardware** (RAM, capacidade de disco, modelo/núcleos de CPU) nas últimas 24h
- Clicar no card abre modal com lista detalhada de cada alerta
- **Dispensar** alertas individualmente (botão "Apagar") para manter o ambiente visual limpo, sem perder o registro
- Aba "Dispensados" no mesmo modal lista o histórico com quem dispensou e quando, com opção de **Restaurar**
- Alertas usam chave estável por evento — dispensar uma mudança de RAM específica não esconde alertas futuros do mesmo tipo; se o dispositivo cair offline de novo, gera novo alerta
- Replicado também na página de Inventário (mesmo componente, mesma lógica)

### Inventário Automático
- **Hardware**: CPU, RAM (slots), discos, rede, placa-mãe, BIOS, monitores, impressoras
- **Software**: lista completa com versão, editor e data de instalação
- **Serviços**: todos os serviços Windows com status
- **Usuários locais**: com info de admin, domínio, último logon
- Detecção automática de mudanças de hardware (filtrada — ignora ruído de campos voláteis)
- Exportação em Excel (.xlsx) do inventário completo
- **Histórico de Alterações de Hardware**: card dedicado com estatísticas (total, 24h, 7d, 30d, dispositivos afetados) e exportação Excel filtrável por período (7/30 dias ou histórico completo)

### Controle Remoto
| Comando | Descrição |
|---------|-----------|
| Bloquear Tela | Tela fullscreen HTA via `CreateProcessAsUser`, com mensagem personalizada |
| Desbloquear Tela | Remove bloqueio (mata `mshta.exe`) |
| Acesso VNC | Inicia TightVNC (auto-install) + download `.vnc`, senha alterável pela web |
| Bloquear/Desbloquear Teclado e Mouse | Hooks globais de baixo nível (`WH_KEYBOARD_LL`/`WH_MOUSE_LL`) via `CreateProcessAsUser` na sessão do usuário |
| Bloquear/Desbloquear USB | Ativa/desativa `USBSTOR` no registro |
| Criar Usuário Administrador | `net user` + grupo Administrators |
| Alterar Senha | Individual, em lote ou para todos os dispositivos via caixa de seleção |
| Habilitar/Desabilitar Usuário | `net user /active:yes` ou `/active:no` |
| Reiniciar/Desligar | `shutdown /r` ou `/s` |
| Executar Comando Shell | Execução remota arbitrária (`run_shell`) |

> Bloqueio de teclado/mouse: a API legada `BlockInput()` é ignorada silenciosamente em muitas configurações do Windows moderno. A implementação atual instala hooks globais (`SetWindowsHookEx` com `WH_KEYBOARD_LL`/`WH_MOUSE_LL`) que interceptam e descartam os eventos antes de chegarem a qualquer janela — a mesma técnica usada por softwares de kiosk/controle parental.

### Localizações
Hierarquia de 3 níveis, editável pela interface: **Empresa > Andar > Setor**. Dashboard com visão agregada por andar (gráfico + tabela, drill-down para lista de dispositivos).

### Impressoras
Página dedicada com dashboard completo:
- **Cadastro**: nome, modelo, IP, localização, setor, número de série, comunidade e versão SNMP (v1/v2c/v3)
- **Coleta via SNMP**: contador de páginas, individual ou em massa ("Coletar Todas")
- **Coleta automática agendada**: botão "Coleta Personalizada" configura intervalo (5min a 24h) via APScheduler no backend, sem precisar de cron externo
- **Contador inicial configurável**: permite continuar a contagem de uma impressora que já tinha um histórico de páginas antes de ser cadastrada no sistema
- **Rankings**: top 10/20/30/40/50 impressoras que mais e menos imprimem
- **Dashboard de consumo**: cards de impressões e trocas de toner (hoje/semana/mês), gráficos temporais (7/30/90 dias), consumo por modelo de toner
- **Estoque de toner**: cadastro com quantidade mínima, alerta de estoque baixo, reabastecimento
- **Dispensação de toner vinculada à impressora**: registra modelo, impressora, operador logado e timestamp; desconta automaticamente do estoque
- **Exportação Excel** do histórico de dispensação de toner (com impressora, local, setor e operador)
- Cards do dashboard de impressoras também são reordenáveis por drag-and-drop
- Botão de Ping + indicador visual (verde/vermelho) de conectividade SNMP por impressora

### Segurança
- Autenticação JWT (access + refresh token)
- Senhas com hash bcrypt
- 3 roles: admin, technician, viewer
- Auditoria completa de todas as ações (login, comandos remotos, alterações de localização, dispensa de alertas, etc.)
- Agente autenticado via API key
- Exportações Excel sanitizam caracteres de controle ilegais (hardware com seriais malformados não quebra o download)

### Interface
- Identidade visual SixID (favicon, logo e paleta de cores próprios)
- Tema claro/escuro com toggle (persiste em localStorage)
- Versão dinâmica no footer (lida da tag git mais recente do repositório)
- Busca global no header
- Cards responsivos, reenquadrados para qualquer tamanho de tela
- Páginas: Dashboard, Dashboard de Hardware, Ativos, Inventário, Localizações, Impressoras, Gestão de Usuários Remotos, Usuários do Sistema, Auditoria

---

## Agente Windows

Instalador único (.exe) compilado com PyInstaller. O agente roda em segundo plano, invisível, com auto-start redundante (tarefa agendada ONSTART como SYSTEM + watchdog a cada 5min + Registry Run como fallback).

**Coletores**: hostname, SO, CPU, RAM (slots), discos, rede, placa-mãe, BIOS, monitores, impressoras, software, serviços, usuários locais, processos

**Intervalos**: heartbeat (60s), inventário (6h), detecção de mudanças (30min), polling de comandos (30s) + WebSocket em tempo real

**Comunicação**: WebSocket para comandos instantâneos, com fallback de polling REST a cada 30s caso a conexão caia

**Instalação**:
```bash
# GUI (assistente passo a passo)
SysID9Installer.exe

# Silenciosa
SysID9Installer.exe /silent /server=http://IP:8000 /token=CHAVE
```

O instalador preserva o ID do agente em reinstalações (não duplica o dispositivo no dashboard) e testa a conexão com o servidor antes de configurar o auto-start.

**Locais**:
- Executável: `C:\Program Files\SysID9\SysID9Host.exe`
- Config: `C:\ProgramData\SysID9\config.ini`
- Logs: `C:\ProgramData\SysID9\agent.log`

> Antivírus: se o Windows Defender sinalizar o agente como suspeito (comum para executáveis PyInstaller não assinados), adicione uma exceção manual: `Add-MpPreference -ExclusionPath 'C:\Program Files\SysID9' -ExclusionProcess 'SysID9Host.exe'`

---

## Banco de Dados

Compatível com **SQLite** (desenvolvimento) e **MySQL/MariaDB** (produção) — o backend detecta o dialeto automaticamente. Tabelas organizadas em 5 grupos:

- **Dispositivos**: `devices`, `device_os`, `device_cpu`, `device_ram`, `device_ram_slots`, `device_storage`, `device_network`, `device_motherboard`, `device_bios`, `device_monitors`, `device_printers`, `device_software`, `device_services`, `device_local_users`
- **Rastreamento**: `hardware_changes` (filtrado para registrar só mudanças relevantes de hardware/contas), `audit_logs`, `pending_commands`, `remote_sessions`, `screen_locks`, `dismissed_alerts`
- **Localizações**: `units`, `companies`, `branches`, `sectors`, `rooms`, `responsible_persons`
- **Usuários**: `users`
- **Impressoras**: `printers`, `printer_counters`, `toner_changes`, `toner_stock`, `toner_stock_logs`, `printer_collection_schedule`

### Migração SQLite → MySQL/MariaDB
Um script de migração (`migrate_to_mysql.py`, uso pontual) copia todas as tabelas e dados preservando a ordem de dependência de chaves estrangeiras. Pontos de atenção já corrigidos no código para portabilidade:
- `func.strftime()` (exclusivo do SQLite) substituído por um helper `_date_trunc()` que usa `DATE_FORMAT()` no MySQL
- `GROUP BY`/`ORDER BY` por alias de string trocados por referência direta à expressão de coluna (evita quebra sob `ONLY_FULL_GROUP_BY`, modo padrão do MySQL desde 5.7.5)
- `PRAGMA journal_mode=WAL` condicionado apenas ao dialeto SQLite

---

## Deploy

### Docker (opcional)
```bash
docker-compose up -d
```

### Manual (desenvolvimento ou produção sem Docker)
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

### MariaDB sem Docker (binário portátil, sem root)
Quando Docker/root não estão disponíveis, o MariaDB pode rodar como binário portátil:
```bash
# Download e extração do tarball oficial (bintar-linux)
# Inicialização do datadir local
./scripts/mariadb-install-db --datadir=/caminho/data --auth-root-authentication-method=normal
# Start vinculado a 127.0.0.1 (acesso externo via túnel SSH)
./bin/mariadbd --datadir=/caminho/data --bind-address=127.0.0.1 --port=3306
```
Configure `backend/.env` com `DATABASE_URL=mysql+pymysql://usuario:senha@127.0.0.1:3306/banco`.

Para auto-start em reboot sem usar `apt`/root completo, crie serviços `systemd` (`/etc/systemd/system/*.service`) liberando apenas os comandos `systemctl start/stop/restart` específicos via `/etc/sudoers.d/` (NOPASSWD restrito, sem dar acesso root genérico).

### Agente Windows
```bash
# Na máquina com Python:
cd deploy
construir_e_instalar.bat  # como Admin

# Outras máquinas:
instalar_agente.bat + SysID9Host.exe
```

---

## API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/devices/` | Listar dispositivos |
| GET | `/api/devices/{id}` | Detalhe completo |
| GET | `/api/devices/export` | Exportar inventário em Excel |
| GET | `/api/devices/hardware-changes/stats` | Estatísticas de alterações de hardware |
| GET | `/api/devices/hardware-changes/export?days=N` | Exportar histórico de alterações (Excel) |
| GET | `/api/dashboard/stats` | Métricas do dashboard (inclui contagem de alertas) |
| GET | `/api/dashboard/alerts-detail` | Lista detalhada de alertas ativos |
| POST | `/api/dashboard/alerts/dismiss` | Dispensar um alerta |
| GET | `/api/dashboard/alerts/dismissed` | Histórico de alertas dispensados |
| DELETE | `/api/dashboard/alerts/dismissed/{id}` | Restaurar um alerta dispensado |
| GET | `/api/dashboard/ram-distribution` | Distribuição de RAM |
| GET | `/api/dashboard/disk-health` | Saúde dos discos |
| GET | `/api/dashboard/top-software` | Top softwares |
| GET | `/api/dashboard/devices-per-floor` | Dispositivos agregados por andar |
| GET/POST/PUT/DELETE | `/api/locations/*` | CRUD de empresas, andares e setores |
| GET/POST/PUT/DELETE | `/api/printers/` | CRUD de impressoras |
| POST | `/api/printers/{id}/collect` | Coletar contador via SNMP |
| POST | `/api/printers/collect-all` | Coletar todas as impressoras |
| GET/PUT | `/api/printers/schedule` | Configurar coleta automática agendada |
| GET | `/api/printers/ranking` | Ranking de impressoras (mais/menos imprimem) |
| GET | `/api/printers/dashboard-stats` | Estatísticas de consumo (páginas, toner, por período) |
| POST | `/api/printers/{id}/toner-change` | Registrar substituição de toner |
| GET/POST | `/api/printers/stock` | Estoque de toner |
| POST | `/api/printers/stock/restock` | Reabastecer estoque |
| GET | `/api/printers/stock/export` | Exportar histórico de dispensação (Excel) |
| POST | `/api/remote/{id}/command` | Enviar comando (lock_screen, block_input, change_password, etc.) |
| POST | `/api/remote/batch/change-password` | Alterar senha em lote |
| GET | `/api/agent/commands` | Polling de comandos pendentes (usado pelo agente) |
| GET | `/api/audit/logs` | Trilha de auditoria de todas as ações |
| WS | `/ws/dashboard` | Atualizações em tempo real |
| WS | `/ws/agent/{id}` | Canal do agente |

---

## Documentação

A documentação técnica completa está disponível em PDF: [`docs/SixiD_Documentacao.pdf`](docs/SixiD_Documentacao.pdf)

---

## Histórico de Versões

| Versão | Descrição |
|--------|-----------|
| **v1.4.5** | README completo, publicação consolidada de impressoras/SNMP, sistema de alertas com dismiss/restore, histórico de alterações de hardware exportável, migração para MariaDB |
| **v1.4.4** | Fix definitivo de bloqueio de teclado/mouse (hooks de baixo nível via SetWindowsHookEx), fix de desabilitar/habilitar usuário e troca de senha remota |
| **v1.4.3** | Hierarquia Empresa > Andar > Setor, dashboard por andar |
| **v1.4.2** | Dashboard de impressoras, cards móveis (drag-and-drop), localizações editáveis |
| **v1.4.1** | Filtro "Todos" em dispositivos, detecção de mudança de hardware filtrada (sem ruído) |
| **v1.4.0** | Identidade visual SixID (favicon, logo, paleta de cores) |
| **v1.3.5** | Dashboard avançado, tema claro/escuro, versão dinâmica, cards clicáveis |
| **v1.3.4** | Fix bloqueio de tela (CreateProcessAsUser), auto-refresh WebSocket |
| **v1.3.0** | Bloqueio USB/teclado, senha VNC, cards responsivos |
| **v1.2.0** | Inventário com abas, localizações, export Excel, senhas remotas |
| **v1.1** | Rebrand para SixID, novo agente com instalador GUI |
| **v1.0** | Versão inicial |

---

**SixID** — Sistema de Gestão de Ativos e Inventário de TI
