# Gia Phả OS — iOS (native full app)

App **native** React Native / Expo: **đủ tính năng như web** (danh sách, cây gia phả, mindmap, thành viên CRUD, quan hệ, lịch sự kiện âm/dương, danh xưng, thống kê, thứ tự đời, sao lưu), dữ liệu **Supabase**. Widget + thông báo local.

## Tính năng

| Tab / màn | Chức năng |
|-----------|-----------|
| **Gia phả** | Danh sách (lọc/sắp xếp) · Cây · Mindmap · Thêm thành viên |
| **Lịch** | Sinh nhật, giỗ (âm), sự kiện tùy chỉnh (âm/dương, hằng năm/một lần) |
| **Thêm** | Danh xưng · Thống kê · Thứ tự gia phả · Sao lưu · Giới thiệu · Cài đặt |
| Chi tiết TV | Sửa/xóa · quan hệ (cha/mẹ, vợ/chồng, con, dâu/rể) |
| Widget | Sự kiện sắp tới (App Group) |

## Migration bắt buộc

Supabase → SQL Editor:

`docs/migrations/2026-07-25_custom_events_calendar.sql`

## Dev

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_*
npm start
```

## Build IPA

1. **Codemagic** workflow `ipa-esign` (hoặc GitHub Actions nếu bật được)
2. Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. ESign ký → cài iPhone

Hoặc trong app: **Thêm → Cài đặt** → dán URL/key.

## Stack

- Expo 57 + Expo Router
- Supabase JS client
- Widget: `@bacons/apple-targets`
