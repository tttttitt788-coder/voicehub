import type { Seat } from "../types";
import { parseAvatar, getVipBadge } from "../lib/api";
import { Mic, MicOff, Crown, Lock, Plus, UserX, LockOpen, Star, Shield } from "lucide-react";
import type { Participant } from "livekit-client";

interface Props {
  seats: Seat[];
  mySeat: Seat | null;
  isOwner: boolean;
  profileId: string | null;
  onTakeSeat: (seat: Seat) => void;
  onLeaveSeat: () => void;
  onKick: (seat: Seat) => void;
  onToggleLock: (seat: Seat) => void;
  participants: Map<string, Participant>;
}

export function SeatGrid({ seats, mySeat, isOwner, profileId, onTakeSeat, onLeaveSeat, onKick, onToggleLock, participants }: Props) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Speakers & Listeners</h3>
        <span className="text-xs text-muted">{seats.filter((s) => s.occupant_id).length} / {seats.length} seats</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {seats.map((seat) => {
          const isOccupied = !!seat.occupant_id;
          const isMySeat = mySeat?.id === seat.id;
          const avatar = parseAvatar(seat.profile?.avatar_url || null);
          const isSpeaking = isOccupied && participants.has(seat.occupant_id!) && !seat.is_muted;
          const vipBadge = seat.profile ? getVipBadge(seat.profile.vip, seat.profile.level) : null;

          return (
            <div key={seat.id}
              className={`relative rounded-2xl p-4 border transition-all duration-200 ${
                isMySeat ? "border-accent bg-accent/10" :
                isOccupied ? "border-border bg-bg-elevated" :
                seat.is_locked ? "border-border bg-bg-surface opacity-50" :
                "border-border bg-bg-surface hover:border-accent/50 cursor-pointer"
              }`}
              onClick={() => { if (!isOccupied && !seat.is_locked && !isMySeat) onTakeSeat(seat); }}>
              {isSpeaking && <span className="absolute inset-0 rounded-2xl ring-2 ring-success/50 animate-pulse-ring pointer-events-none" />}
              {isOccupied ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-2xl shadow-lg`}>{avatar.emoji}</div>
                    {seat.role === "owner" && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-md"><Crown className="w-3 h-3 text-white" /></div>}
                    {seat.role === "admin" && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md"><Shield className="w-3 h-3 text-white" /></div>}
                    <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md ${seat.is_muted ? "bg-error" : "bg-success"}`}>
                      {seat.is_muted ? <MicOff className="w-3 h-3 text-white" /> : <Mic className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white truncate max-w-[100px]">{seat.profile?.nickname || "Unknown"}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <p className="text-xs text-muted capitalize">{seat.role}</p>
                      {vipBadge && <span className="text-xs text-amber-400 font-medium">{vipBadge}</span>}
                    </div>
                  </div>
                  {isMySeat && <button onClick={(e) => { e.stopPropagation(); onLeaveSeat(); }} className="text-xs text-error hover:text-red-400 mt-1">Leave seat</button>}
                  {isOwner && !isMySeat && seat.role !== "owner" && (
                    <button onClick={(e) => { e.stopPropagation(); onKick(seat); }} className="text-xs text-error hover:text-red-400 mt-1 flex items-center gap-1"><UserX className="w-3 h-3" />Remove</button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  {seat.is_locked ? (
                    <><div className="w-14 h-14 rounded-full bg-bg-hover flex items-center justify-center"><Lock className="w-5 h-5 text-muted" /></div><p className="text-xs text-muted">Locked</p></>
                  ) : (
                    <><div className="w-14 h-14 rounded-full bg-bg-hover flex items-center justify-center group-hover:bg-accent/20 transition-colors"><Plus className="w-5 h-5 text-muted group-hover:text-accent transition-colors" /></div><p className="text-xs text-muted group-hover:text-accent transition-colors">Seat {seat.seat_number + 1}</p></>
                  )}
                  {isOwner && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleLock(seat); }} className="text-xs text-muted hover:text-accent mt-1 flex items-center gap-1">
                      {seat.is_locked ? <><LockOpen className="w-3 h-3" />Unlock</> : <><Lock className="w-3 h-3" />Lock</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
