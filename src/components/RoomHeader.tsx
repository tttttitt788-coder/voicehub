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
    <div className="glass-card p-5">
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
          </div>
        </div>
        {isOwner && (
          <button onClick={onEndRoom} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-error hover:bg-error/10 text-sm font-medium transition-all duration-200">
            <XCircle className="w-4 h-4" />End Room
          </button>
        )}
      </div>
    </div>
  );
}
