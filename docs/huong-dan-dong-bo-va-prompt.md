# 📚 Hướng Dẫn Đồng Bộ Dữ Liệu Realtime Đa Thiết Bị & Bí Quyết Prompt AI

Tài liệu này đúc kết toàn bộ quá trình chuyển đổi cơ chế lưu trữ của ứng dụng web tĩnh (HTML/CSS/JS thuần) từ **LocalStorage / GitHub Sync** sang **Firebase Realtime Database**, cùng **bộ khung Prompt chuẩn** để tái sử dụng hoặc chia sẻ cho người khác.

---

## 🎯 PHẦN 1: BÀI TOÁN & QUÁ TRÌNH TRIỂN KHAI

### 1. Vấn đề ban đầu
* **Lưu trữ cục bộ (`localStorage`)**: Dữ liệu chỉ nằm trên trình duyệt hiện tại. Mở điện thoại hay máy tính khác sẽ không thấy từ vựng vừa thêm.
* **Đồng bộ qua GitHub API**: Yêu cầu Personal Access Token (PAT) có quyền ghi. Thao tác trên điện thoại rất bất tiện, dễ gặp xung đột commit và không có khả năng cập nhật tức thì (real-time) khi mở hai thiết bị cùng lúc.

### 2. Giải pháp: Firebase Realtime Database
* Sử dụng dịch vụ cơ sở dữ liệu thời gian thực của Google (gói Spark vĩnh viễn miễn phí cho cá nhân).
* Kết nối bằng **WebSocket hai chiều**: Thiết bị A thêm/sửa/xóa từ vựng &rarr; Thiết bị B (điện thoại, iPad) đang mở web tự động nhảy dữ liệu ngay lập tức (**độ trễ < 0.5 giây**) mà **không cần tải lại trang (F5)**.

### 3. Các bước kỹ thuật đã thực hiện:

#### Bước 1: Nhúng Firebase SDK trực tiếp vào `index.html`
Không cần Node.js, npm hay đóng gói Webpack/Vite. Nhúng trực tiếp bản Compat qua thẻ `<script>`:
```html
<!-- Firebase SDK (Compat cho Vanilla JS) -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
<script src="firebase-config.js"></script>
<script src="app.js"></script>
```

#### Bước 2: Tách riêng file cấu hình `firebase-config.js`
Giúp ứng dụng tự động kết nối ngay lập tức trên mọi thiết bị mà không cần modal hay form nhập:
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

#### Bước 3: Đồng bộ dữ liệu hai chiều trong `app.js`
* **Ghi dữ liệu (Write)**: Mỗi khi thêm / sửa / xóa từ vựng, hàm `saveVocabList()` vừa lưu vào `localStorage` vừa gọi `pushToFirebase()` đẩy lên Cloud (có debounce 400ms chống spam request).
* **Lắng nghe dữ liệu (Read / Realtime Listener)**: Sử dụng `ref.on('value')`. Khi Cloud có thay đổi, hàm `applyRemoteMerge()` tự động gộp dữ liệu và cập nhật vòng ôn tập flashcard mà không làm mất tiến độ thẻ bài đang làm.

#### Bước 4: Tinh giản giao diện & Dọn dẹp mã nguồn
* Xóa bỏ hoàn toàn code GitHub sync cũ để mã nguồn tinh gọn và sạch sẽ.
* Xóa nút bấm và hộp thoại cấu hình thừa trên thanh tiêu đề vì ứng dụng đã tự động kết nối và chạy ngầm 100%.

---

## 🧭 PHẦN 2: HƯỚNG DẪN THIẾT LẬP FIREBASE (CHO NGƯỜI MỚI)

