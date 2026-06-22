"""Build script for SixiD Agent.

Run: python build.py
Produces: dist/SixiDHost.exe
"""
import PyInstaller.__main__
import os

base_dir = os.path.dirname(os.path.abspath(__file__))

PyInstaller.__main__.run([
    "installer.py",
    "--onefile",
    "--name=SixiDHost",
    f"--paths={base_dir}",
    "--hidden-import=sixid_agent",
    "--hidden-import=sixid_agent.main",
    "--hidden-import=sixid_agent.config",
    "--hidden-import=sixid_agent.api_client",
    "--hidden-import=sixid_agent.scheduler",
    "--hidden-import=sixid_agent.change_detector",
    "--hidden-import=sixid_agent.collectors",
    "--hidden-import=sixid_agent.collectors.base",
    "--hidden-import=sixid_agent.collectors.bios",
    "--hidden-import=sixid_agent.collectors.cpu",
    "--hidden-import=sixid_agent.collectors.hostname",
    "--hidden-import=sixid_agent.collectors.monitors",
    "--hidden-import=sixid_agent.collectors.motherboard",
    "--hidden-import=sixid_agent.collectors.network",
    "--hidden-import=sixid_agent.collectors.os_info",
    "--hidden-import=sixid_agent.collectors.printers",
    "--hidden-import=sixid_agent.collectors.processes",
    "--hidden-import=sixid_agent.collectors.ram",
    "--hidden-import=sixid_agent.collectors.services",
    "--hidden-import=sixid_agent.collectors.software",
    "--hidden-import=sixid_agent.collectors.storage",
    "--hidden-import=sixid_agent.actions",
    "--hidden-import=sixid_agent.actions.command_executor",
    "--hidden-import=sixid_agent.actions.screen_lock",
    "--hidden-import=sixid_agent.actions.vnc_manager",
    "--hidden-import=sixid_agent.service",
    "--hidden-import=win32timezone",
    "--hidden-import=wmi",
    "--hidden-import=psutil",
    "--console",
])
