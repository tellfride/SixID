from pydantic import BaseModel


class LockScreenRequest(BaseModel):
    message: str = "Seu computador foi bloqueado pela equipe de TI."
    unlock_password: str | None = None


class UnlockScreenRequest(BaseModel):
    password: str | None = None


class SendCommandRequest(BaseModel):
    command: str
    params: dict | None = None


class RemoteSessionResponse(BaseModel):
    id: int
    device_id: int
    session_type: str
    started_at: str
    ended_at: str | None = None

    model_config = {"from_attributes": True}
