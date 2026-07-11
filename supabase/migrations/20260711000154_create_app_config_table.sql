/*
# LiveKit Configuration Table

## Overview
Stores LiveKit connection credentials so the edge function can read them at runtime
without hardcoding secrets in source code.

## New Tables
- `app_config`: key-value store for application secrets/config
  - `key` (text, primary key) — config key name
  - `value` (text) — config value
  - `created_at` (timestamptz)

## Security
- RLS enabled. Only service role can read/write (edge function uses service role key).
- No anon/authenticated policies — the table is inaccessible from the frontend.
*/

CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
