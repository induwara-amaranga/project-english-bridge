-- Coins (a spendable currency, separate from permanent XP) and streak-freeze
-- inventory. Level is deliberately not a column: it is always derived from
-- xp (ProgressService.levelForXp), so it can never drift from the curve.
alter table progress
  add column coins int not null default 0,
  add column streak_freezes int not null default 0;
