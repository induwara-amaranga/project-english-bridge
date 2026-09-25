-- Email-based 2FA for admin accounts. Only ever populated for role = ADMIN
-- (see AuthService.finishSignIn) — a student/parent row's otp_* columns stay
-- null forever.
--
-- otp_email is a delivery address distinct from the login email: the seeded
-- first admin's login email (ENGLISHER_ADMIN_EMAIL) defaults to a fake
-- address that cannot receive mail, so it needs its own real inbox to send
-- codes to. Falls back to the login email when null (see
-- UserEntity.getOtpDeliveryEmail).
alter table users add column otp_email text;
alter table users add column otp_code_hash text;
alter table users add column otp_challenge_id text;
alter table users add column otp_expires_at timestamptz;
alter table users add column otp_attempts int not null default 0;

-- verify-otp looks a pending challenge up by id alone (the frontend never
-- holds the account's email through this step) — the partial index only
-- covers rows with an active challenge, which is the ones ever queried this way.
create unique index users_otp_challenge_idx on users (otp_challenge_id) where otp_challenge_id is not null;
