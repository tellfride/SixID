"""Build script for SysID9 Agent.

Run: python build.py
Produces: dist/sysid9_agent.exe

Then use NSIS to compile installer/sysid9_installer.nsi
"""
import PyInstaller.__main__

PyInstaller.__main__.run([
    "sysid9_agent/main.py",
    "--onefile",
    "--name=sysid9_agent",
    "--hidden-import=win32timezone",
    "--hidden-import=wmi",
    "--hidden-import=psutil",
    "--noconsole",
    "--icon=NONE",
])
