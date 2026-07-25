# Hướng dẫn: GitHub Actions → IPA → ESign

Repo này **tách biệt** khỏi web `giaphaos`. Chỉ dùng để build IPA.

```text
GitHub Actions (Mac ảo)  →  GiaPhaOS-esign.ipa  →  ESign ký  →  cài iPhone
```

---

## A. Tạo repo GitHub mới (1 lần)

### 1) Trên GitHub (trình duyệt)

1. Đăng nhập https://github.com  
2. **+** → **New repository**  
3. Repository name: `giaphaos-ios` (hoặc tên bạn muốn)  
4. **Public** (dễ dùng Actions miễn phí) hoặc Private  
5. **Không** tick “Add a README”  
6. **Create repository**

### 2) Trên máy (đã có thư mục project)

```bash
cd /path/to/giaphaos-ios

# nếu chưa có commit:
git init
git branch -M main
git add .
git commit -m "Initial: Gia Phả iOS + ESign workflow"

# thay USER bằng username GitHub của bạn
git remote add origin https://github.com/USER/giaphaos-ios.git
git push -u origin main
```

Nếu GitHub hỏi login: dùng **Personal Access Token** thay mật khẩu  
(Settings → Developer settings → Personal access tokens → `repo` scope).

---

## B. Build IPA

1. Vào repo trên GitHub → tab **Actions**  
2. Bên trái chọn **Build IPA for ESign**  
3. **Run workflow** → (tuỳ chọn) điền:

| Field | Khi nào cần |
|-------|-------------|
| `web_url` | Đổi domain web (mặc định đã đúng) |
| `supabase_url` + `supabase_anon_key` | Muốn widget + thông báo có dữ liệu |
| `bundle_id` | Cert ESign bắt buộc ID khác |

4. Chờ job **màu xanh** (~15–25 phút, lần đầu có thể ~40 phút)  
5. Cuối trang run → **Artifacts** → **GiaPhaOS-esign-ipa** → Download  
6. Giải nén zip artifact → lấy `GiaPhaOS-esign.ipa`

---

## C. Ký & cài bằng ESign

1. Copy `GiaPhaOS-esign.ipa` vào iPhone (AirDrop / Safari / Files / Telegram…)  
2. Mở **ESign** → **Nhập file** IPA  
3. Chọn **chứng chỉ** của bạn  
4. Bundle ID:
   - Mặc định: `com.giaphaos.family`  
   - ESign có thể **đổi** theo cert — OK  
5. Widget (nếu hiện): `….widget` + App Group `group.…`  
   - Cert không hỗ trợ → bỏ qua; **app web vẫn chạy**  
6. **Ký và cài đặt**  
7. Mở app **1 lần** → cho phép thông báo  

---

## D. Build lại khi nào?

- Đổi code native / widget / thông báo  
- Đổi URL web mặc định  
- Thêm Supabase key vào workflow  

**Không** cần build lại chỉ vì sửa nội dung trên web Vercel (app load web live).

---

## Lỗi thường gặp

| Lỗi | Cách xử |
|-----|---------|
| Actions không hiện workflow | Push đủ file `.github/workflows/…`; branch `main` |
| Job đỏ ở `pod install` | **Re-run failed jobs** (mạng) |
| Job đỏ ở `xcodebuild` | Mở log; gửi mình đoạn lỗi cuối |
| ESign không ký được | Đổi Bundle ID; hoặc báo để làm bản **không widget** |
| App trắng | iPhone cần mạng; kiểm tra `web_url` lúc build |
| Widget trống | Thiếu Supabase lúc build / App Group / chưa mở app |

---

## Bảo mật

- **Không** commit file `.p12`, cert, `.env` có key production  
- Supabase anon key: có thể đưa vào **workflow input** (không lưu repo) hoặc GitHub **Secrets** nếu muốn cố định
