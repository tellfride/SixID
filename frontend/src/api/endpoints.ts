import api from './client';
import type {
  TokenResponse, User, Device, DeviceDetail, HardwareChange,
  SoftwareInfo, ServiceInfo, DashboardStats, ChartDataPoint,
  AlertHistoryPoint, AuditLog, LocationTreeNode,
} from '../types';

// Auth
export const login = (username: string, password: string) =>
  api.post<TokenResponse>('/auth/login', { username, password });

export const getMe = () =>
  api.get<User>('/auth/me');

// Users
export const getUsers = () => api.get<User[]>('/users/');
export const createUser = (data: { username: string; email: string; password: string; full_name: string; role: string }) =>
  api.post<User>('/users/', data);
export const updateUser = (id: number, data: Partial<User & { password?: string }>) =>
  api.put<User>(`/users/${id}`, data);
export const deleteUser = (id: number) => api.delete(`/users/${id}`);

// Devices
export const getDevices = (params?: Record<string, string | number>) =>
  api.get<Device[]>('/devices/', { params });
export const getDevice = (id: number) =>
  api.get<DeviceDetail>(`/devices/${id}`);
export const updateDevice = (id: number, data: { room_id?: number; responsible_person_id?: number }) =>
  api.put<Device>(`/devices/${id}`, data);
export const deleteDevice = (id: number) =>
  api.delete(`/devices/${id}`);
export const getDeviceChanges = (id: number, page = 1) =>
  api.get<HardwareChange[]>(`/devices/${id}/changes`, { params: { page } });
export const getDeviceSoftware = (id: number) =>
  api.get<SoftwareInfo[]>(`/devices/${id}/software`);
export const getDeviceServices = (id: number) =>
  api.get<ServiceInfo[]>(`/devices/${id}/services`);
export const getHardwareChangesStats = () =>
  api.get<{ total: number; last_24h: number; last_7d: number; last_30d: number; devices_affected: number; last_change: string | null }>('/devices/hardware-changes/stats');

// Dashboard
export const getDashboardStats = () =>
  api.get<DashboardStats>('/dashboard/stats');
export const getOsDistribution = () =>
  api.get<{ data: ChartDataPoint[] }>('/dashboard/os-distribution');
export const getStorageUsage = () =>
  api.get<{ data: ChartDataPoint[] }>('/dashboard/storage-usage');
export const getDevicesPerUnit = () =>
  api.get<{ data: ChartDataPoint[] }>('/dashboard/devices-per-unit');
export const getAlertHistory = (days = 30) =>
  api.get<AlertHistoryPoint[]>('/dashboard/alert-history', { params: { days } });
export const getRamDistribution = () =>
  api.get<{ data: ChartDataPoint[] }>('/dashboard/ram-distribution');
export const getDiskHealth = () =>
  api.get<{ hostname: string; model: string; capacity_gb: number; health: string; media_type: string }[]>('/dashboard/disk-health');
export const getTopSoftware = (limit = 10) =>
  api.get<{ name: string; count: number }[]>('/dashboard/top-software', { params: { limit } });
export const getOsDetails = () =>
  api.get<{ os_name: string; count: number }[]>('/dashboard/os-details');
export const getDevicesByOs = (osName: string) =>
  api.get<any[]>('/dashboard/os-devices', { params: { os_name: osName } });
export const getHardwareRanking = () =>
  api.get<{ ram: any[]; storage: any[] }>('/dashboard/hardware-ranking');
export const getDevicesByRam = (ramLabel: string) =>
  api.get<any[]>('/dashboard/devices-by-ram', { params: { ram_label: ramLabel } });
export const getDevicesByStorageType = (mediaType: string) =>
  api.get<any[]>('/dashboard/devices-by-storage-type', { params: { media_type: mediaType } });
export const getStorageCapacity = () =>
  api.get<any[]>('/dashboard/storage-capacity');
export const getDevicesPerFloor = () =>
  api.get<any[]>('/dashboard/devices-per-floor');
export const getDevicesByFloor = (branchId: number) =>
  api.get<any[]>('/dashboard/devices-by-floor', { params: { branch_id: branchId } });
export const getAlertsDetail = () =>
  api.get<{ alert_key: string; id: number; hostname: string; reason: string; detail: string }[]>('/dashboard/alerts-detail');
export const dismissAlert = (alertKey: string) =>
  api.post('/dashboard/alerts/dismiss', { alert_key: alertKey });
export const getDismissedAlerts = () =>
  api.get<{ id: number; alert_key: string; dismissed_by: string | null; dismissed_at: string }[]>('/dashboard/alerts/dismissed');
export const restoreAlert = (dismissedId: number) =>
  api.delete(`/dashboard/alerts/dismissed/${dismissedId}`);

// Locations
export const getLocationTree = () =>
  api.get<LocationTreeNode[]>('/locations/tree');
