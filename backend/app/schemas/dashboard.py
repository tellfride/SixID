from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_devices: int
    online: int
    offline: int
    alerts: int
    recent_changes: int
    avg_uptime_percent: float
    avg_offline_hours: float


class ChartDataPoint(BaseModel):
    label: str
    value: int | float


class AlertHistoryPoint(BaseModel):
    date: str
    count: int


class DashboardChartData(BaseModel):
    data: list[ChartDataPoint]


class DiskHealthItem(BaseModel):
    hostname: str
    model: str
    capacity_gb: float
    health: str
    media_type: str


class TopSoftwareItem(BaseModel):
    name: str
    count: int
