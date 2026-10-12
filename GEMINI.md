# 🤖 CHỈ DẪN TỰ ĐỘNG CHO TẤT CẢ CÁC AGENT (AUTO-HANDOVER PROTOCOL)

*Tệp tin này được các AI Agent (Antigravity, Cursor, Claude Code, Gemini...) TỰ ĐỘNG NẠP VÀO BỘ NHỚ mỗi khi bắt đầu một phiên làm việc mới.*

---

## ⚡ 1. QUY TẮC BẮT BUỘC KHI BẮT ĐẦU PHIÊN (TỰ ĐỘNG 100%):
1. **Tự động đọc bối cảnh**: Ngay khi nhận được tin nhắn đầu tiên từ người dùng ở phiên mới, bạn **BẮT BUỘC phải tự động đọc file [`docs/HANDOVER.md`](file:///d:/Code/duidui/chinese-vocab/docs/HANDOVER.md)** để nắm toàn bộ tiến độ, các file đã sửa đổi, và việc tiếp theo cần làm.
2. **Tự động kiểm tra Git**: Chạy `git status` để kiểm tra các file đang thay đổi thực tế trên máy.
3. **Không hỏi lại những gì đã có**: Tuyệt đối không yêu cầu người dùng phải giải thích lại kiến trúc hay lịch sử làm việc của phiên trước.

---

## ⚡ 2. QUY TẮC KHI KẾT THÚC PHIÊN HOẶC HOÀN THÀNH TÍNH NĂNG:
- **Tự động cập nhật Handover**: Khi hoàn thành một nhiệm vụ hoặc trước khi kết thúc phiên, bạn phải **TỰ ĐỘNG cập nhật file [`docs/HANDOVER.md`](file:///d:/Code/duidui/chinese-vocab/docs/HANDOVER.md)** (ghi nhận tính năng vừa xong, file vừa sửa, và cập nhật việc tiếp theo) mà không cần người dùng phải nhắc.

---

## 📌 3. NGUYÊN TẮC CỐT LÕI CỦA DỰ ÁN:
- **Mã nguồn**: HTML5, CSS3, JavaScript thuần (Vanilla JS), chạy trực tiếp trên trình duyệt, KHÔNG cài thêm npm/bundler nặng.
- **Cơ chế đồng bộ**: CHỈ sử dụng **Firebase Realtime Database** (cấu hình nằm tại [`firebase-config.js`](file:///d:/Code/duidui/chinese-vocab/firebase-config.js)). Tuyệt đối KHÔNG phục hồi hay tạo lại cơ chế GitHub sync cũ.
- **Tài liệu hướng dẫn**: Xem chi tiết tại [`docs/GUIDE.md`](file:///d:/Code/duidui/chinese-vocab/docs/GUIDE.md).
