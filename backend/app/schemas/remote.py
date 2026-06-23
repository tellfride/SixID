from pydantic import BaseModel


class LockScreenRequest(BaseModel):
    message: str = "Seu computador foi bloqueado pela equipe de TI."
    unlock_password: str | None = None


class UnlockScreenRequest(BaseModel):
    password: str | None = None


class SendCommandRequest(BaseModel):
    command: str
    params: dict | None = None


class CreateUserRequest(BaseModel):
    username: str
    password: str
    is_admin: bool = True
    device_ids: list[int]


class ChangePasswordRequest(BaseModel):
    username: str
    password: str
    device_ids: list[int]


class ChangeVncPasswordRequest(BaseModel):
    password: str
    device_ids: list[int]


class RemoteSessionResponse(BaseModel):
    id: int
    device_id: int
    session_type: str
    started_at: str
    ended_at: str | None = None

    model_config = {"from_attributes": True}
