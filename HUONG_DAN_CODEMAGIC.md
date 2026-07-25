# Build IPA bằng Codemagic (khi GitHub Actions bị chặn)

Dùng khi GitHub báo: **"Unable to enable Actions for this repository."**

```text
Codemagic (Mac cloud) → GiaPhaOS-esign.ipa → ESign ký → cài
```

## 1. Đẩy code lên GitHub (vẫn cần repo, chỉ không dùng Actions)

Repo code vẫn trên GitHub bình thường — chỉ **không bật Actions**.

## 2. Đăng ký Codemagic

1. Vào https://codemagic.io  
2. **Sign up with GitHub** → cho phép truy cập repo `giaphaos-ios`  
3. **Add application** → chọn `giaphaos-ios`  
4. Project type: **React Native** / hoặc **Other**

## 3. Chạy build

1. Tab **codemagic.yaml** (file đã có sẵn trong repo)  
2. Workflow: **`ipa-esign`**  
3. (Tuỳ chọn) **Environment variables**:

| Variable | Ví dụ |
|----------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `EXPO_PUBLIC_WEB_URL` | `https://giapha-os.homielab.com` |

4. **Start new build**  
5. Xong → tải artifact **`GiaPhaOS-esign.ipa`**  
6. ESign ký như bình thường  

## Gói miễn phí

Codemagic có **phút build Mac miễn phí** hàng tháng (đủ vài lần build app nhỏ).  
Không cần thẻ nếu còn free quota; hết quota thì đợi tháng sau hoặc nạp.

## So với GitHub Actions

| | GitHub Actions | Codemagic |
|--|----------------|-----------|
| Cần Mac nhà | Không | Không |
| Cần bật Actions | **Có** (bạn bị chặn) | **Không** |
| Ký ESign | Unsigned IPA | Unsigned IPA |
