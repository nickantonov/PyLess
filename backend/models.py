# Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
from pydantic import BaseModel
from typing import Optional, List


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = ""
    invite_code: Optional[str] = ""


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    display_name: str
    theme: str
    editor_theme: str


class Task(BaseModel):
    id: str
    module: str
    module_order: int
    title: str
    difficulty: str
    description: str
    starter_code: str
    hints: List[str]
    tests: List[dict]
    explanation: Optional[str] = ""


class CodeSubmission(BaseModel):
    code: str
    task_id: str


class TestResult(BaseModel):
    passed: bool
    input: str
    expected: str
    got: str
    error: Optional[str] = None


class AIRequest(BaseModel):
    message: str
    task_id: Optional[str] = None
    code: Optional[str] = None


class AIResponse(BaseModel):
    reply: str


class ProgressUpdate(BaseModel):
    task_id: str
    status: str
    best_code: Optional[str] = None
