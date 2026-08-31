from typing import List, Optional, Any, Dict

try:
    from pydantic import BaseModel
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def model_dump(self) -> Dict[str, Any]:
            return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

class WebRTCOffer(BaseModel):
    room_id: str
    peer_id: str
    sdp: str
    type: str = "offer"

class WebRTCAnswer(BaseModel):
    room_id: str
    peer_id: str
    sdp: str
    type: str = "answer"

class ICECandidate(BaseModel):
    room_id: str
    peer_id: str
    candidate: Dict[str, Any]

class RoomState(BaseModel):
    room_id: str
    peers: List[str]
    has_offer: bool
    has_answer: bool
    candidate_count: int
