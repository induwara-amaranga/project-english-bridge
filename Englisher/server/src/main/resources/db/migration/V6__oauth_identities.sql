-- Google / Facebook sign-in. An OAuth-only account has no password, so
-- password_hash can no longer be not-null; Google/Facebook subject ids are
-- opaque strings, unique per provider, and nullable because most rows will
-- only ever populate one (or neither).
alter table users
  alter column password_hash drop not null,
  add column google_id text,
  add column facebook_id text;

create unique index users_google_id_key on users (google_id) where google_id is not null;
create unique index users_facebook_id_key on users (facebook_id) where facebook_id is not null;
