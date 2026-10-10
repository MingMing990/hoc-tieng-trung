# 华语 VocabMaster - Ứng Dụng Học Từ Vựng Tiếng Trung

Ứng dụng web học từ vựng tiếng Trung hiện đại, tối ưu cho việc ghi nhớ chữ Hán, phát âm Pinyin chuẩn thanh điệu và mở rộng vốn từ.

## 🌟 Tính Năng Nổi Bật

### 1. ➕ Thêm Từ Vựng Mới & Kiểm Tra Trùng Lặp
- **Hán tự (Chữ Hán)**: Hỗ trợ font chữ nét chuẩn, hiển thị cỡ lớn trực quan.
- **Cảnh báo trùng lặp thông minh (Duplicate Detection)**:
  - Khi gõ Hán tự đã có trong kho, huy hiệu cảnh báo ⚠️ xuất hiện ngay dưới ô nhập cùng nút bấm *"Sửa từ này ngay"*.
  - Nếu cố tình lưu từ đã có, hộp thoại cảnh báo (Modal Dialog) hiển thị thông tin chi tiết của từ cũ (Pinyin, Hán-Việt, Nghĩa) để người dùng xem lại hoặc bấm chuyển sang sửa từ cũ ngay lập tức.
- **Tự động chuyển đổi thanh điệu Pinyin thông minh**:
  - Gõ số sau âm tiết sẽ tự động chuyển thành thanh điệu tương ứng:
    - `ma1` &rarr; `mā` (Thanh 1)
    - `ma2` &rarr; `má` (Thanh 2)
    - `ma3` &rarr; `mǎ` (Thanh 3)
    - `ma4` &rarr; `mà` (Thanh 4)
    - Không gõ số hoặc số `5` &rarr; `de` / `ma` (Khinh thanh)
    - Hỗ trợ gõ `v` hoặc `u:` cho âm `ü`: `lv4` &rarr; `lǜ`, `nv3` &rarr; `nǚ`
  - Hỗ trợ xem trước Pinyin theo thời gian thực (Live Preview Chip).
  - Có thanh công cụ chọn nhanh nguyên âm có dấu (`ā`, `á`, `ǎ`, `à`,...).
- **Tự động chuẩn hóa nội dung hiển thị (Auto-formatting)**:
  - **Viết hoa chữ cái đầu**: Ý nghĩa tiếng Việt, ý nghĩa tiếng Anh và câu ví dụ sẽ tự động viết hoa chữ cái đầu tiên (ví dụ: `học tập, trau dồi` &rarr; `Học tập, trau dồi`, `to learn` &rarr; `To learn`).
  - **Pinyin toàn bộ viết thường**: Pinyin được chuyển thanh điệu và đưa về chữ thường toàn bộ (ví dụ: `Xué Xí` &rarr; `xué xí`, `Nǐ Hǎo` &rarr; `nǐ hǎo`).
  - **Phiên âm Hán-Việt toàn bộ in hoa**: Âm Hán-Việt tự động chuyển toàn bộ thành chữ in hoa trang trọng (ví dụ: `Học tập` &rarr; `HỌC TẬP`, `nhĩ hảo` &rarr; `NHĨ HẢO`).
  - Tự động chuẩn hóa ngay khi kết thúc nhập (rời chuột / blur), trên thẻ xem trước trực tiếp, khi lưu vào kho và trên tất cả các thẻ hiển thị.
- **Phiên âm Hán - Việt**: Gợi ý cách đọc Hán - Việt giúp người Việt nhớ từ vựng siêu nhanh.
- **Ý nghĩa song ngữ**: Nhập đồng thời nghĩa tiếng Việt và tiếng Anh.
- **Câu ví dụ mẫu**: Hỗ trợ câu đối chiếu tiếng Trung và tiếng Việt.
- **Xem trước trực tiếp (Live Card Preview)**: Thấy ngay hình ảnh thẻ từ vựng khi đang gõ.

