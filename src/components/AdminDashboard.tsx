import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/appStore";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import type { Room, Profile, GiftTransaction, Gift as GiftType } from "../types";
import { parseAvatar } from "../lib/api";
import { Users, Radio, Trash2, Eye, TrendingUp, Gift, Activity, Search, Ban, Crown, Coins, Edit3, X, LogOut, KeyRound, Power } from "lucide-react";

export function AdminDashboard() {
  const { setView, setActiveRoomId, adminToken, setAdminToken } = useAppStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<any[]>([]);
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setLocalView] = useState<"overview" | "rooms" | "users" | "gifts">("overview");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editCoins, setEditCoins] = useState(0);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: roomData } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
    if (roomData) setRooms(roomData as Room[]);
    const { data: profileData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (profileData) setProfiles(profileData as Profile[]);
    const { data: giftTxData } = await supabase.from("gift_transactions").select("*, gift:gifts(*)").order("created_at", { ascending: false }).limit(50);
    if (giftTxData) setGiftTransactions(giftTxData);
    const { data: giftData } = await supabase.from("gifts").select("*");
    if (giftData) setGifts(giftData as GiftType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleEndRoom = async (roomId: string) => {
    await supabase.from("rooms").update({ is_live: false, status: "closed" }).eq("id", roomId);
    await supabase.from("seats").update({ occupant_id: null, role: "listener", is_muted: false }).eq("room_id", roomId);
    fetchData();
  };

  const handleSuspendRoom = async (roomId: string) => {
    await supabase.from("rooms").update({ status: "suspended" }).eq("id", roomId);
    fetchData();
  };

  const handleActivateRoom = async (roomId: string) => {
    await supabase.from("rooms").update({ status: "active", is_live: true }).eq("id", roomId);
    fetchData();
  };

  const handleDeleteRoom = async (roomId: string) => {
    await supabase.from("seats").delete().eq("room_id", roomId);
    await supabase.from("messages").delete().eq("room_id", roomId);
    await supabase.from("rooms").delete().eq("id", roomId);
    fetchData();
  };

  const handleRenameRoom = async () => {
    if (!editingRoom || !editRoomName.trim()) return;
    await supabase.from("rooms").update({ name: editRoomName.trim() }).eq("id", editingRoom.id);
    setEditingRoom(null); setEditRoomName("");
    fetchData();
  };

  const handleBanUser = async (profileId: string) => {
    await supabase.from("profiles").update({ is_banned: true }).eq("id", profileId);
    fetchData();
  };

  const handleUnbanUser = async (profileId: string) => {
    await supabase.from("profiles").update({ is_banned: false }).eq("id", profileId);
    fetchData();
  };

  const handleToggleVip = async (profileId: string, currentVip: boolean) => {
    await supabase.from("profiles").update({ vip: !currentVip }).eq("id", profileId);
    fetchData();
  };

  const handleUpdateCoins = async () => {
    if (!editingUser) return;
    await supabase.from("profiles").update({ coins: editCoins }).eq("id", editingUser.id);
    setEditingUser(null);
    fetchData();
  };

  const handleDeleteProfile = async (profileId: string) => {
    await supabase.from("profiles").delete().eq("id", profileId);
    fetchData();
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("voicehub_admin_token");
    setAdminToken(null);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    setChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess(false);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ action: "change_password", new_password: newPassword, token: adminToken }),
      });
      const data = await response.json();
      if (data.error) { setPasswordError(data.error); }
      else { setPasswordSuccess(true); setNewPassword(""); setShowChangePassword(false); }
    } catch { setPasswordError("Network error"); }
    setChangingPassword(false);
  };

  const liveRooms = rooms.filter((r) => r.is_live && r.status === "active");
  const totalGiftValue = giftTransactions.reduce((sum, tx) => sum + (tx.gift?.price || 0), 0);
  const filteredRooms = rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || (r.topic || "").toLowerCase().includes(search.toLowerCase()));
  const filteredProfiles = profiles.filter((p) => p.nickname.toLowerCase().includes(search.toLowerCase()) || String(p.user_id_num || "").includes(search));

  if (loading) return <div className="pt-20 flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Activity },
    { id: "rooms" as const, label: "Rooms", icon: Radio },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "gifts" as const, label: "Gifts", icon: Gift },
  ];

  return (
    <div className="pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-muted text-sm mt-1">Monitor and manage your voice chat platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowChangePassword(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <KeyRound className="w-4 h-4" /> Change Password
          </button>
          <button onClick={handleAdminLogout} className="btn-secondary flex items-center gap-2 text-sm text-warning">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Radio} label="Live Rooms" value={liveRooms.length} color="text-success" bg="bg-success/10" />
        <StatCard icon={Users} label="Total Users" value={profiles.length} color="text-accent" bg="bg-accent/10" />
        <StatCard icon={Gift} label="Gifts Sent" value={giftTransactions.length} color="text-amber-400" bg="bg-amber-400/10" />
        <StatCard icon={TrendingUp} label="Gift Value" value={totalGiftValue} color="text-pink-400" bg="bg-pink-400/10" />
      </div>

      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setLocalView(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${view === id ? "border-accent text-white" : "border-transparent text-muted hover:text-zinc-300"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {view !== "overview" && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${view}...`} className="input-field pl-10" />
        </div>
      )}

      {view === "overview" && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3">Live Rooms</h3>
            {liveRooms.length === 0 ? <p className="text-muted text-sm">No live rooms right now.</p> : (
              <div className="space-y-2">
                {liveRooms.slice(0, 5).map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated">
                    <div><p className="text-sm font-medium text-white">{room.name}</p><p className="text-xs text-muted">{room.topic || "No topic"}</p></div>
                    <span className="text-xs text-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3">Recent Gift Activity</h3>
            {giftTransactions.length === 0 ? <p className="text-muted text-sm">No gifts sent yet.</p> : (
              <div className="space-y-2">
                {giftTransactions.slice(0, 10).map((tx) => {
                  const gift = tx.gift as GiftType | undefined;
                  const sender = profiles.find((p) => p.id === tx.sender_id);
                  const receiver = profiles.find((p) => p.id === tx.receiver_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated">
                      <span className="text-2xl">{gift?.icon_url || "🎁"}</span>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-200"><span className="font-medium">{sender?.nickname || "Unknown"}</span>{" → "}<span className="font-medium">{receiver?.nickname || "Unknown"}</span></p>
                        <p className="text-xs text-muted">{gift?.name} • {gift?.price} points</p>
                      </div>
                      <span className="text-xs text-muted">{new Date(tx.created_at).toLocaleTimeString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {view === "rooms" && (
        <div className="space-y-2 animate-fade-in">
          {filteredRooms.length === 0 ? <p className="text-muted text-sm text-center py-8">No rooms found.</p> : filteredRooms.map((room) => (
            <div key={room.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${room.is_live && room.status === "active" ? "bg-success animate-pulse" : room.status === "suspended" ? "bg-warning" : "bg-muted"}`} />
                <div>
                  <p className="font-medium text-white">{room.name}</p>
                  <p className="text-xs text-muted">{room.topic || "No topic"} • {room.status} • {new Date(room.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setActiveRoomId(room.id); setView("room"); }} className="btn-ghost" title="View room"><Eye className="w-4 h-4" /></button>
                <button onClick={() => { setEditingRoom(room); setEditRoomName(room.name); }} className="btn-ghost" title="Rename room"><Edit3 className="w-4 h-4" /></button>
                {room.status === "active" && <button onClick={() => handleSuspendRoom(room.id)} className="btn-ghost text-warning" title="Suspend room"><Power className="w-4 h-4" /></button>}
                {room.status === "suspended" && <button onClick={() => handleActivateRoom(room.id)} className="btn-ghost text-success" title="Activate room"><Power className="w-4 h-4" /></button>}
                {room.is_live && <button onClick={() => handleEndRoom(room.id)} className="btn-ghost text-warning" title="End room"><Radio className="w-4 h-4" /></button>}
                <button onClick={() => handleDeleteRoom(room.id)} className="btn-ghost text-error" title="Delete room"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "users" && (
        <div className="space-y-2 animate-fade-in">
          {filteredProfiles.length === 0 ? <p className="text-muted text-sm text-center py-8">No users found.</p> : filteredProfiles.map((p) => {
            const avatar = parseAvatar(p.avatar_url);
            return (
              <div key={p.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-lg`}>{avatar.emoji}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{p.nickname}</p>
                      {p.vip && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      {p.is_banned && <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded-full">Banned</span>}
                      {p.is_guest && <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">Guest</span>}
                    </div>
                    <p className="text-xs text-muted">ID: {p.user_id_num || "N/A"} • Level {p.level} • {p.coins} coins</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingUser(p); setEditCoins(p.coins); }} className="btn-ghost text-amber-400" title="Edit coins"><Coins className="w-4 h-4" /></button>
                  <button onClick={() => handleToggleVip(p.id, p.vip)} className={`btn-ghost ${p.vip ? "text-amber-400" : "text-muted"}`} title="Toggle VIP"><Crown className="w-4 h-4" /></button>
                  <button onClick={() => p.is_banned ? handleUnbanUser(p.id) : handleBanUser(p.id)} className={`btn-ghost ${p.is_banned ? "text-success" : "text-error"}`} title={p.is_banned ? "Unban" : "Ban"}><Ban className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteProfile(p.id)} className="btn-ghost text-error" title="Delete user"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "gifts" && (
        <div className="animate-fade-in">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4">Gift Catalog</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {gifts.map((gift) => {
                const sentCount = giftTransactions.filter((tx) => tx.gift_id === gift.id).length;
                return (
                  <div key={gift.id} className="p-4 rounded-xl bg-bg-elevated text-center">
                    <div className="text-4xl mb-2">{gift.icon_url}</div>
                    <p className="text-sm font-medium text-white">{gift.name}</p>
                    <p className="text-xs text-amber-400 font-medium mt-1">{gift.price} points</p>
                    <p className="text-xs text-muted mt-1">{sentCount} sent</p>
                  </div>
                );
              })}
            </div>
          </div>
          {giftTransactions.length > 0 && (
            <div className="glass-card p-5 mt-4">
              <h3 className="font-semibold text-white mb-3">All Gift Transactions</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {giftTransactions.map((tx) => {
                  const gift = tx.gift as GiftType | undefined;
                  const sender = profiles.find((p) => p.id === tx.sender_id);
                  const receiver = profiles.find((p) => p.id === tx.receiver_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated">
                      <span className="text-2xl">{gift?.icon_url || "🎁"}</span>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-200"><span className="font-medium">{sender?.nickname || "Unknown"}</span>{" → "}<span className="font-medium">{receiver?.nickname || "Unknown"}</span></p>
                        <p className="text-xs text-muted">{gift?.name} • {gift?.price} points</p>
                      </div>
                      <span className="text-xs text-muted">{new Date(tx.created_at).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {editingRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setEditingRoom(null)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">Rename Room</h2><button onClick={() => setEditingRoom(null)} className="btn-ghost"><X className="w-5 h-5" /></button></div>
            <input type="text" value={editRoomName} onChange={(e) => setEditRoomName(e.target.value)} className="input-field mb-4" autoFocus />
            <button onClick={handleRenameRoom} disabled={!editRoomName.trim()} className="btn-primary w-full disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setEditingUser(null)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">Edit Coins — {editingUser.nickname}</h2><button onClick={() => setEditingUser(null)} className="btn-ghost"><X className="w-5 h-5" /></button></div>
            <div className="flex items-center gap-2 mb-4">
              <input type="number" value={editCoins} onChange={(e) => setEditCoins(parseInt(e.target.value) || 0)} className="input-field" />
              <button onClick={() => setEditCoins(editCoins + 100)} className="btn-secondary !px-3">+100</button>
              <button onClick={() => setEditCoins(editCoins + 500)} className="btn-secondary !px-3">+500</button>
            </div>
            <button onClick={handleUpdateCoins} className="btn-primary w-full">Save</button>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => { setShowChangePassword(false); setPasswordError(""); setNewPassword(""); }}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Change Admin Password</h2>
              <button onClick={() => { setShowChangePassword(false); setPasswordError(""); setNewPassword(""); }} className="btn-ghost"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" className="input-field" autoFocus />
              </div>
              {passwordError && <p className="text-error text-sm">{passwordError}</p>}
              <button onClick={handleChangePassword} disabled={changingPassword} className="btn-primary w-full disabled:opacity-50">
                {changingPassword ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="glass-card p-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-2`}><Icon className={`w-5 h-5 ${color}`} /></div>
      <p className="text-2xl font-bold text-white">{value}</p><p className="text-xs text-muted">{label}</p>
    </div>
  );
}
