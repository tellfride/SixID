export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'technician' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export interface Device {
  id: number;
  agent_id: string;
  hostname: string;
  current_user: string | null;
  domain: string | null;
  status: 'online' | 'offline' | 'unknown';
  last_seen: string | null;
  agent_version: string | null;
  room_id: number | null;
  responsible_person_id: number | null;
  created_at: string;
  location_path: string | null;
}

export interface OSInfo {
  name: string | null;
  version: string | null;
  build: string | null;
  architecture: string | null;
  product_key: string | null;
}

export interface CPUInfo {
  manufacturer: string | null;
  model: string | null;
  cores: number | null;
  threads: number | null;
  frequency_mhz: number | null;
}

export interface RAMInfo {
  total_gb: number | null;
  used_gb: number | null;
  free_gb: number | null;
}

export interface RAMSlotInfo {
  slot: string | null;
  size_gb: number | null;
  type: string | null;
  speed_mhz: number | null;
  manufacturer: string | null;
}

export interface StorageInfo {
  media_type: string | null;
  model: string | null;
  serial: string | null;
  capacity_gb: number | null;
  used_gb: number | null;
  free_gb: number | null;
  health: string | null;
}

export interface NetworkInfo {
  adapter_name: string | null;
  ip_address: string | null;
  mac_address: string | null;
  gateway: string | null;
  dns: string | null;
  adapter_type: string | null;
}

export interface MotherboardInfo {
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
}

export interface BIOSInfo {
  manufacturer: string | null;
  version: string | null;
  date: string | null;
}

export interface MonitorInfo {
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
}

export interface PrinterInfo {
  name: string | null;
  driver: string | null;
  port: string | null;
  is_default: boolean | null;
}

export interface SoftwareInfo {
  name: string | null;
  version: string | null;
  publisher: string | null;
  install_date: string | null;
}

export interface ServiceInfo {
  name: string | null;
  display_name: string | null;
  status: string | null;
  start_type: string | null;
}

export interface LocalUserInfo {
  username: string | null;
  full_name: string | null;
  is_admin: boolean | null;
  is_active: boolean | null;
  source: string | null;
  domain: string | null;
  last_logon: string | null;
  profile_path: string | null;
}

export interface DeviceDetail extends Device {
  os_info: OSInfo | null;
  cpus: CPUInfo[];
  ram: RAMInfo | null;
  ram_slots: RAMSlotInfo[];
  storage: StorageInfo[];
  networks: NetworkInfo[];
  motherboard: MotherboardInfo | null;
  bios: BIOSInfo | null;
  monitors: MonitorInfo[];
  printers: PrinterInfo[];
  local_users: LocalUserInfo[];
}

export interface HardwareChange {
  id: number;
  component: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  detected_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_devices: number;
  online: number;
  offline: number;
  alerts: number;
  recent_changes: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface AlertHistoryPoint {
  date: string;
  count: number;
}

export interface LocationTreeNode {
  id: number;
  name: string;
  type: string;
  children: LocationTreeNode[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
