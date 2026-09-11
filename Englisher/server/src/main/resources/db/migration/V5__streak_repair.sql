-- Tracks the most recent streak a learner lost to an unfrozen gap, so the
-- client can offer a one-time paid repair instead of the loss being final.
alter table progress
  add column last_broken_streak int not null default 0,
  add column streak_broken_at timestamp null;
