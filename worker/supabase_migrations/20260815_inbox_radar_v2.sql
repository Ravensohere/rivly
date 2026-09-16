-- Inbox Radar v2:
--   * broader triage categories (order tracking, travel, work, personal, promotions)
--   * per-user category filters so the user picks what surfaces
--   * joinable meetings (conference URL + exact start time)
--
-- Additive only. Widening the CHECK constraint cannot invalidate existing rows.

alter table public.task_suggestions
  add column if not exists meeting_url text,
  add column if not exists starts_at timestamptz;

alter table public.task_suggestions
  drop constraint if exists task_suggestions_category_check;

alter table public.task_suggestions
  add constraint task_suggestions_category_check
  check (category in (
    'deadline', 'bill', 'meeting', 'followup',
    'order', 'travel', 'work', 'personal', 'promotion'
  ));

alter table public.inbox_scan_state
  add column if not exists categories text[]
    not null
    default array['deadline', 'bill', 'meeting', 'followup', 'order', 'travel']::text[];

-- Meetings are surfaced by start time; keep that lookup cheap.
create index if not exists task_suggestions_user_starts_idx
  on public.task_suggestions (user_id, starts_at)
  where status = 'pending';
