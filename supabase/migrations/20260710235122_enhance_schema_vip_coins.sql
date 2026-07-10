/*
# Enhanced Schema: Users, Rooms, Mics, Gifts with VIP & Coins

## Overview
Upgrades the existing schema to match the SoulStar/Yalla-style voice chat app requirements.
Adds user identity numbers, levels, coins, VIP status, room status, and admin moderation.

## Changes to existing tables

### profiles (ALTER)
- Add `user_id_num` (int, unique) — 8-digit user ID number
- Add `level` (int, default 1) — user level
- Add `coins` (int, default 0) — virtual currency
- Add `vip` (boolean, default false) — VIP status
- Add `is_banned` (boolean, default false) — moderation ban flag

### rooms (ALTER)
- Add `status` (text, default 'active') — room status: active, suspended, closed

### seats (ALTER)
- Add `role` check constraint to include 'admin' role

## Security
- RLS already enabled on all tables.
- New columns inherit existing policies.
*/

-- Alter profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id_num int UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level int NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins int NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vip boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Auto-generate 8-digit user_id_num for existing rows
DO $$
BEGIN
  UPDATE profiles
  SET user_id_num = (
    10000000 + floor(random() * 89999999)::int
  )
  WHERE user_id_num IS NULL;
END $$;

-- Add a trigger to auto-assign user_id_num on insert
CREATE OR REPLACE FUNCTION assign_user_id_num()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id_num IS NULL THEN
    LOOP
      NEW.user_id_num := 10000000 + floor(random() * 89999999)::int;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM profiles WHERE user_id_num = NEW.user_id_num
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_user_id_num ON profiles;
CREATE TRIGGER trigger_assign_user_id_num
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_id_num();

-- Alter rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed'));

-- Update seats role constraint to include 'admin'
ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_role_check;
ALTER TABLE seats ADD CONSTRAINT seats_role_check CHECK (role IN ('owner', 'speaker', 'listener', 'admin'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_num ON profiles(user_id_num);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status) WHERE status = 'active';
