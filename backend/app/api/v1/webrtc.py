from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from app.schemas.webrtc import WebRTCOffer, WebRTCAnswer, ICECandidate, RoomState
from app.services.webrtc_service import webrtc_service

router = APIRouter()

@router.post("/join", response_model=RoomState)
async def join_room(room_id: str, peer_id: str):
    return webrtc_service.create_or_join_room(room_id, peer_id)

@router.post("/offer")
async def send_offer(offer: WebRTCOffer):
    webrtc_service.set_offer(offer)
    return {"status": "offer_received", "room_id": offer.room_id}

@router.get("/offer/{room_id}")
async def get_offer(room_id: str):
    offer = webrtc_service.get_offer(room_id)
    if not offer:
        return {"has_offer": False, "offer": None}
    return {"has_offer": True, "offer": offer}

@router.post("/answer")
async def send_answer(answer: WebRTCAnswer):
    webrtc_service.set_answer(answer)
    return {"status": "answer_received", "room_id": answer.room_id}

@router.get("/answer/{room_id}")
async def get_answer(room_id: str):
    answer = webrtc_service.get_answer(room_id)
    if not answer:
        return {"has_answer": False, "answer": None}
    return {"has_answer": True, "answer": answer}

@router.post("/candidate")
async def add_candidate(candidate: ICECandidate):
    webrtc_service.add_candidate(candidate)
    return {"status": "candidate_stored"}

@router.get("/candidates/{room_id}")
async def get_candidates(room_id: str, exclude_peer_id: Optional[str] = None):
    candidates = webrtc_service.get_candidates(room_id, exclude_peer_id)
    return {"candidates": candidates, "count": len(candidates)}
