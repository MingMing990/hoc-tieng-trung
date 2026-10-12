# 📖 CẨM NANG DỰ ÁN & HƯỚNG DẪN ĐỒNG BỘ, PROMPT AI (PROJECT GUIDE)

Tài liệu này là cẩm nang hướng dẫn tổng hợp của dự án **华语 VocabMaster**, bao gồm kiến trúc kỹ thuật, quy trình thiết lập đồng bộ đám mây, bộ khung câu lệnh (Prompt) chuẩn, cơ chế tự động bàn giao công việc giữa các AI Agent (Claude, Gemini, Antigravity...) và các chỉ dẫn mở rộng trong tương lai.

---

## 📑 MỤC LỤC
1. [Kiến Trúc Ứng Dụng & Cơ Chế Đồng Bộ Realtime Đa Thiết Bị](#-1-kiến-trúc-ứng-dụng--đồng-bộ-realtime-đa-thiết-bị)
2. [Hướng Dẫn Thiết Lập Firebase Realtime Database (Người Mới)](#-2-hướng-dẫn-thiết-lập-firebase-realtime-database)
3. [Bộ Khung Prompt Chuẩn 5 Bước Khi Phát Triển Tính Năng Với AI](#-3-bộ-khung-prompt-chuẩn-5-bước-với-ai)
4. [Bí Quyết Quản Lý Bối Cảnh Khi Hết Token (Handover Thủ Công)](#-4-quản-lý-bối-cảnh-khi-hết-token-cặp-prompt-thần-thánh)
5. [Cơ Chế Tự Động Hóa 100% Chuyển Giao Cho Claude & Gemini (Auto-Handover)](#-5-cơ-chế-tự-động-hóa-100-cho-claude--gemini-auto-handover)
6. [Quy Chuẩn Lập Trình & Hướng Dẫn Mở Rộng Sau Này](#-6-quy-chuẩn-lập-trình--mở-rộng-sau-này)

---

## 🎯 1. KIẾN TRÚC ỨNG DỤNG & ĐỒNG BỘ REALTIME ĐA THIẾT BỊ

### 1.1. Vấn đề của giải pháp cũ
- **Lưu trữ cục bộ (`localStorage`)**: Dữ liệu chỉ nằm trên trình duyệt máy hiện tại. Mở điện thoại hay máy tính khác sẽ không thấy từ vựng vừa thêm.
- **Đồng bộ qua GitHub API**: Bắt buộc nhập Personal Access Token (PAT) thủ công trên từng máy, dễ xung đột commit và không có khả năng tự động cập nhật thời gian thực (real-time) giữa hai thiết bị cùng lúc.

### 1.2. Giải pháp: Firebase Realtime Database
- Sử dụng cơ sở dữ liệu thời gian thực của Google (gói Spark vĩnh viễn miễn phí cho cá nhân).
- Kết nối thông qua **WebSocket hai chiều**: Thiết bị A thêm/sửa/xóa từ vựng &rarr; Thiết bị B (điện thoại, iPad) đang mở web tự động nhảy dữ liệu ngay lập tức (**độ trễ < 0.5 giây**) mà **không cần tải lại trang (F5)**.

### 1.3. Các bước kỹ thuật triển khai
1. **Nhúng Firebase Compat SDK trực tiếp vào [`index.html`](file:///d:/Code/duidui/chinese-vocab/index.html)** (không cần bundler hay npm):
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
   <script src="firebase-config.js"></script>
   <script src="app.js"></script>
   ```
2. **File cấu hình độc lập [`firebase-config.js`](file:///d:/Code/duidui/chinese-vocab/firebase-config.js)**:
   ```javascript
   window.FIREBASE_CONFIG = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "your-project",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "...",
     appId: "..."
   };
   window.FIREBASE_ROOM = "main";
   ```
3. **Đồng bộ hai chiều trong [`app.js`](file:///d:/Code/duidui/chinese-vocab/app.js)**:
   - **Ghi dữ liệu (Write)**: Mỗi khi thêm / sửa / xóa từ vựng, hàm `saveVocabList()` vừa lưu vào `localStorage` vừa gọi `pushToFirebase()` đẩy lên Cloud (debounce 400ms chống nghẽn mạng).
   - **Lắng nghe dữ liệu (Read / Realtime Listener)**: Sử dụng `ref.on('value')`. Khi Cloud có dữ liệu mới, hàm `applyRemoteMerge()` tự động gộp từ vựng mà không làm mất tiến độ thẻ flashcard đang ôn.
4. **Dọn dẹp mã nguồn**: Xóa sạch toàn bộ code GitHub PAT cũ và xóa các nút bấm, modal thừa trên header để giao diện sạch sẽ, tối giản.

---

## 🧭 2. HƯỚNG DẪN THIẾT LẬP FIREBASE REALTIME DATABASE

Dành cho người mới bắt đầu cấu hình cơ sở dữ liệu Firebase:

1. **Tạo Project**:
   - Truy cập [console.firebase.google.com](https://console.firebase.google.com/).
   - Bấm **Thêm dự án (Add project)** &rarr; Đặt tên dự án &rarr; Tắt Google Analytics &rarr; Bấm **Tạo dự án**.
2. **Tạo Realtime Database**:
   - Ở menu bên trái chọn **Build** &rarr; **Realtime Database** &rarr; Bấm **Tạo cơ sở dữ liệu (Create Database)**.
   - Chọn vị trí máy chủ (ưu tiên Singapore `asia-southeast1` cho tốc độ cao nhất tại Việt Nam).
   - Chọn **Bắt đầu ở chế độ thử nghiệm (Start in test mode)** &rarr; Bấm **Bật (Enable)**.
3. **Cấu hình Rules (Quy tắc đọc/ghi)**:
   - Chuyển sang tab **Rules** của Realtime Database &rarr; Cập nhật thành:
     ```json
     {
       "rules": {
         ".read": true,
         ".write": true
       }
     }
     ```
   - Bấm **Xuất bản (Publish)**.
4. **Lấy mã cấu hình Web (`firebaseConfig`)**:
   - Bấm vào biểu tượng bánh răng ⚙️ (**Project settings**) &rarr; Cuộn xuống mục **Your apps** &rarr; Chọn biểu tượng Web **`</>`**.
   - Đặt nickname cho ứng dụng &rarr; Bấm **Register app** &rarr; Sao chép đối tượng `firebaseConfig`.
5. **Cập nhật vào dự án**: Mở file [`firebase-config.js`](file:///d:/Code/duidui/chinese-vocab/firebase-config.js) và dán các trường thông tin tương ứng vào.

---

## 🤖 3. BỘ KHUNG PROMPT CHUẨN 5 BƯỚC VỚI AI

Khi làm việc với các trợ lý AI lập trình, chia nhỏ mục tiêu theo **5 bước tuần tự** giúp mô hình hiểu sâu bài toán, không bị quá tải và không sinh ra mã lỗi:

### 💬 Bước 1: Khảo sát hiện trạng & Đề xuất giải pháp
> *"Hãy review lại toàn bộ mã nguồn hiện tại của dự án web của tôi (chú ý cách lưu trữ dữ liệu). Tôi muốn khi thêm/sửa dữ liệu trên một thiết bị thì các thiết bị khác (điện thoại, máy tính) cũng thấy được, hoặc khi mở cùng lúc thì đồng bộ thời gian thực (real-time). Hãy phân tích và đưa ra 3-4 hướng giải pháp kèm so sánh ưu/nhược điểm trước khi viết code."*

### 💬 Bước 2: Chọn giải pháp & Yêu cầu công nghệ phù hợp
> *"Tôi chọn hướng Firebase Realtime Database. Hãy triển khai giúp tôi bằng HTML/CSS/JS thuần (không dùng bundler hay npm phức tạp). Yêu cầu: dữ liệu thêm/sửa/xóa phải tự động lưu lên Firebase và tự cập nhật giao diện các thiết bị khác qua sự kiện real-time mà không cần tải lại trang."*

### 💬 Bước 3: Tinh chỉnh tự động hóa (UX ngầm)
> *"Tôi muốn cấu hình Firebase được lưu sẵn trong code luôn (hãy tách thành file `firebase-config.js` riêng để sau này tôi dễ quản lý hoặc cho vào `.gitignore`). Bất kỳ ai mở link web lên là tự động kết nối và đồng bộ ngay, không cần form nhập hay modal cấu hình rườm rà."*

### 💬 Bước 4: Hướng dẫn thao tác nền tảng thứ ba
> *"Tôi là người mới dùng Firebase lần đầu. Hãy hướng dẫn tôi từng bước thật chi tiết cách tạo Project, tạo Realtime Database, cách cấu hình Rules (quy tắc đọc/ghi) và cách lấy đoạn mã `firebaseConfig` để điền vào code."*

### 💬 Bước 5: Dọn dẹp mã nguồn thừa & Tối ưu giao diện
> *"Tính năng đồng bộ Firebase đã chạy ngầm tự động rồi, hãy giúp tôi:  
> 1. Xóa bỏ hoàn toàn code và logic của phương án cũ để dự án sạch sẽ.  
> 2. Bỏ các icon, nút bấm cấu hình không cần thiết trên thanh tiêu đề để giao diện gọn gàng, tối giản."*

---

## 🔄 4. QUẢN LÝ BỐI CẢNH KHI HẾT TOKEN (CẶP PROMPT THẦN THÁNH)

Khi làm dự án phức tạp, phiên làm việc (chat session) của AI sẽ đạt giới hạn token. Lúc này, AI mới **không nhớ lịch sử chat cũ**, nhưng **đọc được toàn bộ file trong thư mục**.

Dưới đây là cặp lệnh dùng khi thực hiện bàn giao thủ công:

### 1️⃣ Prompt dặn Agent CŨ (Trước khi đóng phiên):
> *"Phiên làm việc này sắp hết token. Hãy cập nhật file `docs/HANDOVER.md` tóm tắt chi tiết:  
> 1. Mục tiêu dự án và kiến trúc đang dùng.  
> 2. Danh sách các file cụ thể đã tạo/chỉnh sửa và tóm tắt logic thay đổi.  
> 3. Trạng thái hiện tại (đã test chạy được gì, còn vướng gì không).  
> 4. Danh sách việc tiếp theo cần làm (Next tasks theo thứ tự ưu tiên).  
> Sau đó chạy `git status` để kiểm tra sạch sẽ."*

### 2️⃣ Prompt gửi cho Agent MỚI (Dán ở tin nhắn đầu tiên):
> *"Đây là phiên làm việc mới của dự án. Hãy:  
> 1. Đọc ngay file `docs/HANDOVER.md` để nắm toàn bộ bối cảnh và các thay đổi của phiên trước.  
> 2. Chạy `git status` để đối chiếu với mã nguồn thực tế.  
> 3. Báo cáo ngắn gọn cho tôi bạn đã nắm bối cảnh đến đâu, sau đó bắt tay vào làm ngay nhiệm vụ số 1 trong danh sách việc tiếp theo."*

---

## ⚡ 5. CƠ CHẾ TỰ ĐỘNG HÓA 100% CHO CLAUDE & GEMINI (AUTO-HANDOVER)

Nếu bạn không muốn phải copy-paste prompt bàn giao mỗi lần mở chat mới, dự án đã thiết lập sẵn **Cơ chế nạp chỉ dẫn tự động** theo chuẩn của các AI Agent:

```
chinese-vocab/
├── CLAUDE.md            <-- Tự động nạp vào Claude Code / Claude Desktop / Cline
├── GEMINI.md            <-- Tự động nạp vào Gemini CLI / Antigravity
├── AGENTS.md            <-- Tự động nạp vào Cursor / Windsurf / Codex
└── docs/
    ├── HANDOVER.md      <-- Nhật ký bàn giao tiến độ thực tế (Agent tự đọc và tự cập nhật)
    └── GUIDE.md         <-- Cẩm nang hướng dẫn toàn diện dự án (Tài liệu này)
```

### 5.1. Cơ chế hoạt động ngầm (Zero-Prompt Handover)
1. **Khi bạn mở phiên mới với Claude**:
   - Công cụ tự động đọc [`CLAUDE.md`](file:///d:/Code/duidui/chinese-vocab/CLAUDE.md).
   - Quy tắc trong file yêu cầu Claude **ngay lập tức đọc [`docs/HANDOVER.md`](file:///d:/Code/duidui/chinese-vocab/docs/HANDOVER.md)** và chạy `git status`.
   - Bạn chỉ cần nói: *"Làm tiếp đi"* hoặc đưa yêu cầu mới, Claude đã có đầy đủ ký ức của Agent trước mà không cần giải thích lại.
2. **Khi bạn mở phiên mới với Gemini / Antigravity**:
   - Công cụ tự động đọc [`GEMINI.md`](file:///d:/Code/duidui/chinese-vocab/GEMINI.md) hoặc [`AGENTS.md`](file:///d:/Code/duidui/chinese-vocab/AGENTS.md).
   - Tương tự, Agent tự động nạp [`docs/HANDOVER.md`](file:///d:/Code/duidui/chinese-vocab/docs/HANDOVER.md) vào bộ nhớ làm việc.
3. **Khi hoàn thành công việc**:
   - Các file quy định Agent **bắt buộc phải tự động cập nhật lại [`docs/HANDOVER.md`](file:///d:/Code/duidui/chinese-vocab/docs/HANDOVER.md)** ghi nhận các file vừa sửa đổi và việc tiếp theo cần làm.

---

## 🛠️ 6. QUY CHUẨN LẬP TRÌNH & MỞ RỘNG SAU NÀY

Phần này dùng để lưu trữ các quy chuẩn và hướng dẫn phát triển thêm cho dự án:

### 6.1. Quy chuẩn công nghệ (Stack Rules)
- **Giao diện & Logic**: Chỉ sử dụng HTML5, CSS3 và JavaScript thuần (ES6+). Tuyệt đối không cài các gói bundler phức tạp (Webpack, Vite, npm packages nặng) để đảm bảo mở file trực tiếp trên trình duyệt là chạy ngay.
- **Đồng bộ**: Chỉ sử dụng Firebase Realtime Database. Tuyệt đối không phục hồi cơ chế GitHub PAT Sync cũ.
- **Bảo mật**: Không commit mật khẩu, khóa bí mật quan trọng vào mã nguồn công khai. File cấu hình riêng có thể đưa vào `.gitignore` khi đưa repo lên chế độ public.

### 6.2. Hướng dẫn sao lưu & Quản lý từ vựng (`vocab.json`)
- File [`vocab.json`](file:///d:/Code/duidui/chinese-vocab/vocab.json) đóng vai trò là file dữ liệu hạt giống (seed data) hoặc bản sao lưu định kỳ.
- Khi người dùng xuất (Export) dữ liệu từ web hoặc tải file JSON về máy, có thể lưu trữ file này vào thư mục dự án để làm backup an toàn.

### 6.3. Ý tưởng tính năng mở rộng trong tương lai
- **Phân loại cấp độ HSK**: Gắn nhãn HSK 1 đến HSK 6 cho từng từ vựng.
- **Phát âm tự động (Text-to-Speech)**: Tích hợp Web Speech API tiếng Trung (`zh-CN`).
- **Streak & Thống kê**: Tính số ngày học liên tục và biểu đồ ghi nhớ từ vựng.
- **Deploy**: Triển khai web lên GitHub Pages, Cloudflare Pages hoặc Vercel (chỉ cần kéo thả thư mục là chạy).
