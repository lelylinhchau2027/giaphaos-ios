# Gia Phả OS — iOS (native + Supabase)

App **native** (React Native / Expo): giao diện do IPA vẽ, **dữ liệu chỉ từ Supabase** (không phụ thuộc WebView).

| Tab | Chức năng |
|-----|-----------|
| Trang chủ | Tổng quan + sự kiện 30 ngày tới |
| Lịch | Sinh nhật, giỗ (âm), sự kiện tùy chỉnh — thêm **âm/dương**, **hằng năm / một lần** |
| Thành viên | Danh sách + chi tiết quan hệ |
| Cài đặt | Supabase URL / anon key / tên site |

Widget + thông báo local vẫn sync từ cùng Supabase.

---

## Migration bắt buộc (sự kiện âm lịch)

Trên **Supabase → SQL Editor**, chạy:

`docs/migrations/2026-07-25_custom_events_calendar.sql`

Thêm cột:

- `calendar_type`: `solar` | `lunar`
- `is_recurring`: `true` (hằng năm) / `false` (một lần + `event_year`)

---

## Build IPA (GitHub Actions)

1. **Actions** → **Build IPA for ESign** → **Run workflow**
2. Điền **bắt buộc**:
   - `supabase_url` = project của bạn  
   - `supabase_anon_key` = anon key  
3. `web_url` không còn dùng cho UI (có thể để mặc định)
4. Tải artifact → ESign trên iPhone

Hoặc sau khi cài app: **Cài đặt** → dán Supabase URL/key → Lưu.

---

## Dev local

```bash
npm install
cp .env.example .env   # điền EXPO_PUBLIC_SUPABASE_*
npm start
```

---

## Web (repo giaphaos)

Form “Thêm sự kiện” trên web cũng hỗ trợ âm lịch + một lần/hằng năm (cùng schema).
