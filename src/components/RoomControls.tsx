import type { Seat } from "../types";
import { Mic, MicOff, PhoneOff, Gift } from "lucide-react";

interface Props {
  isConnected: boolean;
  isMuted: boolean;
  mySeat: Seat | null;
  onToggleMute: () => void;
  onLeave: () => void;
  onShowGifts: () => void;
}

export function RoomControls({ isConnected, isMuted, mySeat, onToggleMute, onLeave, onShowGifts }: Props) {
  const canSpeak = mySeat?.role === "owner" || mySeat?.role === "speaker" || mySeat?.role === "admin";

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-center gap-3">
        {canSpeak && (
          <button onClick={onToggleMute} disabled={!isConnected}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              isMuted ? "bg-error/20 text-error hover:bg-error/30" : "bg-success/20 text-success hover:bg-success/30"}`}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}<span className="text-sm">{isMuted ? "Unmute" : "Mute"}</span>
          </button>
        )}
        <button onClick={onShowGifts} className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-all duration-200 active:scale-95">
          <Gift className="w-5 h-5" /><span className="text-sm">Send Gift</span>
        </button>
        <button onClick={onLeave} className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium bg-error/20 text-error hover:bg-error/30 transition-all duration-200 active:scale-95">
          <PhoneOff className="w-5 h-5" /><span className="text-sm">Leave</span>
        </button>
      </div>
      {!isConnected && <p className="text-center text-xs text-muted mt-3">{canSpeak ? "Connecting to voice..." : "Listening mode — take a seat to speak"}</p>}
    </div>
  );
}
