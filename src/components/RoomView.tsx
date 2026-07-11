import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/appStore";
import { fetchLiveKitToken } from "../lib/api";
import type { Room as RoomType, Seat, Message, Gift as GiftType, Profile } from "../types";
import { RoomHeader } from "./RoomHeader";
import { SeatGrid } from "./SeatGrid";
import { ChatPanel } from "./ChatPanel";
import { GiftModal } from "./GiftModal";
import { RoomControls } from "./RoomControls";
import { Room as LKRoom, RoomEvent, Participant } from "livekit-client";

export function RoomView() {
  const { activeRoomId, profile, setView, setActiveRoomId } = useAppStore();
  const [room, setRoom] = useState<RoomType | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [lkRoom, setLkRoom] = useState<LKRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [mySeat, setMySeat] = useState<Seat | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [activeGiftAnim, setActiveGiftAnim] = useState<{ emoji: string; sender: string; receiver: string } | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());

  const fetchRoomData = useCallback(async () => {
    if (!activeRoomId) return;
    const { data: roomData } = await supabase.from("rooms").select("*").eq("id", activeRoomId).single();
    if (roomData) setRoom(roomData as RoomType);

    const { data: seatsData } = await supabase
      .from("seats").select("*, profile:profiles(*)").eq("room_id", activeRoomId).order("seat_number", { ascending: true });
    if (seatsData) {
      const mapped = seatsData.map((s: any) => ({ ...s, profile: s.profile })) as Seat[];
      setSeats(mapped);
      if (profile) {
        const mine = mapped.find((s) => s.occupant_id === profile.id);
        setMySeat(mine || null);
      }
    }

    const { data: msgData } = await supabase
      .from("messages").select("*, profile:profiles(*)").eq("room_id", activeRoomId).order("created_at", { ascending: true }).limit(100);
    if (msgData) setMessages(msgData.map((m: any) => ({ ...m, profile: m.profile })) as Message[]);

    const { data: giftData } = await supabase.from("gifts").select("*");
    if (giftData) setGifts(giftData as GiftType[]);
    setLoading(false);
  }, [activeRoomId, profile]);

  useEffect(() => { fetchRoomData(); }, [fetchRoomData]);

  useEffect(() => {
    if (!activeRoomId) return;
    const seatsChannel = supabase.channel(`seats-${activeRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "seats", filter: `room_id=eq.${activeRoomId}` }, () => fetchRoomData()).subscribe();
    const messagesChannel = supabase.channel(`messages-${activeRoomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoomId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id) {
            supabase.from("profiles").select("*").eq("id", newMsg.sender_id).single().then(({ data }) =>
              setMessages((prev) => [...prev, { ...newMsg, profile: data as Profile }]));
          } else { setMessages((prev) => [...prev, newMsg]); }
        }).subscribe();
    const giftsChannel = supabase.channel(`gifts-${activeRoomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions", filter: `room_id=eq.${activeRoomId}` },
        async (payload) => {
          const tx = payload.new as any;
          const { data: giftData } = await supabase.from("gifts").select("*").eq("id", tx.gift_id).single();
          const { data: senderData } = await supabase.from("profiles").select("nickname").eq("id", tx.sender_id).single();
          const { data: receiverData } = await supabase.from("profiles").select("nickname").eq("id", tx.receiver_id).single();
          if (giftData && senderData && receiverData) {
            setActiveGiftAnim({ emoji: (giftData as any).icon_url || "🎁", sender: (senderData as any).nickname, receiver: (receiverData as any).nickname });
            setTimeout(() => setActiveGiftAnim(null), 3000);
          }
        }).subscribe();
    return () => { supabase.removeChannel(seatsChannel); supabase.removeChannel(messagesChannel); supabase.removeChannel(giftsChannel); };
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoomId || !profile || !mySeat) return;
    let room: LKRoom | null = null;
    let cancelled = false;
    const connect = async () => {
      const canPublish = mySeat.role === "owner" || mySeat.role === "speaker" || mySeat.role === "admin";
      try {
        const tokenData = await fetchLiveKitToken({ roomName: activeRoomId, participantName: profile.nickname, profileId: profile.id, canPublish, role: mySeat.role });
        if (cancelled) return;
        room = new LKRoom({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { noiseSuppression: true, echoCancellation: true, autoGainControl: true } });
        await room.connect(tokenData.livekitHost, tokenData.token);
        if (cancelled) { room.disconnect(); return; }
        const connectedRoom = room;
        setLkRoom(connectedRoom); setIsConnected(true);
        const updateParticipants = () => setParticipants(new Map(connectedRoom.remoteParticipants));
        updateParticipants();
        connectedRoom.on(RoomEvent.ParticipantConnected, updateParticipants);
        connectedRoom.on(RoomEvent.ParticipantDisconnected, updateParticipants);
        connectedRoom.on(RoomEvent.TrackSubscribed, updateParticipants);
        connectedRoom.on(RoomEvent.TrackUnsubscribed, updateParticipants);
        if (canPublish) { await connectedRoom.localParticipant.setMicrophoneEnabled(true); setIsMuted(false); }
        else { await connectedRoom.localParticipant.setMicrophoneEnabled(false); setIsMuted(true); }
      } catch (err) { console.error("LiveKit connection failed:", err); }
    };
    connect();
    return () => { cancelled = true; if (room) room.disconnect(); setLkRoom(null); setIsConnected(false); };
  }, [activeRoomId, profile, mySeat?.id]);

  useEffect(() => {
    if (!lkRoom) return;
    participants.forEach((participant) => {
      participant.audioTrackPublications.forEach((pub) => {
        if (pub.audioTrack && pub.track) { pub.audioTrack.attach(); }
      });
    });
  }, [participants, lkRoom]);

  const handleLeave = useCallback(async () => {
    if (lkRoom) { await lkRoom.localParticipant.setMicrophoneEnabled(false); lkRoom.disconnect(); }
    if (profile && activeRoomId && mySeat) {
      await supabase.from("seats").update({ occupant_id: null, role: "listener", is_muted: false }).eq("id", mySeat.id);
      await supabase.from("messages").insert({ room_id: activeRoomId, sender_id: profile.id, content: `${profile.nickname} left the room`, type: "system" });
    }
    setActiveRoomId(null); setView("lobby");
  }, [lkRoom, profile, activeRoomId, mySeat, setActiveRoomId, setView]);

  const toggleMute = useCallback(async () => {
    if (!lkRoom) return;
    const newMuted = !isMuted;
    await lkRoom.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
    if (mySeat) await supabase.from("seats").update({ is_muted: newMuted }).eq("id", mySeat.id);
  }, [lkRoom, isMuted, mySeat]);

  const handleTakeSeat = useCallback(async (seat: Seat) => {
    if (!profile || !activeRoomId) return;
    if (mySeat) await supabase.from("seats").update({ occupant_id: null, role: "listener", is_muted: false }).eq("id", mySeat.id);
    const newRole = seat.seat_number === 0 ? "owner" : "speaker";
    await supabase.from("seats").update({ occupant_id: profile.id, role: newRole, is_muted: false }).eq("id", seat.id);
    await supabase.from("messages").insert({ room_id: activeRoomId, sender_id: profile.id, content: `${profile.nickname} joined seat ${seat.seat_number + 1}`, type: "system" });
  }, [profile, activeRoomId, mySeat]);

  const handleLeaveSeat = useCallback(async () => {
    if (!profile || !mySeat) return;
    await supabase.from("seats").update({ occupant_id: null, role: "listener", is_muted: false }).eq("id", mySeat.id);
    if (lkRoom) await lkRoom.localParticipant.setMicrophoneEnabled(false);
  }, [profile, mySeat, lkRoom]);

  const handleKickFromSeat = useCallback(async (seat: Seat) => {
    if (!profile || !room || room.owner_id !== profile.id) return;
    await supabase.from("seats").update({ occupant_id: null, role: "listener", is_muted: false }).eq("id", seat.id);
    if (seat.occupant_id && activeRoomId) {
      const { data: kickedProfile } = await supabase.from("profiles").select("nickname").eq("id", seat.occupant_id).single();
      await supabase.from("messages").insert({ room_id: activeRoomId, sender_id: profile.id, content: `${profile.nickname} removed ${(kickedProfile as any)?.nickname || "a user"} from seat ${seat.seat_number + 1}`, type: "system" });
    }
  }, [profile, room, activeRoomId]);

  const handleToggleLockSeat = useCallback(async (seat: Seat) => {
    if (!profile || !room || room.owner_id !== profile.id) return;
    await supabase.from("seats").update({ is_locked: !seat.is_locked }).eq("id", seat.id);
  }, [profile, room]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!profile || !activeRoomId || !text.trim()) return;
    await supabase.from("messages").insert({ room_id: activeRoomId, sender_id: profile.id, content: text.trim(), type: "text" });
  }, [profile, activeRoomId]);

  const handleSendGift = useCallback(async (receiverId: string, giftId: string) => {
    if (!profile || !activeRoomId) return;
    await supabase.from("gift_transactions").insert({ room_id: activeRoomId, sender_id: profile.id, receiver_id: receiverId, gift_id: giftId });
    const gift = gifts.find((g) => g.id === giftId);
    const receiver = seats.find((s) => s.occupant_id === receiverId)?.profile;
    await supabase.from("messages").insert({ room_id: activeRoomId, sender_id: profile.id, content: `${profile.nickname} sent ${gift?.icon_url || "a gift"} to ${receiver?.nickname || "someone"}`, type: "gift", gift_id: giftId });
  }, [profile, activeRoomId, gifts, seats]);

  const handleEndRoom = useCallback(async () => {
    if (!profile || !room || room.owner_id !== profile.id || !activeRoomId) return;
    if (lkRoom) { await lkRoom.localParticipant.setMicrophoneEnabled(false); lkRoom.disconnect(); }
    await supabase.from("rooms").update({ is_live: false, status: "closed" }).eq("id", activeRoomId);
    await supabase.from("seats").update({ occupant_id: null, role: "listener", is_muted: false }).eq("room_id", activeRoomId);
    setActiveRoomId(null); setView("lobby");
  }, [profile, room, activeRoomId, lkRoom, setActiveRoomId, setView]);

  if (loading) return <div className="pt-20 flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!room) return <div className="pt-20 text-center"><p className="text-muted">Room not found.</p><button onClick={() => setView("lobby")} className="btn-primary mt-4">Back to Lobby</button></div>;

  const isOwner = profile?.id === room.owner_id;

  return (
    <div className="pt-6 animate-fade-in">
      <RoomHeader room={room} onLeave={handleLeave} onEndRoom={handleEndRoom} isOwner={isOwner} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 space-y-4">
          <SeatGrid seats={seats} mySeat={mySeat} isOwner={isOwner} profileId={profile?.id || null}
            onTakeSeat={handleTakeSeat} onLeaveSeat={handleLeaveSeat} onKick={handleKickFromSeat} onToggleLock={handleToggleLockSeat} participants={participants} />
          <RoomControls isConnected={isConnected} isMuted={isMuted} mySeat={mySeat}
            onToggleMute={toggleMute} onLeave={handleLeave} onShowGifts={() => setShowGiftModal(true)} />
        </div>
        <ChatPanel messages={messages} profile={profile} onSendMessage={handleSendMessage} />
      </div>
      {showGiftModal && <GiftModal gifts={gifts} seats={seats} myProfileId={profile?.id || null} onClose={() => setShowGiftModal(false)} onSendGift={handleSendGift} />}
      {activeGiftAnim && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-float-up text-center">
            <div className="text-7xl mb-2">{activeGiftAnim.emoji}</div>
            <p className="text-white font-semibold text-lg">{activeGiftAnim.sender} → {activeGiftAnim.receiver}</p>
          </div>
        </div>
      )}
    </div>
  );
}
