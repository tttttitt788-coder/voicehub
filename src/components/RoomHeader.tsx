import type { Room } from "../types";
import { ArrowLeft, XCircle, Radio } from "lucide-react";

interface Props {
  room: Room;
  onLeave: () => void;
  onEndRoom: () => void;
  isOwner: boolean;
}

export function RoomHeader({ room, onLeave, onEndRoom, isOwner }: Props) {
  return (
    <div className="glass-card overflow-hidden">
      {room.image_url && (
        <div className="relative h-28 sm:h-36 overflow-hidden">
          <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/50 to-transparent" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onLeave} className="btn-ghost" title="Leave room"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{room.name}</h2>
                <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                  <Radio className="w-3 h-3" />LIVE
                </span>
              </div>
              {room.topic && <p className="text-sm text-muted mt-0.5">{room.topic}</p>}
              {room.announcement && (
                <p className="text-sm text-amber-400 mt-1 animate-fade-in">📢 {room.announcement}</p>
              )}
            </div>
          </div>
          {isOwner && (
            <button onClick={onEndRoom} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-error hover:bg-error/10 text-sm font-medium transition-all duration-200">
              <XCircle className="w-4 h-4" />End Room
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
