from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_devices: int
    online: int
    offline: int
    alerts: int
    recent_changes: int


class ChartDataPoint(BaseModel):
    label: str
    value: int | float


class AlertHistoryPoint(BaseModel):
    date: str
    count: int


class DashboardChartData(BaseModel):
    data: list[ChartDataPoint]
