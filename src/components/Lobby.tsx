import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/appStore";
import type { Room } from "../types";
import { Mic, Users, Plus, Search, Radio, Crown } from "lucide-react";

export function Lobby() {
  const { setView, setActiveRoomId, profile } = useAppStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms").select("*").eq("is_live", true).eq("status", "active").order("created_at", { ascending: false });
    if (!error && data) {
      setRooms(data as Room[]);
      const counts: Record<string, number> = {};
      for (const room of data) {
        const { count } = await supabase
          .from("seats").select("id", { count: "exact", head: true })
          .eq("room_id", room.id).not("occupant_id", "is", null);
        counts[room.id] = count || 0;
      }
      setSeatCounts(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !profile) return;
    setCreating(true);
    const { data: roomData, error: roomError } = await supabase
      .from("rooms").insert({ name: newRoomName.trim(), topic: newRoomTopic.trim() || null, owner_id: profile.id, max_seats: 8, is_live: true, status: "active" }).select().single();
    if (roomError || !roomData) { setCreating(false); return; }
    const room = roomData as Room;
    const seats = Array.from({ length: 8 }, (_, i) => ({
      room_id: room.id, seat_number: i, role: i === 0 ? "owner" : "listener", is_muted: false, is_locked: false,
      occupant_id: i === 0 ? profile.id : null,
    }));
    await supabase.from("seats").insert(seats);
    await supabase.from("messages").insert({ room_id: room.id, sender_id: profile.id, content: `${profile.nickname} created the room`, type: "system" });
    setCreating(false); setShowCreate(false); setNewRoomName(""); setNewRoomTopic("");
    setActiveRoomId(room.id); setView("room");
  };

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) || (r.topic || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice Rooms</h1>
          <p className="text-muted text-sm mt-1">Join a room or create your own</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />Create Room
        </button>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rooms..." className="input-field pl-10" />
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-40 animate-pulse">
              <div className="h-4 bg-bg-hover rounded w-2/3 mb-3" /><div className="h-3 bg-bg-hover rounded w-1/2 mb-2" /><div className="h-3 bg-bg-hover rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-20"><Radio className="w-12 h-12 text-muted mx-auto mb-4" /><p className="text-zinc-400">No rooms found. Create one to get started!</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <button key={room.id} onClick={() => { setActiveRoomId(room.id); setView("room"); }}
              className="glass-card p-5 text-left hover:border-accent transition-all duration-200 hover:scale-[1.02] group animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />LIVE
                </span>
                <span className="flex items-center gap-1 text-xs text-muted"><Users className="w-3.5 h-3.5" />{seatCounts[room.id] || 0}/{room.max_seats}</span>
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-accent transition-colors">{room.name}</h3>
              {room.topic && <p className="text-sm text-muted mb-2">{room.topic}</p>}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-3"><Mic className="w-3.5 h-3.5" /><span>Voice chat active</span></div>
            </button>
          ))}
        </div>
      )}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Room Name</label>
                <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="My awesome room" className="input-field" maxLength={50} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Topic (optional)</label>
                <input type="text" value={newRoomTopic} onChange={(e) => setNewRoomTopic(e.target.value)} placeholder="What's this room about?" className="input-field" maxLength={100} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? "Creating..." : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
