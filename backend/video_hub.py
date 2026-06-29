import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect


class VideoHub:
    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        self.user_rooms: Dict[str, str] = {}

    async def connect(self, ws: WebSocket, room_id: str, user_id: int, user_name: str):
        await ws.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        client_id = f"{user_id}_{user_name}"
        self.rooms[room_id][client_id] = ws
        self.user_rooms[client_id] = room_id

        await self.broadcast(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "participants": list(self.rooms[room_id].keys()),
        })

    async def disconnect(self, ws: WebSocket, room_id: str, user_id: int, user_name: str):
        client_id = f"{user_id}_{user_name}"
        if room_id in self.rooms and client_id in self.rooms[room_id]:
            del self.rooms[room_id][client_id]
            if not self.rooms[room_id]:
                del self.rooms[room_id]
            else:
                await self.broadcast(room_id, {
                    "type": "user_left",
                    "user_id": user_id,
                    "user_name": user_name,
                    "participants": list(self.rooms[room_id].keys()),
                })
        if client_id in self.user_rooms:
            del self.user_rooms[client_id]

    async def handle_message(self, room_id: str, sender_id: str, data: dict):
        msg_type = data.get("type")

        if msg_type in ("offer", "answer", "ice-candidate"):
            target_id = data.get("target")
            if target_id and room_id in self.rooms and target_id in self.rooms[room_id]:
                await self.rooms[room_id][target_id].send_json({
                    **data,
                    "sender": sender_id,
                })

        elif msg_type == "chat":
            await self.broadcast(room_id, {
                "type": "chat",
                "sender": sender_id,
                "text": data.get("text", ""),
            })

        elif msg_type == "toggle_video":
            await self.broadcast(room_id, {
                "type": "toggle_video",
                "user_id": data.get("user_id"),
                "enabled": data.get("enabled"),
            }, exclude=sender_id)

        elif msg_type == "toggle_audio":
            await self.broadcast(room_id, {
                "type": "toggle_audio",
                "user_id": data.get("user_id"),
                "enabled": data.get("enabled"),
            }, exclude=sender_id)

        elif msg_type == "screen_share":
            await self.broadcast(room_id, {
                "type": "screen_share",
                "user_id": data.get("user_id"),
                "enabled": data.get("enabled"),
            }, exclude=sender_id)

    async def broadcast(self, room_id: str, data: dict, exclude: str = ""):
        if room_id not in self.rooms:
            return
        for client_id, ws in self.rooms[room_id].items():
            if client_id != exclude:
                try:
                    await ws.send_json(data)
                except Exception:
                    pass

    def get_participants(self, room_id: str) -> list:
        if room_id not in self.rooms:
            return []
        return [{"id": cid.split("_")[0], "name": "_".join(cid.split("_")[1:])}
                for cid in self.rooms[room_id].keys()]


hub = VideoHub()
