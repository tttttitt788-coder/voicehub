export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  user_id_num: number | null;
  level: number;
  coins: number;
  vip: boolean;
  is_banned: boolean;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  topic: string | null;
  owner_id: string | null;
  max_seats: number;
  is_live: boolean;
  created_at: string;
  status: "active" | "suspended" | "closed";
}

export interface Seat {
  id: string;
  room_id: string;
  seat_number: number;
  occupant_id: string | null;
  role: "owner" | "speaker" | "listener" | "admin";
  is_muted: boolean;
  is_locked: boolean;
  profile?: Profile | null;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string | null;
  content: string;
  type: "text" | "system" | "gift";
  gift_id: string | null;
  created_at: string;
  profile?: Profile | null;
}

export interface Gift {
  id: string;
  name: string;
  icon_url: string | null;
  price: number;
  animation_url: string | null;
  created_at: string;
}

export interface GiftTransaction {
  id: string;
  room_id: string;
  sender_id: string | null;
  receiver_id: string | null;
  gift_id: string;
  created_at: string;
}

export type View = "lobby" | "room" | "admin";
