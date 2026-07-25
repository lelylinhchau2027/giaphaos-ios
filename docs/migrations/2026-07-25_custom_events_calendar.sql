-- custom_events: lịch âm/dương + sự kiện một lần / hằng năm
-- Chạy trên Supabase SQL Editor (project đang dùng).

ALTER TABLE public.custom_events
  ADD COLUMN IF NOT EXISTS calendar_type TEXT NOT NULL DEFAULT 'solar';

ALTER TABLE public.custom_events
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'custom_events_calendar_type_check'
  ) THEN
    ALTER TABLE public.custom_events
      ADD CONSTRAINT custom_events_calendar_type_check
      CHECK (calendar_type IN ('solar', 'lunar'));
  END IF;
END $$;

COMMENT ON COLUMN public.custom_events.calendar_type IS 'solar = dương lịch, lunar = âm lịch';
COMMENT ON COLUMN public.custom_events.is_recurring IS 'true = hằng năm; false = một lần (cần event_year)';
