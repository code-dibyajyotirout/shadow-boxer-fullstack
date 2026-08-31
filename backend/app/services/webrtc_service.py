import time
from typing import Dict, List, Optional, Any
from app.schemas.webrtc import WebRTCOffer, WebRTCAnswer, ICECandidate, RoomState

class WebRTCService:
    """Manages WebRTC signaling, rooms, SDP offers/answers, and candidate queues."""

    def __init__(self):
        self._rooms: Dict[str, Dict[str, Any]] = {}

    def create_or_join_room(self, room_id: str, peer_id: str) -> RoomState:
        if room_id not in self._rooms:
            self._rooms[room_id] = {
                "created_at": time.time(),
                "peers": [],
                "offer": None,
                "answer": None,
                "candidates": {}, # peer_id -> list of candidates
            }
        
        if peer_id not in self._rooms[room_id]["peers"]:
            self._rooms[room_id]["peers"].append(peer_id)
            if peer_id not in self._rooms[room_id]["candidates"]:
                self._rooms[room_id]["candidates"][peer_id] = []

        room = self._rooms[room_id]
        total_candidates = sum(len(c) for c in room["candidates"].values())
        return RoomState(
            room_id=room_id,
            peers=room["peers"],
            has_offer=room["offer"] is not None,
            has_answer=room["answer"] is not None,
            candidate_count=total_candidates,
        )

    def set_offer(self, offer: WebRTCOffer) -> bool:
        if offer.room_id not in self._rooms:
            self.create_or_join_room(offer.room_id, offer.peer_id)
        self._rooms[offer.room_id]["offer"] = offer.model_dump()
        return True

    def get_offer(self, room_id: str) -> Optional[Dict[str, Any]]:
        return self._rooms.get(room_id, {}).get("offer")

    def set_answer(self, answer: WebRTCAnswer) -> bool:
        if answer.room_id not in self._rooms:
            self.create_or_join_room(answer.room_id, answer.peer_id)
        self._rooms[answer.room_id]["answer"] = answer.model_dump()
        return True

    def get_answer(self, room_id: str) -> Optional[Dict[str, Any]]:
        return self._rooms.get(room_id, {}).get("answer")

    def add_candidate(self, candidate: ICECandidate) -> bool:
        if candidate.room_id not in self._rooms:
            self.create_or_join_room(candidate.room_id, candidate.peer_id)
        
        if candidate.peer_id not in self._rooms[candidate.room_id]["candidates"]:
            self._rooms[candidate.room_id]["candidates"][candidate.peer_id] = []

        self._rooms[candidate.room_id]["candidates"][candidate.peer_id].append(candidate.candidate)
        return True

    def get_candidates(self, room_id: str, exclude_peer_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if room_id not in self._rooms:
            return []
        
        candidates = []
        for pid, c_list in self._rooms[room_id]["candidates"].items():
            if exclude_peer_id and pid == exclude_peer_id:
                continue
            candidates.extend(c_list)
        return candidates

webrtc_service = WebRTCService()
