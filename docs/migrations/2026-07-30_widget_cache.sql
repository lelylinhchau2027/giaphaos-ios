-- widget_cache: bảng lưu snapshot đã tính sẵn (đã xử lý âm lịch) để widget
-- iOS đọc thẳng qua Supabase REST — không còn phụ thuộc App Group, vì
-- ESign (Apple ID cá nhân) không cấp được App Group entitlement.
-- Chạy trên Supabase SQL Editor (project đang dùng).

CREATE TABLE IF NOT EXISTS public.widget_cache (
  id TEXT PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'Gia Phả OS',
  member_count INTEGER NOT NULL DEFAULT 0,
  events_json TEXT NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_cache ENABLE ROW LEVEL SECURITY;

-- App chỉ dùng anon key (không có auth user) nên các policy dưới đây mở
-- cho anon. An toàn ở quy mô cá nhân: bảng này không chứa gì ngoài số
-- lượng thành viên + danh sách sự kiện sắp tới (không có thông tin riêng
-- tư như số điện thoại/nơi ở).
DROP POLICY IF EXISTS "widget_cache_select_anon" ON public.widget_cache;
CREATE POLICY "widget_cache_select_anon" ON public.widget_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "widget_cache_insert_anon" ON public.widget_cache;
CREATE POLICY "widget_cache_insert_anon" ON public.widget_cache
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "widget_cache_update_anon" ON public.widget_cache;
CREATE POLICY "widget_cache_update_anon" ON public.widget_cache
  FOR UPDATE USING (true);

COMMENT ON TABLE public.widget_cache IS 'Snapshot cho widget iOS đọc qua REST — ghi bởi app (syncWidgetAndNotifications), đọc bởi WidgetKit extension.';
