"""Generate SixiD system documentation PDF."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)

PRIMARY = HexColor("#1565FF")
DARK_BG = HexColor("#0B1220")
TEXT_LIGHT = HexColor("#E6EBF1")
GREEN = HexColor("#00BFA5")
RED = HexColor("#FF4D4F")
YELLOW = HexColor("#FFB020")
PURPLE = HexColor("#7C3AED")
GRAY = HexColor("#5B6470")
TABLE_HEADER = HexColor("#1565FF")
TABLE_ROW_ALT = HexColor("#F0F4FF")
WHITE = HexColor("#FFFFFF")
BLACK = HexColor("#1a1a2e")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    "DocTitle", parent=styles["Title"], fontSize=28, leading=34,
    textColor=PRIMARY, spaceAfter=6, fontName="Helvetica-Bold",
))
styles.add(ParagraphStyle(
    "DocSubtitle", parent=styles["Normal"], fontSize=14, leading=18,
    textColor=GRAY, alignment=TA_CENTER, spaceAfter=30,
))
styles.add(ParagraphStyle(
    "H1", parent=styles["Heading1"], fontSize=18, leading=22,
    textColor=PRIMARY, spaceBefore=24, spaceAfter=10, fontName="Helvetica-Bold",
))
styles.add(ParagraphStyle(
    "H2", parent=styles["Heading2"], fontSize=14, leading=18,
    textColor=BLACK, spaceBefore=16, spaceAfter=8, fontName="Helvetica-Bold",
))
styles.add(ParagraphStyle(
    "H3", parent=styles["Heading3"], fontSize=12, leading=15,
    textColor=PURPLE, spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold",
))
styles.add(ParagraphStyle(
    "Body", parent=styles["Normal"], fontSize=10, leading=14,
    textColor=BLACK, alignment=TA_JUSTIFY, spaceAfter=6,
))
styles.add(ParagraphStyle(
    "BulletItem", parent=styles["Normal"], fontSize=10, leading=14,
    textColor=BLACK, leftIndent=20, bulletIndent=8, spaceAfter=3,
))
styles.add(ParagraphStyle(
    "CodeBlock", parent=styles["Normal"], fontSize=9, leading=12,
    textColor=HexColor("#333333"), fontName="Courier", leftIndent=16,
    spaceAfter=4, backColor=HexColor("#F5F5F5"),
))
styles.add(ParagraphStyle(
    "Footer", parent=styles["Normal"], fontSize=8, leading=10,
    textColor=GRAY, alignment=TA_CENTER,
))


def make_table(headers, rows, col_widths=None):
    data = [headers] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), TABLE_ROW_ALT))
    t.setStyle(TableStyle(style))
    return t


def hr():
    return HRFlowable(width="100%", thickness=1, color=HexColor("#E0E0E0"), spaceAfter=10, spaceBefore=6)


def build():
    doc = SimpleDocTemplate(
        "/home/tell/SixID/docs/SixiD_Documentacao.pdf",
        pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2.5 * cm, bottomMargin=2 * cm,
        title="SixiD - Documentacao Tecnica",
        author="SixiD Team",
    )

    story = []
    W = A4[0] - 4 * cm

    # ── COVER ──
    story.append(Spacer(1, 80))
    story.append(Paragraph("SixiD", styles["DocTitle"]))
    story.append(Paragraph("Sistema de Gestao de Ativos e Inventario de TI", styles["DocSubtitle"]))
    story.append(Spacer(1, 20))
    story.append(hr())
    story.append(Spacer(1, 10))
    story.append(Paragraph("Documentacao Tecnica", ParagraphStyle(
        "cover2", parent=styles["Normal"], fontSize=16, textColor=BLACK,
        alignment=TA_CENTER, fontName="Helvetica-Bold",
    )))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Versao 1.3.5", ParagraphStyle(
        "cover3", parent=styles["Normal"], fontSize=12, textColor=GRAY,
        alignment=TA_CENTER,
    )))
    story.append(Spacer(1, 40))

    cover_info = [
        ["Repositorio", "github.com/tellfride/SixID"],
        ["Licenca", "Privado"],
        ["Ultima atualizacao", "Junho 2026"],
        ["Autor", "SixiD Team"],
    ]
    story.append(make_table(["Campo", "Valor"], cover_info, [5 * cm, W - 5 * cm]))
    story.append(PageBreak())

    # ── TABLE OF CONTENTS ──
    story.append(Paragraph("Sumario", styles["H1"]))
    story.append(hr())
    toc_items = [
        "1. Visao Geral",
        "2. Arquitetura do Sistema",
        "3. Stack Tecnologica",
        "4. Banco de Dados",
        "5. Backend (API)",
        "6. Frontend (Dashboard)",
        "7. Agente Windows",
        "8. Funcionalidades do Sistema",
        "9. Controle Remoto",
        "10. Seguranca",
        "11. Deploy e Instalacao",
        "12. Historico de Versoes",
    ]
    for item in toc_items:
        story.append(Paragraph(item, ParagraphStyle(
            "toc", parent=styles["Normal"], fontSize=11, leading=20,
            textColor=PRIMARY, leftIndent=10,
        )))
    story.append(PageBreak())

    # ── 1. OVERVIEW ──
    story.append(Paragraph("1. Visao Geral", styles["H1"]))
    story.append(hr())
    story.append(Paragraph(
        "O SixiD e um sistema completo de gestao de ativos e inventario de TI, projetado para "
        "monitorar, gerenciar e controlar remotamente dispositivos Windows em redes corporativas. "
        "O sistema coleta automaticamente informacoes de hardware e software de cada maquina "
        "atraves de um agente Windows invisivel, exibindo os dados em um dashboard web em tempo real.",
        styles["Body"],
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Principais capacidades:", styles["H3"]))
    bullets = [
        "Inventario automatico de hardware (CPU, RAM, discos, rede, monitores, BIOS, placa-mae)",
        "Inventario de software instalado e servicos Windows",
        "Dashboard em tempo real com auto-refresh via WebSocket",
        "Controle remoto: VNC, bloqueio de tela, bloqueio de teclado/mouse, bloqueio USB",
        "Gerenciamento de usuarios Windows remotamente (criar, alterar senha, desabilitar)",
        "Deteccao automatica de mudancas de hardware",
        "Exportacao de inventario em Excel (.xlsx)",
        "Sistema de localizacoes hierarquico (Unidade > Empresa > Filial > Setor > Sala)",
        "Auditoria completa de todas as acoes dos usuarios",
        "Tema claro e escuro com persistencia",
    ]
    for b in bullets:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {b}", styles["BulletItem"]))
    story.append(PageBreak())

    # ── 2. ARCHITECTURE ──
    story.append(Paragraph("2. Arquitetura do Sistema", styles["H1"]))
    story.append(hr())
    story.append(Paragraph(
        "O SixiD segue uma arquitetura de tres camadas: Agente Windows (coleta), "
        "Backend API (processamento) e Frontend Web (visualizacao).",
        styles["Body"],
    ))
    story.append(Spacer(1, 10))

    arch_data = [
        ["Agente Windows", "Roda como servico SYSTEM invisivel em cada maquina monitorada. "
         "Coleta inventario, executa comandos remotos, conecta via WebSocket."],
        ["Backend (FastAPI)", "API REST + WebSocket. Recebe dados dos agentes, autentica usuarios, "
         "processa inventario, envia comandos remotos."],
        ["Frontend (React)", "Dashboard SPA com Ant Design. Exibe dados em tempo real, "
         "graficos, tabelas, controle remoto."],
        ["Banco de Dados", "SQLite (desenvolvimento) ou MySQL 8.0 (producao). "
         "26 tabelas para dispositivos, inventario, auditoria, localizacoes."],
    ]
    story.append(make_table(["Camada", "Descricao"], arch_data, [4 * cm, W - 4 * cm]))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Comunicacao:", styles["H3"]))
    comm = [
        "Agente -> Backend: REST (registro, heartbeat, inventario) + WebSocket (comandos em tempo real)",
        "Frontend -> Backend: REST (CRUD, autenticacao) + WebSocket (atualizacoes ao vivo)",
        "Backend -> Agente: WebSocket (comandos remotos) + Polling fallback (pending commands)",
    ]
    for c in comm:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {c}", styles["BulletItem"]))
    story.append(PageBreak())

    # ── 3. TECH STACK ──
    story.append(Paragraph("3. Stack Tecnologica", styles["H1"]))
    story.append(hr())

    story.append(Paragraph("3.1 Backend", styles["H2"]))
    backend_stack = [
        ["Python", "3.11+", "Linguagem principal do backend e agente"],
        ["FastAPI", "0.115.0", "Framework web async de alta performance"],
        ["Uvicorn", "0.30.6", "Servidor ASGI para FastAPI"],
        ["SQLAlchemy", "2.0.35", "ORM com suporte a SQLite e MySQL"],
        ["Pydantic", "2.9.2", "Validacao de dados e schemas"],
        ["Alembic", "1.13.3", "Migracoes de banco de dados"],
        ["python-jose", "3.3.0", "Autenticacao JWT"],
        ["Passlib + bcrypt", "1.7.4", "Hash de senhas"],
        ["APScheduler", "3.10.4", "Agendamento de tarefas"],
        ["OpenPyXL", "3.1.5", "Exportacao Excel"],
        ["WebSockets", "13.1", "Comunicacao em tempo real"],
    ]
    story.append(make_table(["Tecnologia", "Versao", "Funcao"], backend_stack, [3.5 * cm, 2 * cm, W - 5.5 * cm]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("3.2 Frontend", styles["H2"]))
    frontend_stack = [
        ["React", "18.3.1", "Biblioteca de UI"],
        ["TypeScript", "5.6.2", "Tipagem estatica"],
        ["Vite", "5.4.7", "Build tool e dev server"],
        ["Ant Design", "5.21.0", "Biblioteca de componentes UI"],
        ["Recharts", "2.12.7", "Graficos e visualizacoes"],
        ["Zustand", "4.5.5", "Gerenciamento de estado (auth + tema)"],
        ["Axios", "1.7.7", "Cliente HTTP"],
        ["React Router", "6.26.2", "Roteamento SPA"],
    ]
    story.append(make_table(["Tecnologia", "Versao", "Funcao"], frontend_stack, [3.5 * cm, 2 * cm, W - 5.5 * cm]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("3.3 Agente Windows", styles["H2"]))
    agent_stack = [
        ["Python", "3.11+", "Linguagem do agente"],
        ["PyInstaller", "-", "Empacotamento em .exe unico"],
        ["pywin32", "-", "Servico Windows (win32serviceutil)"],
        ["WMI", "-", "Coleta de dados de hardware via WMI"],
        ["psutil", "-", "Informacoes de sistema (RAM, CPU, discos)"],
        ["ctypes (Win32 API)", "-", "CreateProcessAsUser, BlockInput, WTSQueryUserToken"],
        ["websocket-client", "-", "Conexao WebSocket com o servidor"],
        ["APScheduler", "3.10.4", "Heartbeat, inventario periodico, polling de comandos"],
    ]
    story.append(make_table(["Tecnologia", "Versao", "Funcao"], agent_stack, [3.5 * cm, 2 * cm, W - 5.5 * cm]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("3.4 Infraestrutura", styles["H2"]))
    infra_stack = [
        ["SQLite", "3.x", "Banco de dados (desenvolvimento)"],
        ["MySQL", "8.0", "Banco de dados (producao via Docker)"],
        ["Docker Compose", "3.8", "Orquestracao de containers"],
        ["Git / GitHub", "-", "Controle de versao e repositorio"],
    ]
    story.append(make_table(["Tecnologia", "Versao", "Funcao"], infra_stack, [3.5 * cm, 2 * cm, W - 5.5 * cm]))
    story.append(PageBreak())

    # ── 4. DATABASE ──
    story.append(Paragraph("4. Banco de Dados", styles["H1"]))
    story.append(hr())
    story.append(Paragraph(
        "O sistema utiliza 26 tabelas organizadas em 4 grupos: Dispositivos e Inventario, "
        "Rastreamento e Auditoria, Localizacoes e Usuarios.",
        styles["Body"],
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("4.1 Dispositivos e Inventario", styles["H2"]))
    db_inv = [
        ["devices", "12", "Tabela principal — hostname, agent_id, status, last_seen, room_id"],
        ["device_os", "8", "Sistema operacional — nome, versao, build, arquitetura, product_key"],
        ["device_cpu", "8", "Processadores — fabricante, modelo, nucleos, threads, frequencia"],
        ["device_ram", "6", "Memoria total — total_gb, used_gb, free_gb"],
        ["device_ram_slots", "8", "Slots de RAM — slot, tamanho, tipo, velocidade, fabricante"],
        ["device_storage", "10", "Discos — tipo, modelo, serial, capacidade, usado, livre, saude"],
        ["device_network", "9", "Adaptadores de rede — nome, IP, MAC, gateway, DNS, tipo"],
        ["device_motherboard", "6", "Placa-mae — fabricante, modelo, serial"],
        ["device_bios", "6", "BIOS — fabricante, versao, data"],
        ["device_monitors", "6", "Monitores — fabricante, modelo, serial"],
        ["device_printers", "7", "Impressoras — nome, driver, porta, padrao"],
        ["device_software", "7", "Software instalado — nome, versao, editor, data"],
        ["device_services", "7", "Servicos Windows — nome, display_name, status, tipo_inicio"],
        ["device_local_users", "11", "Usuarios locais — username, admin, ativo, dominio, ultimo_logon"],
    ]
    story.append(make_table(["Tabela", "Cols", "Descricao"], db_inv, [3.5 * cm, 1.2 * cm, W - 4.7 * cm]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.2 Rastreamento e Auditoria", styles["H2"]))
    db_track = [
        ["hardware_changes", "7", "Historico de mudancas de hardware detectadas automaticamente"],
        ["audit_logs", "8", "Log de todas as acoes de usuarios (login, comandos, CRUD)"],
        ["pending_commands", "7", "Fila de comandos para agentes (status: pending/sent/completed)"],
        ["remote_sessions", "6", "Sessoes VNC e bloqueio de tela"],
        ["screen_locks", "7", "Registro de bloqueios de tela ativos"],
    ]
    story.append(make_table(["Tabela", "Cols", "Descricao"], db_track, [3.5 * cm, 1.2 * cm, W - 4.7 * cm]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.3 Localizacoes e Usuarios", styles["H2"]))
    db_loc = [
        ["units", "4", "Unidades (nivel 1 da hierarquia)"],
        ["companies", "4", "Empresas vinculadas a unidades"],
        ["branches", "5", "Filiais vinculadas a empresas"],
        ["sectors", "5", "Setores vinculados a filiais"],
        ["rooms", "4", "Salas vinculadas a setores"],
        ["responsible_persons", "6", "Responsaveis por dispositivos"],
        ["users", "9", "Usuarios do sistema (admin, technician, viewer)"],
    ]
    story.append(make_table(["Tabela", "Cols", "Descricao"], db_loc, [3.5 * cm, 1.2 * cm, W - 4.7 * cm]))
    story.append(PageBreak())

    # ── 5. BACKEND API ──
    story.append(Paragraph("5. Backend (API)", styles["H1"]))
    story.append(hr())

    story.append(Paragraph("5.1 Endpoints da API", styles["H2"]))
    api_routes = [
        ["POST", "/api/auth/login", "Login com username/password, retorna JWT"],
        ["GET", "/api/auth/me", "Dados do usuario autenticado"],
        ["GET", "/api/devices/", "Listar dispositivos (filtros: status, search, unit)"],
        ["GET", "/api/devices/{id}", "Detalhe completo de um dispositivo"],
        ["GET", "/api/devices/{id}/changes", "Historico de mudancas de hardware"],
        ["GET", "/api/devices/{id}/software", "Lista de software instalado"],
        ["GET", "/api/devices/{id}/services", "Lista de servicos Windows"],
        ["GET", "/api/devices/export", "Exportar inventario em Excel"],
        ["GET", "/api/dashboard/stats", "Estatisticas (total, online, offline, uptime, alertas)"],
        ["GET", "/api/dashboard/os-distribution", "Distribuicao por SO"],
        ["GET", "/api/dashboard/ram-distribution", "Distribuicao de RAM por faixa"],
        ["GET", "/api/dashboard/disk-health", "Saude de todos os discos"],
        ["GET", "/api/dashboard/top-software", "Top N softwares mais instalados"],
        ["GET", "/api/dashboard/storage-usage", "Armazenamento por tipo (SSD/HDD/NVMe)"],
        ["GET", "/api/dashboard/devices-per-unit", "Dispositivos por unidade"],
        ["GET", "/api/dashboard/alert-history", "Historico de alteracoes (30 dias)"],
        ["POST", "/api/remote/{id}/lock", "Bloquear tela do dispositivo"],
        ["POST", "/api/remote/{id}/unlock", "Desbloquear tela"],
        ["POST", "/api/remote/{id}/vnc", "Iniciar sessao VNC"],
        ["POST", "/api/remote/{id}/command", "Enviar comando generico ao agente"],
        ["POST", "/api/agent/register", "Registro de novo agente"],
        ["POST", "/api/agent/heartbeat", "Heartbeat periodico do agente"],
        ["POST", "/api/agent/inventory", "Upload de inventario completo"],
        ["GET", "/api/agent/commands", "Polling de comandos pendentes"],
    ]
    story.append(make_table(
        ["Metodo", "Endpoint", "Descricao"], api_routes,
        [1.5 * cm, 5.5 * cm, W - 7 * cm],
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("5.2 WebSocket", styles["H2"]))
    ws_info = [
        ["/ws/dashboard", "Frontend se conecta para receber atualizacoes em tempo real "
         "(status_change, heartbeat, inventory_updated)"],
        ["/ws/agent/{agent_id}", "Agente se conecta para receber comandos instantaneos "
         "(lock_screen, unlock_screen, start_vnc, etc.)"],
    ]
    story.append(make_table(["Endpoint", "Descricao"], ws_info, [4 * cm, W - 4 * cm]))
    story.append(PageBreak())

    # ── 6. FRONTEND ──
    story.append(Paragraph("6. Frontend (Dashboard)", styles["H1"]))
    story.append(hr())

    story.append(Paragraph("6.1 Paginas", styles["H2"]))
    pages = [
        ["Dashboard", "/", "Cards de metricas (clicaveis), graficos de SO, RAM, discos, software, historico"],
        ["Ativos", "/devices", "Lista de dispositivos com busca, filtro por status, export Excel"],
        ["Detalhe do Ativo", "/devices/:id", "8 abas: Sistema, Memoria, Armazenamento, Rede, "
         "Perifericos, Software, Servicos, Usuarios, Alteracoes"],
        ["Inventario", "/inventory", "Visao consolidada com abas: Hardware, Rede, Armazenamento, Monitores"],
        ["Localizacoes", "/locations", "Arvore hierarquica (Unidade > Empresa > Filial > Setor > Sala)"],
        ["Senhas Remotas", "/user-mgmt", "Criar usuario e alterar senha em massa (admin)"],
        ["Usuarios", "/users", "CRUD de usuarios do sistema (admin)"],
        ["Auditoria", "/audit", "Log de todas as acoes com filtro por tipo (admin)"],
    ]
    story.append(make_table(["Pagina", "Rota", "Descricao"], pages, [3 * cm, 3 * cm, W - 6 * cm]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("6.2 Recursos", styles["H2"]))
    features = [
        "Tema claro/escuro com toggle no header (persistido em localStorage)",
        "Auto-refresh a cada 15s + WebSocket para atualizacoes instantaneas",
        "Versao dinamica no footer (lida do backend via /api/health)",
        "Busca global no header navega para lista de dispositivos filtrada",
        "Responsivo para desktop e tablets",
    ]
    for f in features:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {f}", styles["BulletItem"]))
    story.append(PageBreak())

    # ── 7. AGENT ──
    story.append(Paragraph("7. Agente Windows", styles["H1"]))
    story.append(hr())
    story.append(Paragraph(
        "O agente e um executavel Windows (.exe) compilado com PyInstaller, que roda como "
        "servico SYSTEM invisivel. Ele se registra no servidor, envia heartbeats periodicos, "
        "coleta inventario e executa comandos remotos.",
        styles["Body"],
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("7.1 Coletores de Inventario", styles["H2"]))
    collectors = [
        ["hostname", "Hostname, usuario logado, dominio"],
        ["os_info", "Nome, versao, build, arquitetura do SO"],
        ["cpu", "Fabricante, modelo, nucleos, threads, frequencia"],
        ["ram", "Total, usado, livre + slots individuais (tipo, velocidade, fabricante)"],
        ["storage", "Discos: tipo (SSD/HDD/NVMe), modelo, serial, capacidade, saude"],
        ["network", "Adaptadores: IP, MAC, gateway, DNS, tipo"],
        ["motherboard", "Fabricante, modelo, serial"],
        ["bios", "Fabricante, versao, data"],
        ["monitors", "Fabricante, modelo, serial (via WMI)"],
        ["printers", "Nome, driver, porta, padrao"],
        ["software", "Lista completa de software instalado (registro Windows)"],
        ["services", "Servicos Windows: nome, status, tipo de inicio"],
        ["users", "Usuarios locais: admin, ativo, dominio, ultimo logon"],
        ["processes", "Processos em execucao"],
    ]
    story.append(make_table(["Coletor", "Dados coletados"], collectors, [3 * cm, W - 3 * cm]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("7.2 Intervalos de Operacao", styles["H2"]))
    intervals = [
        ["Heartbeat", "60 segundos", "Sinal de vida para o servidor"],
        ["Inventario completo", "6 horas", "Coleta e envio de todos os dados"],
        ["Deteccao de mudancas", "30 minutos", "Compara inventario com cache local"],
        ["Polling de comandos", "30 segundos", "Busca comandos pendentes no servidor"],
        ["Reconexao WebSocket", "10 segundos", "Reconecta automaticamente se desconectar"],
    ]
    story.append(make_table(["Operacao", "Intervalo", "Descricao"], intervals, [3.5 * cm, 3 * cm, W - 6.5 * cm]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("7.3 Instalacao do Agente", styles["H2"]))
    story.append(Paragraph(
        "O agente possui um instalador grafico (GUI Tkinter) e suporta instalacao silenciosa via linha de comando:",
        styles["Body"],
    ))
    story.append(Paragraph("SysID9Host.exe /silent /server=http://IP:8000 /token=CHAVE", styles["CodeBlock"]))
    story.append(Spacer(1, 4))
    inst_features = [
        "Instala em C:\\Program Files\\SysID9\\",
        "Configuracao em C:\\ProgramData\\SysID9\\config.ini",
        "Logs em C:\\ProgramData\\SysID9\\agent.log",
        "Auto-start via Tarefa Agendada (ONSTART, SYSTEM) + Registro Run + Watchdog a cada 5 min",
        "Preserva agent_id existente em atualizacoes",
    ]
    for f in inst_features:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {f}", styles["BulletItem"]))
    story.append(PageBreak())

    # ── 8. FEATURES ──
    story.append(Paragraph("8. Funcionalidades do Sistema", styles["H1"]))
    story.append(hr())

    story.append(Paragraph("8.1 Dashboard em Tempo Real", styles["H2"]))
    dash_features = [
        "6 cards de metricas clicaveis: Total, Online, Offline, Alertas, Uptime Medio, Tempo Offline Medio",
        "Grafico de distribuicao de Sistemas Operacionais (pizza)",
        "Grafico de distribuicao de RAM por faixa (barras)",
        "Grafico de armazenamento por tipo SSD/HDD/NVMe (barras)",
        "Grafico de dispositivos por unidade (barras)",
        "Top 10 softwares mais instalados (barras horizontal)",
        "Historico de alteracoes de hardware (linha, 30 dias)",
        "Tabela de saude dos discos (tipo, capacidade, status)",
        "Tabela dos ultimos ativos cadastrados",
    ]
    for f in dash_features:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {f}", styles["BulletItem"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("8.2 Gestao de Ativos", styles["H2"]))
    asset_features = [
        "Busca por hostname, usuario ou agent_id",
        "Filtro por status (online/offline/desconhecido)",
        "Detalhe completo com 8 abas de informacoes",
        "Associacao de dispositivo a localizacao (sala)",
        "Exportacao de inventario completo em Excel",
        "Deteccao automatica de mudancas de hardware com historico",
    ]
    for f in asset_features:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {f}", styles["BulletItem"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("8.3 Localizacoes", styles["H2"]))
    story.append(Paragraph(
        "Sistema hierarquico de 5 niveis: Unidade > Empresa > Filial > Setor > Sala. "
        "Cada dispositivo pode ser associado a uma sala. Localizacoes sao exibidas em arvore "
        "e como breadcrumb na lista de dispositivos.",
        styles["Body"],
    ))
    story.append(PageBreak())

    # ── 9. REMOTE CONTROL ──
    story.append(Paragraph("9. Controle Remoto", styles["H1"]))
    story.append(hr())

    remote_cmds = [
        ["lock_screen", "Bloquear Tela", "Exibe tela fullscreen HTA na sessao do usuario. "
         "Usa CreateProcessAsUser (Win32 API) para funcionar quando o agente roda como SYSTEM."],
        ["unlock_screen", "Desbloquear Tela", "Mata processo mshta.exe e remove tarefa agendada."],
        ["start_vnc", "Acesso Remoto VNC", "Inicia TightVNC (instala automaticamente se necessario). "
         "Gera arquivo .vnc para download que abre o viewer."],
        ["block_input", "Bloquear Teclado/Mouse", "Usa BlockInput() da Win32 API. Desbloqueavel com Ctrl+Alt+Del."],
        ["unblock_input", "Desbloquear Teclado/Mouse", "Libera teclado e mouse."],
        ["block_usb", "Bloquear USB", "Desativa USBSTOR no registro (impede pendrives)."],
        ["unblock_usb", "Desbloquear USB", "Reativa USBSTOR no registro."],
        ["create_user", "Criar Usuario Windows", "Cria usuario local com net user, opcao admin."],
        ["change_password", "Alterar Senha", "Altera senha de usuario local com net user."],
        ["disable_user", "Desabilitar Usuario", "net user /active:no"],
        ["enable_user", "Habilitar Usuario", "net user /active:yes"],
        ["restart", "Reiniciar", "shutdown /r /t 5"],
        ["shutdown", "Desligar", "shutdown /s /t 5"],
        ["change_vnc_password", "Alterar Senha VNC", "Altera senha do TightVNC via registro."],
    ]
    story.append(make_table(
        ["Comando", "Acao", "Descricao"], remote_cmds,
        [3 * cm, 3.5 * cm, W - 6.5 * cm],
    ))
    story.append(PageBreak())

    # ── 10. SECURITY ──
    story.append(Paragraph("10. Seguranca", styles["H1"]))
    story.append(hr())
    sec_items = [
        ["Autenticacao", "JWT (python-jose) com access_token (30 min) e refresh_token (7 dias)"],
        ["Senhas", "Hash com bcrypt via Passlib (nunca armazenadas em texto plano)"],
        ["Roles", "3 niveis: admin (acesso total), technician (controle remoto), viewer (somente leitura)"],
        ["Agente", "Autenticado via X-Agent-Key header em todas as requisicoes"],
        ["Auditoria", "Todas as acoes sao registradas em audit_logs com usuario, IP e detalhes"],
        ["WebSocket", "Conexao autenticada por agent_id; dashboard conecta via /ws/dashboard"],
        ["VNC", "Senha padrao configuravel; alteravel remotamente via dashboard"],
    ]
    story.append(make_table(["Aspecto", "Implementacao"], sec_items, [3 * cm, W - 3 * cm]))
    story.append(PageBreak())

    # ── 11. DEPLOY ──
    story.append(Paragraph("11. Deploy e Instalacao", styles["H1"]))
    story.append(hr())

    story.append(Paragraph("11.1 Servidor (Docker)", styles["H2"]))
    story.append(Paragraph("docker-compose up -d", styles["CodeBlock"]))
    story.append(Paragraph(
        "Levanta 3 containers: MySQL 8.0, Backend (FastAPI + Uvicorn), Frontend (Vite). "
        "Configuracao via variaveis de ambiente no docker-compose.yml.",
        styles["Body"],
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("11.2 Servidor (Manual)", styles["H2"]))
    manual_steps = [
        "Backend: cd backend && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000",
        "Frontend: cd frontend && npm install && npm run dev -- --host 0.0.0.0",
    ]
    for s in manual_steps:
        story.append(Paragraph(s, styles["CodeBlock"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("11.3 Agente Windows", styles["H2"]))
    agent_steps = [
        "1. Copiar pasta deploy/ para maquina Windows com Python 3.10+",
        "2. Executar construir_e_instalar.bat como Administrador",
        "3. Para outras maquinas: copiar SysID9Host.exe + instalar_agente.bat",
    ]
    for s in agent_steps:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {s}", styles["BulletItem"]))
    story.append(PageBreak())

    # ── 12. VERSION HISTORY ──
    story.append(Paragraph("12. Historico de Versoes", styles["H1"]))
    story.append(hr())
    versions = [
        ["v1.3.5", "Jun 2026", "Dashboard avancado (RAM, discos, top software, uptime), "
         "tema claro/escuro, versao dinamica via git tag, cards clicaveis, busca funcional"],
        ["v1.3.4", "Jun 2026", "Fix bloqueio de tela com CreateProcessAsUser (Session 0 isolation), "
         "auto-refresh via WebSocket + polling, pasta deploy com .bat"],
        ["v1.3.0", "Jun 2026", "Correcoes de encoding, persistencia, bloqueio USB, "
         "bloqueio teclado/mouse, senha VNC alteravel, cards responsivos"],
        ["v1.2.0", "Jun 2026", "Inventario com abas, localizacoes em cascata, export Excel, "
         "gerenciamento de senhas remotas, usuarios locais"],
        ["v1.1", "Jun 2026", "Rebrand para SixiD, novo agente Windows com instalador GUI"],
        ["v1.0", "Jun 2026", "Versao inicial — inventario basico, dashboard, VNC"],
    ]
    story.append(make_table(["Versao", "Data", "Mudancas"], versions, [2 * cm, 2 * cm, W - 4 * cm]))

    story.append(Spacer(1, 30))
    story.append(hr())
    story.append(Paragraph(
        "SixiD - Sistema de Gestao de Ativos e Inventario de TI | github.com/tellfride/SixID",
        styles["Footer"],
    ))

    doc.build(story)
    print("PDF generated: /home/tell/SixID/docs/SixiD_Documentacao.pdf")


if __name__ == "__main__":
    build()
