import { useState } from "react";
import type { Gift, Seat } from "../types";
import { parseAvatar } from "../lib/api";
import { X } from "lucide-react";

interface Props {
  gifts: Gift[];
  seats: Seat[];
  myProfileId: string | null;
  onClose: () => void;
  onSendGift: (receiverId: string, giftId: string) => void;
}

export function GiftModal({ gifts, seats, myProfileId, onClose, onSendGift }: Props) {
  const occupiedSeats = seats.filter((s) => s.occupant_id && s.occupant_id !== myProfileId);
  const [selectedReceiver, setSelectedReceiver] = useState<string | null>(null);
  const [selectedGift, setSelectedGift] = useState<string | null>(null);

  const handleSend = () => {
    if (selectedReceiver && selectedGift) { onSendGift(selectedReceiver, selectedGift); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Send a Gift</h2>
          <button onClick={onClose} className="btn-ghost"><X className="w-5 h-5" /></button>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Choose a recipient</label>
          {occupiedSeats.length === 0 ? <p className="text-muted text-sm">No other participants in the room.</p> : (
            <div className="flex flex-wrap gap-2">
              {occupiedSeats.map((seat) => {
                const avatar = parseAvatar(seat.profile?.avatar_url || null);
                return (
                  <button key={seat.id} onClick={() => setSelectedReceiver(seat.occupant_id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${selectedReceiver === seat.occupant_id ? "border-accent bg-accent/10" : "border-border bg-bg-elevated hover:bg-bg-hover"}`}>
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-sm`}>{avatar.emoji}</div>
                    <span className="text-sm text-zinc-200">{seat.profile?.nickname}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Choose a gift</label>
          <div className="grid grid-cols-4 gap-2">
            {gifts.map((gift) => (
              <button key={gift.id} onClick={() => setSelectedGift(gift.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 ${selectedGift === gift.id ? "border-accent bg-accent/10 scale-105" : "border-border bg-bg-elevated hover:bg-bg-hover"}`}>
                <span className="text-3xl">{gift.icon_url}</span><span className="text-xs text-zinc-300">{gift.name}</span><span className="text-xs text-amber-400 font-medium">{gift.price}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSend} disabled={!selectedReceiver || !selectedGift} className="btn-primary w-full disabled:opacity-50">Send Gift</button>
      </div>
    </div>
  );
}
