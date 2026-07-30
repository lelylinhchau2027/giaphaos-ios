-- Thêm cột facebook_url vào person_details_private để lưu link Facebook
-- của từng thành viên (hiển thị nút "Facebook" ở trang chi tiết thành viên).
-- Chạy trên Supabase SQL Editor (project đang dùng).

ALTER TABLE public.person_details_private
  ADD COLUMN IF NOT EXISTS facebook_url TEXT;
