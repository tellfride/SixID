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
export const deleteUnit = (id: number) => api.delete(`/locations/units/${id}`);
export const createCompany = (data: { name: string; unit_id: number }) =>
  api.post('/locations/companies', data);
export const createBranch = (data: { name: string; address?: string; company_id: number }) =>
  api.post('/locations/branches', data);
export const createSector = (data: { name: string; floor?: string; branch_id: number }) =>
  api.post('/locations/sectors', data);
export const createRoom = (data: { name: string; sector_id: number }) =>
  api.post('/locations/rooms', data);
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
