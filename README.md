# Gia Phả OS — iOS (ESign)

Repo **độc lập** để build file **`.ipa`** bằng GitHub Actions (không cần Mac), rồi ký cài bằng **ESign** trên iPhone.

Giao diện app = WebView load bản web: [giapha-os.homielab.com](https://giapha-os.homielab.com)

| Tính năng | Mô tả |
|-----------|--------|
| UI | Giống 100% bản web |
| Thông báo | Local: sinh nhật / giỗ / sự kiện |
| Widget | Sự kiện sắp tới (cần App Group + mở app 1 lần) |

---

## Cách dùng (tóm tắt)

### 1. Tạo repo GitHub mới (một lần)

Trên GitHub.com → **New repository** → tên gợi ý: `giaphaos-ios` → **Create** (không tích README).

Trên máy:

```bash
cd giaphaos-ios
git remote add origin https://github.com/<USER>/giaphaos-ios.git
git push -u origin main
```

### 2. Build IPA (mỗi khi cần file mới)

1. GitHub → tab **Actions**
2. **Build IPA for ESign** → **Run workflow**
3. (Tuỳ chọn) điền Supabase URL + anon key
4. Đợi ~15–25 phút
5. **Artifacts** → tải `GiaPhaOS-esign-ipa` → file `GiaPhaOS-esign.ipa`

### 3. Ký bằng ESign

1. Đưa `.ipa` vào iPhone  
2. ESign → Import IPA → chọn chứng chỉ → **Ký & cài**  
3. Mở app 1 lần (cho phép thông báo)

Chi tiết: **[HUONG_DAN_ESIGN.md](./HUONG_DAN_ESIGN.md)**

---

## Cấu hình build (workflow inputs)

| Input | Mặc định |
|-------|----------|
| `web_url` | `https://giapha-os.homielab.com` |
| `bundle_id` | `com.giaphaos.family` |
| `supabase_url` | (trống) |
| `supabase_anon_key` | (trống) |

---

## Dev local (tuỳ chọn, không ra IPA device)

```bash
npm install
cp .env.example .env
npm start
```

---

## License

Private / gia đình — xem `LICENSE`.