export const getUnits = () => api.get('/locations/units');
export const getCompanies = (unitId?: number) => api.get('/locations/companies', { params: unitId ? { unit_id: unitId } : {} });
export const getBranches = (companyId?: number) => api.get('/locations/branches', { params: companyId ? { company_id: companyId } : {} });
export const getSectors = (branchId?: number) => api.get('/locations/sectors', { params: branchId ? { branch_id: branchId } : {} });
export const getRooms = (sectorId?: number) => api.get('/locations/rooms', { params: sectorId ? { sector_id: sectorId } : {} });
export const createUnit = (data: { name: string; description?: string }) =>
  api.post('/locations/units', data);
export const updateUnit = (id: number, data: { name?: string; description?: string }) =>
  api.put(`/locations/units/${id}`, data);
export const deleteUnit = (id: number) => api.delete(`/locations/units/${id}`);
export const createCompany = (data: { name: string; unit_id: number }) =>
  api.post('/locations/companies', data);
export const updateCompany = (id: number, data: Record<string, any>) =>
  api.put(`/locations/companies/${id}`, data);
export const createBranch = (data: { name: string; address?: string; company_id: number }) =>
  api.post('/locations/branches', data);
export const updateBranch = (id: number, data: Record<string, any>) =>
  api.put(`/locations/branches/${id}`, data);
export const createSector = (data: { name: string; floor?: string; branch_id: number }) =>
  api.post('/locations/sectors', data);
export const updateSector = (id: number, data: Record<string, any>) =>
  api.put(`/locations/sectors/${id}`, data);
export const createRoom = (data: { name: string; sector_id: number }) =>
  api.post('/locations/rooms', data);
export const updateRoom = (id: number, data: Record<string, any>) =>
  api.put(`/locations/rooms/${id}`, data);
export const getRoomsFlat = () =>
  api.get<{id: number; full_path: string}[]>('/locations/rooms-flat');

// Remote
export const initiateVnc = (deviceId: number) =>
  api.post(`/remote/${deviceId}/vnc`);
export const lockScreen = (deviceId: number, message: string, unlock_password?: string) =>
  api.post(`/remote/${deviceId}/lock`, { message, unlock_password });
export const unlockScreen = (deviceId: number, password?: string) =>
  api.post(`/remote/${deviceId}/unlock`, { password });
export const sendCommand = (deviceId: number, command: string, params?: Record<string, unknown>) =>
  api.post(`/remote/${deviceId}/command`, { command, params });

// Audit
export const getAuditLogs = (params?: Record<string, string | number>) =>
  api.get<AuditLog[]>('/audit/logs/', { params });

// Printers
export const getPrinterDashboard = () =>
  api.get<any>('/printers/dashboard-stats');
export const getPrinters = (activeOnly = true) =>
  api.get<any[]>('/printers/', { params: { active_only: activeOnly } });
export const createPrinter = (data: Record<string, any>) =>
  api.post('/printers/', data);
export const updatePrinter = (id: number, data: Record<string, any>) =>
  api.put(`/printers/${id}`, data);
export const deletePrinter = (id: number) =>
  api.delete(`/printers/${id}`);
export const pingPrinter = (id: number) =>
  api.post<{ ip: string; online: boolean; output: string }>(`/printers/${id}/ping`);
export const collectPrinterCounter = (id: number) =>
  api.post(`/printers/${id}/collect`);
export const collectAllCounters = () =>
  api.post('/printers/collect-all');
export const getPrinterSchedule = () =>
  api.get<{ enabled: boolean; interval_minutes: number; last_run: string | null }>('/printers/schedule');
export const updatePrinterSchedule = (data: { enabled: boolean; interval_minutes: number }) =>
  api.put('/printers/schedule', data);
export const getPrinterHistory = (id: number) =>
  api.get<any[]>(`/printers/${id}/history`);
export const getPrinterRanking = (top = 10) =>
  api.get<{ most: any[]; least: any[] }>('/printers/ranking', { params: { top } });
export const registerTonerChange = (id: number, data: { toner_model: string; pages_at_change?: number; notes?: string }) =>
  api.post(`/printers/${id}/toner-change`, data);
export const getTonerHistory = (id: number) =>
  api.get<any[]>(`/printers/${id}/toner-history`);
export const getTonerStock = () =>
  api.get<any[]>('/printers/stock');
export const createTonerStock = (data: { toner_model: string; quantity: number; min_quantity?: number }) =>
  api.post('/printers/stock', data);
export const restockToner = (data: { toner_model: string; quantity: number; notes?: string }) =>
  api.post('/printers/stock/restock', data);
export const getStockLogs = (params?: Record<string, any>) =>
  api.get<any[]>('/printers/stock/logs', { params });
export const exportTonerLogs = () => '/printers/stock/export';
