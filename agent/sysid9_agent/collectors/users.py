import subprocess

from sysid9_agent.collectors.base import BaseCollector


class UserCollector(BaseCollector):
    def component_name(self) -> str:
        return "users"

    def collect(self) -> dict:
        users = []

        # Get local users via net user
        try:
            result = subprocess.run(
                ["net", "user"],
                capture_output=True, text=True, timeout=15,
            )
            local_users = []
            capture = False
            for line in result.stdout.splitlines():
                if "---" in line:
                    capture = True
                    continue
                if capture and line.strip():
                    if "command completed" in line.lower() or "comando" in line.lower():
                        break
                    local_users.extend(line.split())

            # Get admin group members
            admins = set()
            for group in ["Administrators", "Administradores"]:
                r = subprocess.run(
                    ["net", "localgroup", group],
                    capture_output=True, text=True, timeout=15,
                )
                if r.returncode == 0:
                    cap = False
                    for line in r.stdout.splitlines():
                        if "---" in line:
                            cap = True
                            continue
                        if cap and line.strip():
                            if "command completed" in line.lower() or "comando" in line.lower():
                                break
                            admins.add(line.strip())
                    break

            # Get details for each user
            for username in local_users:
                if not username:
                    continue
                user_info = self._get_user_detail(username)
                user_info["is_admin"] = username in admins
                user_info["source"] = "local"
                users.append(user_info)

        except Exception:
            pass

        # Get domain users (if joined to a domain)
        try:
            import wmi
            w = wmi.WMI()
            domain_info = w.Win32_ComputerSystem()[0]
            if domain_info.PartOfDomain:
                domain_name = domain_info.Domain
                # Get cached domain profiles
                for profile in w.Win32_UserProfile():
                    sid = profile.SID
                    if not sid or sid.startswith("S-1-5-18") or sid.startswith("S-1-5-19") or sid.startswith("S-1-5-20"):
                        continue
                    local_path = profile.LocalPath or ""
                    username = local_path.split("\\")[-1] if local_path else ""
                    if username and not any(u["username"] == username for u in users):
                        users.append({
                            "username": username,
                            "full_name": "",
                            "is_admin": False,
                            "is_active": True,
                            "source": "domain",
                            "domain": domain_name,
                            "last_logon": profile.LastUseTime[:14] if profile.LastUseTime else None,
                            "profile_path": local_path,
                        })
        except Exception:
            pass

        return {"local_users": users}

    @staticmethod
    def _get_user_detail(username: str) -> dict:
        info = {
            "username": username,
            "full_name": "",
            "is_active": True,
            "domain": "",
            "last_logon": None,
            "profile_path": "",
        }
        try:
            result = subprocess.run(
                ["net", "user", username],
                capture_output=True, text=True, timeout=10,
            )
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith("Full Name") or line.startswith("Nome completo"):
                    info["full_name"] = line.split(None, 2)[-1].strip() if len(line.split(None, 2)) > 1 else ""
                elif "active" in line.lower() or "ativa" in line.lower():
                    info["is_active"] = "yes" in line.lower() or "sim" in line.lower()
                elif "last logon" in line.lower() or "ultimo logon" in line.lower() or "último logon" in line.lower():
                    parts = line.split(None, 2)
                    info["last_logon"] = parts[-1].strip() if len(parts) > 1 else None
                elif "profile" in line.lower() or "perfil" in line.lower():
                    parts = line.split(None, 2)
                    info["profile_path"] = parts[-1].strip() if len(parts) > 1 else ""
        except Exception:
            pass
        return info
