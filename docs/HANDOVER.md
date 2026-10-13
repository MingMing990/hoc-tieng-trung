# 📋 NHẬT KÝ BÀN GIAO PHIÊN LÀM VIỆC (HANDOVER PROTOCOL)

*Tài liệu này dùng để bàn giao bối cảnh dự án cho Agent tiếp theo khi Agent cũ hết token hoặc khi mở phiên chat mới.*

---

## 1. 🎯 Tổng Quan Dự Án & Kiến Trúc Hiện Tại
- **Tên ứng dụng**: 华语 VocabMaster - Học Từ Vựng Tiếng Trung Thông Minh.
- **Công nghệ**: HTML5, CSS3, JavaScript thuần (Vanilla JS), không dùng thư viện bundler (không npm/Vite).
- **Cơ chế lưu trữ & đồng bộ**:
  - Lưu cục bộ: `localStorage`.
  - Đồng bộ Cloud thời gian thực: **Firebase Realtime Database** (`asia-southeast1`).
  - **ĐÃ LOẠI BỎ**: Toàn bộ tính năng GitHub PAT Sync cũ (đã xóa code và modal thừa).

---

## 2. 📁 Các File Quan Trọng & Trạng Thái
| File | Vai trò & Thay đổi gần nhất |
| :--- | :--- |
| [`firebase-config.js`](file:///d:/Code/duidui/chinese-vocab/firebase-config.js) | Chứa `window.FIREBASE_CONFIG` của dự án Firebase `chinese-vocab-7d7c3`. Kết nối tự động ngầm. |
| [`app.js`](file:///d:/Code/duidui/chinese-vocab/app.js) | Logic chính: Đã thêm `pushToFirebase()` (debounce 400ms) và listener `ref.on('value')`. Đã xóa sạch code GitHub sync. |
| [`index.html`](file:///d:/Code/duidui/chinese-vocab/index.html) | Giao diện: Đã nhúng Firebase Compat SDK và `firebase-config.js`. Đã bỏ nút 🔥 và modal thừa trên header. |
| [`styles.css`](file:///d:/Code/duidui/chinese-vocab/styles.css) | Đã dọn dẹp các CSS thừa của GitHub và Firebase status msg. |
| [`vocab.json`](file:///d:/Code/duidui/chinese-vocab/vocab.json) | File backup dữ liệu (đã có sẵn các từ mới: 梦想, 快乐, 加油...). Không bắt buộc cho việc chạy app. |
| [`docs/GUIDE.md`](file:///d:/Code/duidui/chinese-vocab/docs/GUIDE.md) | Cẩm nang hướng dẫn tổng hợp: Kiến trúc Firebase, setup, prompt 5 bước, cơ chế auto-handover và mở rộng sau này. |
| [`CLAUDE.md`](file:///d:/Code/duidui/chinese-vocab/CLAUDE.md) / [`GEMINI.md`](file:///d:/Code/duidui/chinese-vocab/GEMINI.md) / [`AGENTS.md`](file:///d:/Code/duidui/chinese-vocab/AGENTS.md) | Tệp tin cấu hình tự động cho AI (Claude, Gemini, Cursor) tự nạp `docs/HANDOVER.md` khi bắt đầu phiên mới. |
| [`pinyin-pro.min.js`](file:///e:/WORK/Projects/VibeCode/HocTiengTrung/pinyin-pro.min.js) | Thư viện chuyển đổi Hán tự sang Pinyin chuẩn có thanh điệu ngoại tuyến (offline). |
| [`docs/HANDOVER.md`](file:///e:/WORK/Projects/VibeCode/HocTiengTrung/docs/HANDOVER.md) | Nhật ký bàn giao tiến độ thực tế giữa các Agent. |
| [`.gitignore`](file:///e:/WORK/Projects/VibeCode/HocTiengTrung/.gitignore) | Đã tạo sẵn template để sau này ẩn `firebase-config.js` nếu muốn. |

---

## 3. 🔑 Thông Tin Môi Trường & Kiểm Thử
- **Thay đổi mới nhất (2026-10-13)**:
  - **Xóa tính năng câu ví dụ**: Đã loại bỏ hoàn toàn các trường và hộp hiển thị câu ví dụ ở Thẻ ôn tập (Review card), Kho từ vựng (Vocab Bank card), Form thêm từ mới và Modal chỉnh sửa nhanh.
  - **Tự động điền Pinyin từ Hán tự**: Tích hợp thư viện `pinyin-pro` hoạt động mượt mà khi người dùng gõ hoặc dán chữ Hán vào ô Hán tự, Pinyin sẽ tự sinh ra với thanh điệu chuẩn. Ô Pinyin vẫn là input bình thường, cho phép tự do sửa đổi thủ công bất kỳ lúc nào.
- **Tình trạng kiểm thử**: Chức năng kiểm tra đồng bộ, code sạch sẽ, không có lỗi xung đột.

---

## 4. 🚀 Danh Sách Việc Tiếp Theo Cần Làm (Next Tasks)
1. **Bảo mật & Deploy**: Khi chuyển sang Private Repo, có thể cấu hình deploy (GitHub Pages / Vercel / Cloudflare Pages).
2. **Phát triển tính năng mới**: (Tùy chọn) Phân loại từ vựng theo cấp độ HSK 1 - HSK 6, tính năng âm thanh tự động, thống kê số ngày học liên tục (Streak).