### 2. ✏️ Chỉnh Sửa Từ Vựng Đã Lưu (Edit Mode)
- **Nút sửa ✏️ trên mỗi thẻ từ**: Trong tab *"Kho từ vựng"*, mỗi thẻ đều có nút ✏️ để chỉnh sửa.
- **Nút sửa ✏️ ngay trong chế độ ôn tập**: Khi lật thẻ xem kết quả ôn tập, nút ✏️ xuất hiện để bạn chỉnh sửa ngay nếu phát hiện lỗi sai.
- **Form chỉnh sửa trực quan**: Tự động tải toàn bộ thông tin cũ vào form, tiêu đề đổi thành *"Chỉnh sửa từ vựng"*, có banner hiển thị từ đang sửa và nút *"Hủy sửa"* tiện lợi.
- **Cập nhật mượt mà**: Nhấn *"Cập nhật từ vựng"* để lưu thay đổi vào LocalStorage và cập nhật tức thì kho từ cùng vòng ôn tập.

### 3. 🎓 Chế Độ Ôn Tập (Flashcard Random)
- **Cơ chế đố thông minh**: Ban đầu chỉ hiển thị ý nghĩa (tiếng Việt & tiếng Anh) của một từ ngẫu nhiên để người học tự nhớ lại Hán tự và Pinyin.
- **Nút "Hiện kết quả" (hoặc "Hoàn thành")**: Khi bấm vào sẽ bung mở đầy đủ:
  - Chữ Hán to rõ, nổi bật.
  - Pinyin chuẩn thanh điệu.
  - Phiên âm Hán - Việt.
  - Câu ví dụ thực tế.
  - Nút loa 🔊 phát âm giọng Bắc Kinh chuẩn (sử dụng Web Speech API).
  - Nút ✏️ để sửa từ nhanh.
- **Nút "Từ tiếp theo" ở góc dưới**: Chuyển sang từ ngẫu nhiên tiếp theo.
- **Thuật toán xáo trộn không lặp lại**: Duyệt qua từng từ trong kho cho đến khi hết toàn bộ từ vựng.
- **Thanh tiến trình & Màn hình chúc mừng**: Theo dõi tiến độ (ví dụ `Từ 3 / 10`) và hiển thị màn hình chúc mừng khi hoàn tất lượt ôn tập, kèm nút ôn tập lại vòng mới.
- **Phím tắt nhanh tiện lợi**:
  - <kbd>Space</kbd> hoặc <kbd>Enter</kbd>: Hiện kết quả & Chuyển từ tiếp theo.
  - Phím <kbd>&rarr;</kbd> hoặc <kbd>N</kbd>: Chuyển từ tiếp theo.

### 4. 📚 Kho Từ Vựng & Quản Lý Dữ Liệu
- **Tìm kiếm tức thì**: Lọc theo chữ Hán, Pinyin, Hán-Việt hoặc ý nghĩa.
- **Chỉnh sửa & Xóa**: Nút ✏️ để sửa và 🗑️ để xóa từng từ vựng.
- **Phát âm trực tiếp**: Bấm loa 🔊 để nghe từng từ bất kỳ lúc nào.
- **Lưu trữ vĩnh viễn**: Tự động lưu vào `LocalStorage` của trình duyệt.
- **Xuất / Nhập JSON (Backup & Restore)**: Sao lưu dữ liệu từ vựng ra file JSON hoặc nhập lại trên thiết bị khác.
- **Có sẵn bộ từ mẫu HSK**: Tích hợp sẵn các từ vựng thông dụng để trải nghiệm ngay.

---

## 🚀 Hướng Dẫn Chạy Ứng Dụng

Ứng dụng được xây dựng hoàn toàn bằng **HTML, CSS và JavaScript thuần**, không phụ thuộc thư viện nặng.

### Cách 1: Mở trực tiếp bằng trình duyệt
Nhấp đúp chuột vào file [`index.html`](file:///e:/WORK/Projects/VibeCode/ChineseVocab/index.html) để mở trên Google Chrome, Microsoft Edge, Brave, Cốc Cốc hoặc Safari.

### Cách 2: Mở qua Local Server (đang chạy)
Ứng dụng đang được phục vụ tại:
👉 **http://localhost:8080/ChineseVocab/**
