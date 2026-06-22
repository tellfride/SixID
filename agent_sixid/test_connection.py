"""
Script de diagnóstico — rode na máquina onde o agente está instalado.
Uso: python test_connection.py
"""
import os
import sys
import socket
import configparser

SERVER = "http://10.30.200.200:8000"
AGENT_KEY = "dev-agent-key-2024"
CONFIG_FILE = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SixID", "config.ini")

print("=" * 60)
print("SixiD — Diagnóstico de Conexão do Agente")
print("=" * 60)

print(f"\n[1] Esta máquina:")
print(f"    Hostname: {socket.gethostname()}")
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    print(f"    IP: {s.getsockname()[0]}")
    s.close()
except Exception as e:
    print(f"    IP: erro — {e}")

print(f"\n[2] Arquivo de configuração: {CONFIG_FILE}")
if os.path.exists(CONFIG_FILE):
    config = configparser.ConfigParser()
    config.read(CONFIG_FILE)
    url = config.get("server", "url", fallback="NÃO DEFINIDO")
    key = config.get("server", "api_key", fallback="NÃO DEFINIDO")
    agent_id = config.get("agent", "id", fallback="")
    print(f"    URL: {url}")
    print(f"    API Key: {key}")
    print(f"    Agent ID: {agent_id or '(vazio — não registrado)'}")

    if not url.startswith("http"):
        SERVER = f"http://{url}"
    else:
        SERVER = url
    AGENT_KEY = key
else:
    print("    ARQUIVO NÃO ENCONTRADO — agente não foi instalado")

print(f"\n[3] Ping para 10.30.200.200:")
r = os.system("ping -n 1 -w 2000 10.30.200.200 > nul 2>&1")
print(f"    {'OK — servidor acessível' if r == 0 else 'FALHOU — sem rede'}")

print(f"\n[4] Porta 8000 no servidor:")
try:
    s = socket.create_connection(("10.30.200.200", 8000), timeout=5)
    s.close()
    print("    OK — porta 8000 aberta")
except Exception as e:
    print(f"    FALHOU — {e}")
    print("    Firewall do servidor pode estar bloqueando")

print(f"\n[5] Teste HTTP para {SERVER}/api/health:")
try:
    import urllib.request
    req = urllib.request.urlopen(f"{SERVER}/api/health", timeout=5)
    data = req.read().decode()
    print(f"    OK — resposta: {data}")
except Exception as e:
    print(f"    FALHOU — {e}")

print(f"\n[6] Teste de registro do agente:")
try:
    import urllib.request
    import json
    body = json.dumps({"hostname": socket.gethostname(), "agent_version": "1.0.0"}).encode()
    req = urllib.request.Request(
        f"{SERVER}/api/agent/register",
        data=body,
        headers={"Content-Type": "application/json", "X-Agent-Key": AGENT_KEY},
    )
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read().decode())
    print(f"    OK — registrado com agent_id: {data.get('agent_id')}")
except Exception as e:
    print(f"    FALHOU — {e}")

print(f"\n[7] Processo do agente:")
r = os.popen('tasklist /FI "IMAGENAME eq SixiDHost.exe" 2>nul').read()
if "SixiDHost.exe" in r:
    print("    SixiDHost.exe está rodando")
else:
    print("    SixiDHost.exe NÃO está rodando")

print(f"\n[8] Log do agente:")
log_file = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SixID", "agent.log")
if os.path.exists(log_file):
    with open(log_file, "r") as f:
        lines = f.readlines()
        for line in lines[-10:]:
            print(f"    {line.rstrip()}")
else:
    print("    Arquivo de log não encontrado")

print("\n" + "=" * 60)
print("Diagnóstico concluído.")
print("=" * 60)
input("\nPressione ENTER para fechar...")
