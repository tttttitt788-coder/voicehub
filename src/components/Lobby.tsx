import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore, isGuest } from "../store/appStore";
import type { Room } from "../types";
import { Mic, Users, Plus, Search, Radio, Edit3, ImagePlus, X } from "lucide-react";

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
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createError, setCreateError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCreateOrEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !profile) return;
    if (isGuest(profile)) { setCreateError("Guests cannot create rooms. Upgrade your account first."); return; }
    setCreating(true);
    setCreateError("");

    const { data: existingRoom } = await supabase
      .from("rooms").select("*").eq("owner_id", profile.id).eq("status", "active").maybeSingle();

    if (existingRoom) {
      const room = existingRoom as Room;
      await supabase.from("rooms").update({
        name: newRoomName.trim(),
        topic: newRoomTopic.trim() || null,
        is_live: true,
        status: "active",
      }).eq("id", room.id);
      setCreating(false); setShowCreate(false); setNewRoomName(""); setNewRoomTopic("");
      setActiveRoomId(room.id); setView("room");
      return;
    }

    const { data: roomData, error: roomError } = await supabase
      .from("rooms").insert({ name: newRoomName.trim(), topic: newRoomTopic.trim() || null, owner_id: profile.id, max_seats: 8, is_live: true, status: "active" }).select().single();
    if (roomError || !roomData) {
      setCreateError(roomError?.code === "23505" ? "You already own a room. Opening it instead." : "Failed to create room.");
      setCreating(false);
      if (roomError?.code === "23505") {
        const { data: myRoom } = await supabase.from("rooms").select("*").eq("owner_id", profile.id).eq("status", "active").maybeSingle();
        if (myRoom) { setShowCreate(false); setActiveRoomId(myRoom.id); setView("room"); }
      }
      return;
    }
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

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setEditName(room.name);
    setEditTopic(room.topic || "");
    setEditImageUrl(room.image_url);
  };

  const handleSaveEdit = async () => {
    if (!editingRoom || !editName.trim()) return;
    await supabase.from("rooms").update({
      name: editName.trim(),
      topic: editTopic.trim() || null,
      image_url: editImageUrl,
    }).eq("id", editingRoom.id);
    setEditingRoom(null);
    fetchRooms();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${profile.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("room-images").upload(fileName, file, { contentType: file.type });
    if (uploadError) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("room-images").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;
    if (editingRoom) {
      await supabase.from("rooms").update({ image_url: publicUrl }).eq("id", editingRoom.id);
      setEditImageUrl(publicUrl);
      fetchRooms();
    }
    setUploading(false);
  };

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) || (r.topic || "").toLowerCase().includes(search.toLowerCase())
  );

  const myRoom = rooms.find((r) => r.owner_id === profile?.id);

  return (
    <div className="pt-6">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice Rooms</h1>
          <p className="text-muted text-sm mt-1">Join a room or create your own</p>
        </div>
        <button onClick={() => {
          if (isGuest(profile)) { setCreateError("Guests cannot create rooms. Upgrade your account first."); return; }
          if (myRoom) { setActiveRoomId(myRoom.id); setView("room"); return; }
          setShowCreate(true);
        }} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />{myRoom ? "Open My Room" : "Create Room"}
        </button>
      </div>

      {createError && (
        <div className="glass-card p-3 mb-4 flex items-center justify-between animate-fade-in">
          <p className="text-error text-sm">{createError}</p>
          <button onClick={() => setCreateError("")} className="btn-ghost"><X className="w-4 h-4" /></button>
        </div>
      )}

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
            <div key={room.id} className="glass-card overflow-hidden text-left hover:border-accent transition-all duration-200 hover:scale-[1.02] group animate-fade-in">
              <div className="relative h-32 bg-bg-elevated overflow-hidden">
                {room.image_url ? (
                  <img src={room.image_url} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center">
                    <Radio className="w-8 h-8 text-muted" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 text-xs font-medium text-success bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />LIVE
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Users className="w-3.5 h-3.5" />{seatCounts[room.id] || 0}/{room.max_seats}
                </div>
                {room.owner_id === profile?.id && (
                  <button onClick={(e) => { e.stopPropagation(); openEditRoom(room); }} className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200" title="Edit room">
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={() => { setActiveRoomId(room.id); setView("room"); }} className="w-full p-4 text-left">
                <h3 className="font-semibold text-white mb-1 group-hover:text-accent transition-colors">{room.name}</h3>
                {room.topic && <p className="text-sm text-muted mb-2 truncate">{room.topic}</p>}
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2"><Mic className="w-3.5 h-3.5" /><span>Voice chat active</span></div>
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">{myRoom ? "Edit Your Room" : "Create New Room"}</h2>
            <form onSubmit={handleCreateOrEditRoom} className="space-y-4">
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

      {editingRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setEditingRoom(null)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Edit Room</h2>
              <button onClick={() => setEditingRoom(null)} className="btn-ghost"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="relative h-32 rounded-xl overflow-hidden bg-bg-elevated border border-border">
                {editImageUrl ? (
                  <img src={editImageUrl} alt="Room cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <ImagePlus className="w-8 h-8" />
                  </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/80 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50">
                  <ImagePlus className="w-3.5 h-3.5" />{uploading ? "Uploading..." : "Change Image"}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Room Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" maxLength={50} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Topic</label>
                <input type="text" value={editTopic} onChange={(e) => setEditTopic(e.target.value)} className="input-field" maxLength={100} />
              </div>
              <button onClick={handleSaveEdit} disabled={!editName.trim()} className="btn-primary w-full disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