1. **Tạo Project**: Truy cập [console.firebase.google.com](https://console.firebase.google.com/) &rarr; Bấm *Thêm dự án (Add project)* &rarr; Đặt tên &rarr; Tắt Google Analytics &rarr; Bấm *Tạo*.
2. **Tạo Realtime Database**:
   * Menu trái chọn **Build** &rarr; **Realtime Database** &rarr; Bấm *Tạo cơ sở dữ liệu*.
   * Chọn vị trí (Singapore `asia-southeast1` hoặc Mỹ `us-central1`).
   * Chọn *Bắt đầu ở chế độ thử nghiệm (Start in test mode)* &rarr; Bấm *Bật*.
3. **Cấu hình Rules (Quy tắc đọc/ghi)**:
   * Vào tab **Rules** của Realtime Database &rarr; Đổi thành:
     ```json
     {
       "rules": {
         ".read": true,
         ".write": true
       }
     }
     ```
   * Bấm **Xuất bản (Publish)**.
4. **Lấy mã cấu hình Web**:
   * Bấm vào bánh răng ⚙️ (*Project settings*) &rarr; Cuộn xuống mục *Your apps* &rarr; Chọn icon Web **`</>`**.
   * Nhập tên app &rarr; Bấm *Register app* &rarr; Copy đoạn mã `firebaseConfig`.
5. **Dán vào code**: Mở file `firebase-config.js` và dán đoạn mã vừa copy vào.

---

## 🤖 PHẦN 3: BỘ KHUNG PROMPT CHUẨN ĐỂ LÀM VIỆC VỚI AI

Khi làm việc với các trợ lý AI (ChatGPT, Claude, Gemini, Cursor...), thay vì gõ một câu lệnh quá dài hoặc mơ hồ, hãy chia thành **5 bước prompt tuần tự**:

### 💬 Prompt 1: Khảo sát hiện trạng & Đề xuất giải pháp
> *"Hãy review lại toàn bộ mã nguồn hiện tại của dự án web của tôi (chú ý cách lưu trữ dữ liệu). Tôi muốn khi thêm/sửa dữ liệu trên một thiết bị thì các thiết bị khác (điện thoại, máy tính) cũng thấy được, hoặc khi mở cùng lúc thì đồng bộ thời gian thực (real-time). Hãy phân tích và đưa ra 3-4 hướng giải pháp kèm so sánh ưu/nhược điểm trước khi viết code."*

### 💬 Prompt 2: Chọn giải pháp & Yêu cầu công nghệ phù hợp
> *"Tôi chọn hướng Firebase Realtime Database. Hãy triển khai giúp tôi bằng HTML/CSS/JS thuần (không dùng bundler hay npm phức tạp). Yêu cầu: dữ liệu thêm/sửa/xóa phải tự động lưu lên Firebase và tự cập nhật giao diện các thiết bị khác qua sự kiện real-time mà không cần tải lại trang."*

### 💬 Prompt 3: Tinh chỉnh nghiệp vụ thực tế (Tự động hóa)
> *"Tôi muốn cấu hình Firebase được lưu sẵn trong code luôn (hãy tách thành file `firebase-config.js` riêng để sau này tôi dễ quản lý hoặc cho vào `.gitignore`). Bất kỳ ai mở link web lên là tự động kết nối và đồng bộ ngay, không cần form nhập hay modal cấu hình rườm rà."*

### 💬 Prompt 4: Nhờ hướng dẫn thao tác trên nền tảng thứ ba
> *"Tôi là người mới dùng Firebase lần đầu. Hãy hướng dẫn tôi từng bước thật chi tiết cách tạo Project, tạo Realtime Database, cách cấu hình Rules (quy tắc đọc/ghi) và cách lấy đoạn mã `firebaseConfig` để điền vào code."*
> 
> *(Mẹo: Khi gặp bước nào không hiểu trên màn hình, chụp ảnh màn hình gửi cho AI để AI hướng dẫn chính xác vị trí nút bấm).*

### 💬 Prompt 5: Dọn dẹp mã nguồn thừa & Tối ưu giao diện (UX)
> *"Tính năng đồng bộ Firebase đã chạy ngầm tự động rồi, hãy giúp tôi:  
> 1. Xóa bỏ hoàn toàn code và logic của phương án cũ để dự án sạch sẽ.  
> 2. Bỏ các icon, nút bấm cấu hình không cần thiết trên thanh tiêu đề để giao diện gọn gàng, tối giản."*

---

> 💡 **Nguyên tắc vàng khi Prompt**: Chia nhỏ mục tiêu theo từng chặng (*Phân tích &rarr; Chọn công nghệ &rarr; Kết nối dữ liệu &rarr; Tối ưu UI/UX*). Việc này giúp AI tập trung giải quyết triệt để từng vấn đề mà không bị quá tải hay làm sót tính năng.
