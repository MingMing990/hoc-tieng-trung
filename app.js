/**
 * Chinese Vocabulary Master - Main Application Logic
 */

// Security & Authentication Storage Keys
const STORAGE_AUTH_HASH = 'chinese_vocab_auth_hash';
const STORAGE_REMEMBER_AUTH = 'chinese_vocab_remember_auth';
const SESSION_AUTH = 'chinese_vocab_session_auth';

// Repo Vocabulary Sync (vocab.json nằm cùng thư mục với index.html trong repo)
const REPO_VOCAB_URL = 'vocab.json';
// Danh sách Hán tự của vocab.json ở lần đồng bộ trước, dùng để nhận biết từ đã bị xóa
const STORAGE_REPO_BASE = 'chinese_vocab_repo_base';


// Firebase Realtime Sync Storage Keys & Default Configuration
const STORAGE_FIREBASE_CONFIG = 'chinese_vocab_firebase_config';
const STORAGE_FIREBASE_ROOM = 'chinese_vocab_firebase_room';
const DEFAULT_FIREBASE_ROOM = 'main';

// Cấu hình Firebase mặc định sẵn trong code (sẽ tự động kết nối trên mọi thiết bị):
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDlzYsGt0dDFF6HzrLwRMg8BERG_rQD-zQ",
  authDomain: "chinese-vocab-7d7c3.firebaseapp.com",
  databaseURL: "https://chinese-vocab-7d7c3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chinese-vocab-7d7c3",
  storageBucket: "chinese-vocab-7d7c3.firebasestorage.app",
  messagingSenderId: "899875550896",
  appId: "1:899875550896:web:784cb96a08984a83a6ed75",
  measurementId: "G-04EPBW5VW9"
};

/**
 * Trích xuất và phân tích cấu hình Firebase từ chuỗi nhập vào
 * Hỗ trợ: JSON, đoạn mã JS (const firebaseConfig = { ... }), hoặc Object thuần
 */
function parseFirebaseConfig(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  
  // 1. Thử parse trực tiếp JSON
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object' && (obj.apiKey || obj.databaseURL || obj.projectId)) {
      return obj;
    }
  } catch (e) {}

  // 2. Tìm khối { ... } trong đoạn mã JS
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    const rawObj = match[0];
    try {
      const fn = new Function(`return (${rawObj});`);
      const evaluated = fn();
      if (evaluated && typeof evaluated === 'object' && (evaluated.apiKey || evaluated.databaseURL || evaluated.projectId)) {
        return evaluated;
      }
    } catch (e) {}

    try {
      const jsonCandidate = rawObj
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
        .replace(/:\s*'([^']*)'/g, ':"$1"')
        .replace(/,\s*([}\]])/g, '$1');
      const obj = JSON.parse(jsonCandidate);
      if (obj && typeof obj === 'object' && (obj.apiKey || obj.databaseURL || obj.projectId)) {
        return obj;
      }
    } catch (e) {}
  }
  return null;
}

// Pre-configured Master Password Hash (SHA-256 with salt)
const DEFAULT_MASTER_PASSWORD_HASH = 'c0ff5cca5f88fc1f987410a2c8374afb5215bb4fc2f9b3ef5939b67fcf7bb6e1';

/**
 * SHA-256 password hashing with salt using Web Crypto API
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_chinesevocab_secret_salt_2026");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Text Auto-formatting Utilities:
 * 1. Capitalize first letter of string/sentence
 * 2. Format Pinyin: convert tone numbers and strictly lowercase all characters
 * 3. Format Sino-Vietnamese (Hán-Việt): strictly uppercase all characters
 */
function capitalizeFirstLetter(str) {
  if (!str || str === '-') return str || '';
  const trimmed = str.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatPinyin(str) {
  if (!str) return '';
  const converted = typeof convertPinyinText === 'function' ? convertPinyinText(str) : str;
  return converted.trim().toLowerCase();
}

function formatHanViet(str) {
  if (!str || str.trim() === '' || str.trim() === '-') return '-';
  return str.trim().toUpperCase();
}

function normalizeVocabItem(item, index = 0) {
  if (!item || typeof item !== 'object') return null;

  // Flexible key resolution for imported JSON files
  const hanzi = (item.hanzi || item.chinese || item.word || item.character || '').toString().trim();
  const pinyin = (item.pinyin || item.pin_yin || '').toString().trim();
  const hanviet = (item.hanviet || item.han_viet || item.sino_vietnamese || item.am_han_viet || '').toString().trim();
  const meaningVn = (item.meaningVn || item.meaning_vn || item.vietnamese || item.meaning || item.nghia || '').toString().trim();
  const meaningEn = (item.meaningEn || item.meaning_en || item.english || item.definition || '').toString().trim();
  const exampleCn = (item.exampleCn || item.example_cn || item.example_chinese || item.example || '').toString().trim();
  const exampleVn = (item.exampleVn || item.example_vn || item.example_vietnamese || '').toString().trim();

  // Item must have at least hanzi or meaning to be considered a vocabulary item
  if (!hanzi && !meaningVn) return null;

  const id = item.id ? item.id.toString() : `vocab-${Date.now()}-${index}`;

  return {
    id,
    hanzi: hanzi || '未知',
    pinyin: formatPinyin(pinyin),
    hanviet: formatHanViet(hanviet),
    meaningVn: capitalizeFirstLetter(meaningVn) || 'Chưa có nghĩa',
    meaningEn: capitalizeFirstLetter(meaningEn) || '-',
    exampleCn: exampleCn || '',
    exampleVn: capitalizeFirstLetter(exampleVn) || '',
    createdAt: item.createdAt || Date.now(),
    ...(item.updatedAt ? { updatedAt: item.updatedAt } : {})
  };
}

/**
 * Lấy mảng từ vựng từ dữ liệu JSON: chấp nhận mảng trực tiếp
 * hoặc object bọc ngoài (words, vocabulary, vocabList, vocab, data, items)
 */
function extractVocabArray(rawData) {
  if (Array.isArray(rawData)) return rawData;
  if (rawData && typeof rawData === 'object') {
    const candidate = rawData.words || rawData.vocabulary || rawData.vocabList || rawData.vocab || rawData.data || rawData.items;
    if (Array.isArray(candidate)) return candidate;
  }
  return null;
}

// Base64 <-> UTF-8 (GitHub API trả và nhận nội dung file dạng base64)
function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

// Default Seed Vocabulary (Hanviet in UPPERCASE, Pinyin in lowercase, Meanings capitalized)
const DEFAULT_VOCABULARY = [
  {
    id: "vocab-1",
    hanzi: "学习",
    pinyin: "xué xí",
    hanviet: "HỌC TẬP",
    meaningVn: "Học tập, nghiên cứu kiến thức",
    meaningEn: "To study, to learn",
    exampleCn: "我们每天都在认真学习汉语。",
    exampleVn: "Chúng tôi mỗi ngày đều chăm chỉ học tiếng Trung.",
    createdAt: Date.now() - 500000
  },
  {
    id: "vocab-2",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    hanviet: "NHĨ HẢO",
    meaningVn: "Xin chào",
    meaningEn: "Hello, greetings",
    exampleCn: "你好，很高兴认识你！",
    exampleVn: "Xin chào, rất vui được làm quen với bạn!",
    createdAt: Date.now() - 400000
  },
  {
    id: "vocab-3",
    hanzi: "谢谢",
    pinyin: "xiè xie",
    hanviet: "TẠ TẠ",
    meaningVn: "Cảm ơn",
    meaningEn: "Thank you, thanks",
    exampleCn: "非常感谢你的热心帮助。",
    exampleVn: "Vô cùng cảm ơn sự giúp đỡ nhiệt tình của bạn.",
    createdAt: Date.now() - 300000
  },
  {
    id: "vocab-4",
    hanzi: "朋友",
    pinyin: "péng you",
    hanviet: "BẰNG HỮU",
    meaningVn: "Bạn bè, người bạn",
    meaningEn: "Friend",
    exampleCn: "海内存知己，天涯若比邻。",
    exampleVn: "Trong bốn biển có bạn tri kỷ, thì chân trời cũng như cạnh nhà.",
    createdAt: Date.now() - 200000
  },
  {
    id: "vocab-5",
    hanzi: "老师",
    pinyin: "lǎo shī",
    hanviet: "LÃO SƯ",
    meaningVn: "Thầy cô giáo, giáo viên",
    meaningEn: "Teacher",
    exampleCn: "王老师教我们汉语发音。",
    exampleVn: "Thầy Vương dạy chúng tôi phát âm tiếng Trung.",
    createdAt: Date.now() - 100000
  },
  {
    id: "vocab-6",
    hanzi: "喜欢",
    pinyin: "xǐ huan",
    hanviet: "HỶ HOAN",
    meaningVn: "Thích, yêu thích",
    meaningEn: "To like, to be fond of",
    exampleCn: "我非常喜欢中国书法与茶文化。",
    exampleVn: "Tôi rất thích thư pháp và văn hóa trà Trung Hoa.",
    createdAt: Date.now() - 50000
  },
  {
    id: "vocab-7",
    hanzi: "明天",
    pinyin: "míng tiān",
    hanviet: "MINH THIÊN",
    meaningVn: "Ngày mai",
    meaningEn: "Tomorrow",
    exampleCn: "明天早上我们在学校见。",
    exampleVn: "Sáng mai chúng ta gặp nhau ở trường nhé.",
    createdAt: Date.now() - 10000
  }
];

class VocabApp {
  constructor() {
    this.vocabList = this.loadVocabList();
    this.reviewDeck = [];
    this.reviewIndex = 0;
    this.isCardRevealed = false;
    this.currentTheme = localStorage.getItem('theme_preference') || 'dark';

    // State for Editing & Duplicate Detection
    this.editingVocabId = null;
    this.pendingDuplicateVocab = null;

    // Security & Lock Screen State
    this.isLocked = true;

    // Firebase Realtime State
    this.firebaseDb = null;
    this.firebaseVocabRef = null;
    this.firebaseStatus = 'off';
    this.firebasePushTimer = null;
    this.hasPushedInitialFirebase = false;
    this._fbListener = null;

    this.initDOM();
    this.initVoiceEngine();
    this.initTheme();
    this.bindEvents();
    this.updateStats();
    this.renderVocabBank();
    this.initReviewSession();
    this.checkMagicSyncLink();
    this.initFirebase();
  }

  // Load from local storage or fallback to defaults
  loadVocabList() {
    try {
      const saved = localStorage.getItem('chinese_vocab_list');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize existing saved items so all follow the uppercase/lowercase/capitalize rules
          return parsed.map((item, idx) => normalizeVocabItem(item, idx)).filter(Boolean);
        }
      }
    } catch (e) {
      console.error('Error loading vocabulary list from storage:', e);
    }
    const defaults = DEFAULT_VOCABULARY.map((item, idx) => normalizeVocabItem(item, idx)).filter(Boolean);
    this.saveVocabList(defaults);
    return defaults;
  }

  saveVocabList(list) {
    this.vocabList = list;
    localStorage.setItem('chinese_vocab_list', JSON.stringify(list));
    this.updateStats();
    if (!this.isApplyingRemote) {
      this.scheduleFirebasePush();
      this.scheduleGitHubPush();
    }
  }

  initDOM() {
    // Tabs
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanels = document.querySelectorAll('.tab-content');
    this.tabAddTitle = document.getElementById('tab-add-title');
    this.tabAddIcon = document.getElementById('tab-add-icon');

    // Review Mode Elements
    this.reviewCard = document.getElementById('review-card');
    this.reviewCompletion = document.getElementById('review-completion');
    this.reviewEmptyState = document.getElementById('review-empty-state');
    this.btnEmptyRestoreSample = document.getElementById('btn-empty-restore-sample');
    this.reviewProgressText = document.getElementById('review-progress-text');
    this.reviewProgressBar = document.getElementById('review-progress-bar');
    this.reviewPromptVn = document.getElementById('review-prompt-vn');
    this.reviewPromptEn = document.getElementById('review-prompt-en');
    this.reviewRevealArea = document.getElementById('review-reveal-area');
    this.reviewHanzi = document.getElementById('review-hanzi');
    this.reviewPinyin = document.getElementById('review-pinyin');
    this.reviewHanviet = document.getElementById('review-hanviet');
    this.reviewExampleBox = document.getElementById('review-example-box');
    this.reviewExampleCn = document.getElementById('review-example-cn');
    this.reviewExampleVn = document.getElementById('review-example-vn');
    this.btnReveal = document.getElementById('btn-reveal-result');
    this.btnNextWord = document.getElementById('btn-next-word');
    this.btnRestartReview = document.getElementById('btn-restart-review');
    this.btnAudioReview = document.getElementById('btn-audio-review');
    this.btnEditReview = document.getElementById('btn-edit-review');

    // Add / Edit Form Elements
    this.vocabForm = document.getElementById('vocab-form');
    this.inputHanzi = document.getElementById('input-hanzi');
    this.inputPinyin = document.getElementById('input-pinyin');
    this.inputHanviet = document.getElementById('input-hanviet');
    this.inputMeaningVn = document.getElementById('input-meaning-vn');
    this.inputMeaningEn = document.getElementById('input-meaning-en');
    this.inputExampleCn = document.getElementById('input-example-cn');
    this.inputExampleVn = document.getElementById('input-example-vn');
    this.pinyinLiveChip = document.getElementById('pinyin-live-chip');

    // Form Edit Mode Elements
    this.editingStatusBanner = document.getElementById('editing-status-banner');
    this.editingWordTitle = document.getElementById('editing-word-title');
    this.btnCancelEditBanner = document.getElementById('btn-cancel-edit-banner');
    this.btnCancelEditForm = document.getElementById('btn-cancel-edit-form');
    this.formHeadingTitle = document.getElementById('form-heading-title');
    this.formHeadingDesc = document.getElementById('form-heading-desc');
    this.submitBtnIcon = document.getElementById('submit-btn-icon');
    this.submitBtnText = document.getElementById('submit-btn-text');

    // Duplicate Detection Elements
    this.hanziDuplicateWarning = document.getElementById('hanzi-duplicate-warning');
    this.dupHanziText = document.getElementById('dup-hanzi-text');
    this.dupMeaningText = document.getElementById('dup-meaning-text');
    this.btnQuickEditDup = document.getElementById('btn-quick-edit-dup');

    // Duplicate Modal Dialog
    this.duplicateModal = document.getElementById('duplicate-modal');
    this.modalDupHanzi = document.getElementById('modal-dup-hanzi');
    this.modalDupPinyin = document.getElementById('modal-dup-pinyin');
    this.modalDupHanviet = document.getElementById('modal-dup-hanviet');
    this.modalDupVn = document.getElementById('modal-dup-vn');
    this.modalDupEn = document.getElementById('modal-dup-en');
    this.btnModalClose = document.getElementById('btn-modal-close');
    this.btnModalEditExisting = document.getElementById('btn-modal-edit-existing');

    // Live Preview elements
    this.previewHanzi = document.getElementById('preview-hanzi');
    this.previewPinyin = document.getElementById('preview-pinyin');
    this.previewHanviet = document.getElementById('preview-hanviet');
    this.previewVn = document.getElementById('preview-vn');
    this.previewEn = document.getElementById('preview-en');

    // Bank Elements
    this.bankGrid = document.getElementById('bank-grid');
    this.bankSearchInput = document.getElementById('bank-search-input');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnImportJson = document.getElementById('btn-import-json');
    this.fileImportInput = document.getElementById('file-import-input');
    this.btnResetSample = document.getElementById('btn-reset-sample');
    this.btnClearAll = document.getElementById('btn-clear-all');

    // Global
    this.statTotalCount = document.getElementById('stat-total-count');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.toastContainer = document.getElementById('toast-container');

    // Lock Screen & Security Elements
    this.appWrapper = document.querySelector('.app-wrapper');
    this.lockScreenOverlay = document.getElementById('lock-screen-overlay');
    this.lockScreenTitle = document.getElementById('lock-screen-title');
    this.lockScreenDesc = document.getElementById('lock-screen-desc');
    this.lockScreenForm = document.getElementById('lock-screen-form');
    this.lockInputPassword = document.getElementById('lock-input-password');
    this.btnTogglePw = document.getElementById('btn-toggle-pw');
    this.lockRememberMe = document.getElementById('lock-remember-me');
    this.lockErrorMsg = document.getElementById('lock-error-msg');

    this.lockSetupForm = document.getElementById('lock-setup-form');
    this.lockSetupPassword = document.getElementById('lock-setup-password');
    this.lockSetupConfirm = document.getElementById('lock-setup-confirm');
    this.setupErrorMsg = document.getElementById('setup-error-msg');

    this.btnLockApp = document.getElementById('btn-lock-app');
    this.btnChangePassword = document.getElementById('btn-change-password');

    // Change Password Modal Elements
    this.changePwModal = document.getElementById('change-pw-modal');
    this.changePwForm = document.getElementById('change-pw-form');
    this.inputOldPw = document.getElementById('input-old-pw');
    this.inputNewPw = document.getElementById('input-new-pw');
    this.inputConfirmPw = document.getElementById('input-confirm-pw');
    this.changePwErrorMsg = document.getElementById('change-pw-error-msg');
    this.btnCloseChangePw = document.getElementById('btn-close-change-pw');
    this.changePwSyncInfo = document.getElementById('change-pw-sync-info');
    this.newMasterHashDisplay = document.getElementById('new-master-hash-display');
    this.btnCopyMasterHash = document.getElementById('btn-copy-master-hash');

    // Quick Edit Modal Elements
    this.quickEditModal = document.getElementById('quick-edit-modal');
    this.quickEditForm = document.getElementById('quick-edit-form');
    this.quickEditId = document.getElementById('quick-edit-id');
    this.quickEditHanzi = document.getElementById('quick-edit-hanzi');
    this.quickEditPinyin = document.getElementById('quick-edit-pinyin');
    this.quickEditPinyinChip = document.getElementById('quick-edit-pinyin-chip');
    this.quickEditHanviet = document.getElementById('quick-edit-hanviet');
    this.quickEditMeaningVn = document.getElementById('quick-edit-meaning-vn');
    this.quickEditMeaningEn = document.getElementById('quick-edit-meaning-en');
    this.quickEditExampleCn = document.getElementById('quick-edit-example-cn');
    this.quickEditExampleVn = document.getElementById('quick-edit-example-vn');
    this.btnCloseQuickEdit = document.getElementById('btn-close-quick-edit');
    this.btnCancelQuickEdit = document.getElementById('btn-cancel-quick-edit');
    this.quickEditVocabId = null;


    // Firebase Sync Elements
    this.btnFirebaseSync = document.getElementById('btn-firebase-sync');
    this.firebaseModal = document.getElementById('firebase-modal');
    this.firebaseForm = document.getElementById('firebase-form');
    this.firebaseConfigInput = document.getElementById('firebase-config-input');
    this.firebaseRoomInput = document.getElementById('firebase-room-input');
    this.firebaseStatusMsg = document.getElementById('firebase-status-msg');
    this.firebaseConnectedTools = document.getElementById('firebase-connected-tools');
    this.btnFirebaseShareLink = document.getElementById('btn-firebase-share-link');
    this.btnFirebaseDisconnect = document.getElementById('btn-firebase-disconnect');
    this.btnCloseFirebase = document.getElementById('btn-close-firebase');
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateThemeIcon();
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme_preference', this.currentTheme);
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
      this.themeToggleBtn.setAttribute('title', this.currentTheme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối');
    }
  }

  bindEvents() {
    // Tab switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Theme toggle
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Pinyin Auto-conversion on input & format lowercase on blur
    this.inputPinyin.addEventListener('input', (e) => this.handlePinyinInput(e));
    this.inputPinyin.addEventListener('blur', () => this.finalizePinyinConversion());

    // Live preview & Realtime Duplicate check on Hanzi input
    this.inputHanzi.addEventListener('input', () => {
      this.checkRealtimeDuplicate();
      this.updateLivePreview();
    });

    [this.inputPinyin, this.inputHanviet, this.inputMeaningVn, this.inputMeaningEn, this.inputExampleCn, this.inputExampleVn].forEach(el => {
      if (el) el.addEventListener('input', () => this.updateLivePreview());
    });

    // Auto-update formatting when user finishes typing a field (on blur)
    this.inputHanviet.addEventListener('blur', () => {
      if (this.inputHanviet.value) {
        const upper = formatHanViet(this.inputHanviet.value);
        this.inputHanviet.value = upper !== '-' ? upper : '';
      }
      this.updateLivePreview();
    });

    this.inputMeaningVn.addEventListener('blur', () => {
      if (this.inputMeaningVn.value) {
        this.inputMeaningVn.value = capitalizeFirstLetter(this.inputMeaningVn.value);
      }
      this.updateLivePreview();
    });

    this.inputMeaningEn.addEventListener('blur', () => {
      if (this.inputMeaningEn.value) {
        this.inputMeaningEn.value = capitalizeFirstLetter(this.inputMeaningEn.value);
      }
      this.updateLivePreview();
    });

    if (this.inputExampleVn) {
      this.inputExampleVn.addEventListener('blur', () => {
        if (this.inputExampleVn.value) {
          this.inputExampleVn.value = capitalizeFirstLetter(this.inputExampleVn.value);
        }
      });
    }

    // Cancel Edit Mode Buttons
    if (this.btnCancelEditBanner) {
      this.btnCancelEditBanner.addEventListener('click', () => this.exitEditMode());
    }
    if (this.btnCancelEditForm) {
      this.btnCancelEditForm.addEventListener('click', () => this.exitEditMode());
    }

    // Quick Edit button in inline duplicate badge
    if (this.btnQuickEditDup) {
      this.btnQuickEditDup.addEventListener('click', () => {
        if (this.pendingDuplicateVocab) {
          this.editVocab(this.pendingDuplicateVocab.id);
        }
      });
    }

    // Duplicate Modal Dialog Actions
    if (this.btnModalClose) {
      this.btnModalClose.addEventListener('click', () => this.hideDuplicateModal());
    }
    if (this.btnModalEditExisting) {
      this.btnModalEditExisting.addEventListener('click', () => {
        if (this.pendingDuplicateVocab) {
          const id = this.pendingDuplicateVocab.id;
          this.hideDuplicateModal();
          this.editVocab(id);
        }
      });
    }
    if (this.duplicateModal) {
      this.duplicateModal.addEventListener('click', (e) => {
        if (e.target === this.duplicateModal) {
          this.hideDuplicateModal();
        }
      });
    }

    // Quick Tone Buttons in Form
    document.querySelectorAll('.tone-pill-btn').forEach(pill => {
      pill.addEventListener('click', () => {
        const toneChar = pill.getAttribute('data-char');
        this.insertPinyinChar(toneChar);
      });
    });

    // Add / Edit Vocab submit
    this.vocabForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddVocabSubmit();
    });

    // Review Actions
    this.btnReveal.addEventListener('click', () => this.revealReviewCard());
    this.btnNextWord.addEventListener('click', () => this.nextReviewWord());
    this.btnRestartReview.addEventListener('click', () => this.initReviewSession());
    this.btnAudioReview.addEventListener('click', () => {
      // Chỉ cho phép phát âm khi thẻ đã được lật kết quả (tránh lộ đáp án)
      if (!this.isCardRevealed) return;
      if (this.reviewDeck.length === 0) return;
      const currentWord = this.reviewDeck[this.reviewIndex];
      if (currentWord) {
        this.speakChinese(currentWord.hanzi);
      }
    });
    if (this.btnEditReview) {
      this.btnEditReview.addEventListener('click', () => {
        if (this.reviewDeck.length === 0) return;
        const currentWord = this.reviewDeck[this.reviewIndex];
        if (currentWord) {
          this.openQuickEditModal(currentWord.id);
        }
      });
    }

    // Keyboard Shortcuts for Review
    window.addEventListener('keydown', (e) => {
      if (this.isLocked || this.vocabList.length === 0) return;

      // Close Quick Edit Modal on Escape
      if (e.key === 'Escape' && this.quickEditModal && this.quickEditModal.style.display === 'flex') {
        this.closeQuickEditModal();
        return;
      }
      if (e.key === 'Escape' && this.firebaseModal && this.firebaseModal.style.display === 'flex') {
        this.closeFirebaseModal();
        return;
      }
      // If Quick Edit Modal is active, block review shortcuts
      if (this.quickEditModal && this.quickEditModal.style.display === 'flex') return;
      if (this.firebaseModal && this.firebaseModal.style.display === 'flex') return;

      const activeTab = document.querySelector('.tab-content.active');
      if (!activeTab || activeTab.id !== 'tab-review') return;
      
      // Ignore if user is inside an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!this.isCardRevealed) {
          this.revealReviewCard();
        } else {
          this.nextReviewWord();
        }
      } else if (e.code === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        if (this.isCardRevealed) {
          this.nextReviewWord();
        }
      }
    });

    // Quick Edit Modal Event Listeners
    if (this.quickEditPinyin) {
      this.quickEditPinyin.addEventListener('input', () => {
        const val = this.quickEditPinyin.value;
        const converted = formatPinyin(val);
        if (val !== converted) {
          this.quickEditPinyin.value = converted;
        }
        if (this.quickEditPinyinChip) {
          this.quickEditPinyinChip.textContent = converted || '';
        }
      });
    }

    if (this.quickEditHanviet) {
      this.quickEditHanviet.addEventListener('input', () => {
        this.quickEditHanviet.value = formatHanViet(this.quickEditHanviet.value);
      });
    }

    document.querySelectorAll('.modal-tone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const char = btn.getAttribute('data-char');
        this.insertModalToneChar(char);
      });
    });

    if (this.quickEditForm) {
      this.quickEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleQuickEditSubmit();
      });
    }

    if (this.btnCloseQuickEdit) {
      this.btnCloseQuickEdit.addEventListener('click', () => this.closeQuickEditModal());
    }

    if (this.btnCancelQuickEdit) {
      this.btnCancelQuickEdit.addEventListener('click', () => this.closeQuickEditModal());
    }

    if (this.quickEditModal) {
      this.quickEditModal.addEventListener('click', (e) => {
        if (e.target === this.quickEditModal) {
          this.closeQuickEditModal();
        }
      });
    }

    // Bank Search
    this.bankSearchInput.addEventListener('input', () => this.renderVocabBank());

    // JSON Export / Import
    this.btnExportJson.addEventListener('click', () => this.exportVocabJson());
    this.btnImportJson.addEventListener('click', () => this.fileImportInput.click());
    this.fileImportInput.addEventListener('change', (e) => this.importVocabJson(e));

    // Reset / Restore Sample
    if (this.btnResetSample) {
      this.btnResetSample.addEventListener('click', () => this.restoreSampleVocab());
    }

    // Clear All Vocab
    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => this.clearAllVocab());
    }

    // Empty State Restore Sample Button
    if (this.btnEmptyRestoreSample) {
      this.btnEmptyRestoreSample.addEventListener('click', () => this.restoreSampleVocab());
    }

    // Lock Screen & Security Events
    if (this.btnTogglePw && this.lockInputPassword) {
      this.btnTogglePw.addEventListener('click', () => {
        const isPassword = this.lockInputPassword.type === 'password';
        this.lockInputPassword.type = isPassword ? 'text' : 'password';
        this.btnTogglePw.textContent = isPassword ? '🙈' : '👁️';
      });
    }

    if (this.lockScreenForm) {
      this.lockScreenForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUnlockSubmit();
      });
    }

    if (this.lockSetupForm) {
      this.lockSetupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSetupPasswordSubmit();
      });
    }

    if (this.btnLockApp) {
      this.btnLockApp.addEventListener('click', () => this.lockApp());
    }

    if (this.btnChangePassword) {
      this.btnChangePassword.addEventListener('click', () => this.openChangePasswordModal());
    }

    if (this.btnCloseChangePw) {
      this.btnCloseChangePw.addEventListener('click', () => this.closeChangePasswordModal());
    }

    if (this.changePwModal) {
      this.changePwModal.addEventListener('click', (e) => {
        if (e.target === this.changePwModal) {
          this.closeChangePasswordModal();
        }
      });
    }

    if (this.changePwForm) {
      this.changePwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleChangePasswordSubmit();
      });
    }

    // Firebase Realtime Sync
    if (this.btnFirebaseSync) {
      this.btnFirebaseSync.addEventListener('click', () => this.openFirebaseModal());
    }
    if (this.firebaseForm) {
      this.firebaseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFirebaseSubmit();
      });
    }
    if (this.btnFirebaseDisconnect) {
      this.btnFirebaseDisconnect.addEventListener('click', () => this.handleFirebaseDisconnect());
    }
    if (this.btnFirebaseShareLink) {
      this.btnFirebaseShareLink.addEventListener('click', () => this.copyFirebaseShareLink());
    }
    if (this.btnCloseFirebase) {
      this.btnCloseFirebase.addEventListener('click', () => this.closeFirebaseModal());
    }
    if (this.firebaseModal) {
      this.firebaseModal.addEventListener('click', (e) => {
        if (e.target === this.firebaseModal) this.closeFirebaseModal();
      });
    }


    if (this.btnCopyMasterHash && this.newMasterHashDisplay) {
      this.btnCopyMasterHash.addEventListener('click', () => {
        const val = this.newMasterHashDisplay.value;
        if (!val) return;
        navigator.clipboard.writeText(val).then(() => {
          this.btnCopyMasterHash.textContent = '✅ Đã chép!';
          setTimeout(() => {
            this.btnCopyMasterHash.textContent = '📋 Sao chép';
          }, 2000);
        }).catch(() => {
          this.newMasterHashDisplay.select();
          document.execCommand('copy');
          this.btnCopyMasterHash.textContent = '✅ Đã chép!';
          setTimeout(() => {
            this.btnCopyMasterHash.textContent = '📋 Sao chép';
          }, 2000);
        });
      });
    }
  }

  switchTab(tabId) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    this.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    if (tabId === 'review') {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (this.vocabList.length === 0) {
        this.showEmptyState();
      } else if (this.reviewDeck.length === 0 || this.reviewIndex >= this.reviewDeck.length) {
        this.initReviewSession();
      }
    } else if (tabId === 'bank') {
      this.renderVocabBank();
    }
  }

  // Real-time Pinyin Conversion
  handlePinyinInput(e) {
    const input = this.inputPinyin;
    const original = input.value;

    // Check if user typed a number 1-5 or space or letter
    // If text contains [a-zA-Z]+[1-5], convert immediately!
    const converted = convertPinyinText(original);

    if (converted !== original) {
      // Preserve cursor position as much as possible
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const diff = original.length - converted.length;

      input.value = converted;
      const newPos = Math.max(0, start - diff);
      input.setSelectionRange(newPos, newPos);
    }

    // Update live badge chip
    if (this.pinyinLiveChip) {
      this.pinyinLiveChip.textContent = converted || '(Trống)';
    }

    this.updateLivePreview();
  }

  finalizePinyinConversion() {
    this.inputPinyin.value = formatPinyin(this.inputPinyin.value);
    if (this.pinyinLiveChip) {
      this.pinyinLiveChip.textContent = this.inputPinyin.value || '(Trống)';
    }
    this.updateLivePreview();
  }

  insertPinyinChar(char) {
    const input = this.inputPinyin;
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;
    input.value = val.substring(0, start) + char + val.substring(end);
    const newPos = start + char.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    this.handlePinyinInput();
  }

  updateLivePreview() {
    const hanzi = this.inputHanzi.value.trim() || '学习';
    const pinyin = formatPinyin(this.inputPinyin.value) || 'xué xí';
    const rawHanviet = this.inputHanviet.value.trim();
    const hanviet = rawHanviet ? formatHanViet(rawHanviet) : 'HỌC TẬP';
    const vn = capitalizeFirstLetter(this.inputMeaningVn.value) || 'Nghĩa tiếng Việt của từ';
    const en = capitalizeFirstLetter(this.inputMeaningEn.value) || 'English definition of the word';

    this.previewHanzi.textContent = hanzi;
    this.previewPinyin.textContent = pinyin;
    this.previewHanviet.textContent = hanviet;
    this.previewVn.textContent = vn;
    this.previewEn.textContent = en;
  }

  // Realtime check for duplicates as user types Hanzi
  checkRealtimeDuplicate() {
    if (!this.inputHanzi || !this.hanziDuplicateWarning) return null;
    const hanzi = this.inputHanzi.value.trim();
    if (!hanzi) {
      this.hanziDuplicateWarning.style.display = 'none';
      this.pendingDuplicateVocab = null;
      return null;
    }

    const dup = this.vocabList.find(x => 
      x && x.hanzi && x.hanzi.trim().toLowerCase() === hanzi.toLowerCase() &&
      x.id !== this.editingVocabId
    );

    if (dup) {
      this.pendingDuplicateVocab = dup;
      this.dupHanziText.textContent = dup.hanzi;
      this.dupMeaningText.textContent = `(${dup.meaningVn})`;
      this.hanziDuplicateWarning.style.display = 'flex';
      return dup;
    } else {
      this.pendingDuplicateVocab = null;
      this.hanziDuplicateWarning.style.display = 'none';
      return null;
    }
  }

  showDuplicateModal(item) {
    if (!this.duplicateModal) return;
    this.pendingDuplicateVocab = item;
    if (this.modalDupHanzi) this.modalDupHanzi.textContent = item.hanzi;
    if (this.modalDupPinyin) this.modalDupPinyin.textContent = formatPinyin(item.pinyin);
    if (this.modalDupHanviet) this.modalDupHanviet.textContent = item.hanviet !== '-' ? `Âm Hán-Việt: ${formatHanViet(item.hanviet)}` : '';
    if (this.modalDupVn) this.modalDupVn.textContent = capitalizeFirstLetter(item.meaningVn);
    if (this.modalDupEn) this.modalDupEn.textContent = item.meaningEn !== '-' ? capitalizeFirstLetter(item.meaningEn) : '';
    this.duplicateModal.style.display = 'flex';
  }

  hideDuplicateModal() {
    if (this.duplicateModal) {
      this.duplicateModal.style.display = 'none';
    }
  }

  editVocab(id) {
    this.openQuickEditModal(id);
  }

  openQuickEditModal(id) {
    const item = this.vocabList.find(x => x.id === id);
    if (!item) return;

    this.quickEditVocabId = id;
    if (this.quickEditId) this.quickEditId.value = id;
    if (this.quickEditHanzi) this.quickEditHanzi.value = item.hanzi;
    if (this.quickEditPinyin) this.quickEditPinyin.value = item.pinyin;
    if (this.quickEditPinyinChip) this.quickEditPinyinChip.textContent = item.pinyin;
    if (this.quickEditHanviet) this.quickEditHanviet.value = item.hanviet !== '-' ? item.hanviet : '';
    if (this.quickEditMeaningVn) this.quickEditMeaningVn.value = item.meaningVn;
    if (this.quickEditMeaningEn) this.quickEditMeaningEn.value = item.meaningEn !== '-' ? item.meaningEn : '';
    if (this.quickEditExampleCn) this.quickEditExampleCn.value = item.exampleCn || '';
    if (this.quickEditExampleVn) this.quickEditExampleVn.value = item.exampleVn || '';

    if (this.quickEditModal) {
      this.quickEditModal.style.display = 'flex';
      setTimeout(() => {
        if (this.quickEditHanzi) this.quickEditHanzi.focus();
      }, 50);
    }
  }

  closeQuickEditModal() {
    if (this.quickEditModal) {
      this.quickEditModal.style.display = 'none';
    }
    this.quickEditVocabId = null;
  }

  insertModalToneChar(char) {
    if (!this.quickEditPinyin) return;
    const input = this.quickEditPinyin;
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;
    input.value = val.substring(0, start) + char + val.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + char.length;
    if (this.quickEditPinyinChip) {
      this.quickEditPinyinChip.textContent = input.value;
    }
  }

  handleQuickEditSubmit() {
    const id = this.quickEditVocabId;
    if (!id) return;

    const hanzi = this.quickEditHanzi.value.trim();
    let pinyin = this.quickEditPinyin.value.trim();
    let hanviet = this.quickEditHanviet.value.trim();
    let meaningVn = this.quickEditMeaningVn.value.trim();
    let meaningEn = this.quickEditMeaningEn.value.trim();
    const exampleCn = this.quickEditExampleCn.value.trim();
    let exampleVn = this.quickEditExampleVn.value.trim();

    if (!hanzi) {
      this.showToast('Vui lòng nhập Hán tự!', 'error');
      this.quickEditHanzi.focus();
      return;
    }
    if (!pinyin) {
      this.showToast('Vui lòng nhập Pinyin!', 'error');
      this.quickEditPinyin.focus();
      return;
    }
    if (!meaningVn) {
      this.showToast('Vui lòng nhập ý nghĩa tiếng Việt!', 'error');
      this.quickEditMeaningVn.focus();
      return;
    }

    // Auto-update formatting rules:
    pinyin = formatPinyin(pinyin);
    hanviet = formatHanViet(hanviet);
    meaningVn = capitalizeFirstLetter(meaningVn);
    meaningEn = meaningEn ? capitalizeFirstLetter(meaningEn) : '-';
    exampleVn = exampleVn ? capitalizeFirstLetter(exampleVn) : '';

    // Check duplicate against existing vocabulary list (excluding current item)
    const duplicate = this.vocabList.find(x => 
      x && x.hanzi && x.hanzi.trim().toLowerCase() === hanzi.toLowerCase() &&
      x.id !== id
    );

    if (duplicate) {
      this.showToast(`Từ "${hanzi}" đã tồn tại trong kho từ vựng!`, 'warning');
      return;
    }

    const index = this.vocabList.findIndex(x => x.id === id);
    if (index === -1) return;

    const updatedItem = {
      ...this.vocabList[index],
      hanzi,
      pinyin,
      hanviet: hanviet || '-',
      meaningVn,
      meaningEn: meaningEn || '-',
      exampleCn: exampleCn || '',
      exampleVn: exampleVn || '',
      updatedAt: Date.now()
    };

    this.vocabList[index] = updatedItem;
    this.saveVocabList(this.vocabList);

    // CRITICAL: Update review deck in-place without wiping review progress!
    if (this.reviewDeck && this.reviewDeck.length > 0) {
      const currentReviewWord = this.reviewDeck[this.reviewIndex];
      if (currentReviewWord && currentReviewWord.id === id) {
        this.reviewDeck[this.reviewIndex] = updatedItem;
        const wasRevealed = this.isCardRevealed;
        this.renderCurrentReviewWord();
        if (wasRevealed) {
          this.revealReviewCard();
        }
      } else {
        const deckIdx = this.reviewDeck.findIndex(x => x.id === id);
        if (deckIdx !== -1) {
          this.reviewDeck[deckIdx] = updatedItem;
        }
      }
    }

    // Refresh bank view
    this.renderVocabBank();

    // Close modal
    this.closeQuickEditModal();
    this.showToast(`Đã cập nhật thành công từ "${hanzi}"!`, 'success');
  }

  startFullFormEdit(id) {
    const item = this.vocabList.find(x => x.id === id);
    if (!item) return;

    this.editingVocabId = id;
    this.switchTab('add');

    // Populate form fields with existing data
    this.inputHanzi.value = item.hanzi;
    this.inputPinyin.value = item.pinyin;
    this.inputHanviet.value = item.hanviet !== '-' ? item.hanviet : '';
    this.inputMeaningVn.value = item.meaningVn;
    this.inputMeaningEn.value = item.meaningEn !== '-' ? item.meaningEn : '';
    this.inputExampleCn.value = item.exampleCn || '';
    this.inputExampleVn.value = item.exampleVn || '';
    if (this.pinyinLiveChip) this.pinyinLiveChip.textContent = item.pinyin;

    // Update Form UI for editing state
    if (this.editingStatusBanner) {
      this.editingStatusBanner.style.display = 'flex';
    }
    if (this.editingWordTitle) {
      this.editingWordTitle.textContent = `${item.hanzi} (${item.pinyin})`;
    }
    if (this.formHeadingTitle) {
      this.formHeadingTitle.innerHTML = '<span>✏️</span> Chỉnh sửa từ vựng';
    }
    if (this.formHeadingDesc) {
      this.formHeadingDesc.textContent = 'Thay đổi thông tin và nhấn "Cập nhật từ vựng" để lưu lại.';
    }
    if (this.submitBtnIcon) this.submitBtnIcon.textContent = '💾';
    if (this.submitBtnText) this.submitBtnText.textContent = 'Cập nhật từ vựng';
    if (this.btnCancelEditForm) this.btnCancelEditForm.style.display = 'inline-block';
    if (this.tabAddIcon) this.tabAddIcon.textContent = '✏️';
    if (this.tabAddTitle) this.tabAddTitle.textContent = 'Sửa từ';

    if (this.hanziDuplicateWarning) {
      this.hanziDuplicateWarning.style.display = 'none';
    }

    this.updateLivePreview();
    window.scrollTo({ top: 120, behavior: 'smooth' });
    this.inputHanzi.focus();
  }

  exitEditMode() {
    this.editingVocabId = null;
    this.pendingDuplicateVocab = null;
    this.vocabForm.reset();
    if (this.pinyinLiveChip) this.pinyinLiveChip.textContent = '(Trống)';

    if (this.editingStatusBanner) {
      this.editingStatusBanner.style.display = 'none';
    }
    if (this.formHeadingTitle) {
      this.formHeadingTitle.innerHTML = '<span>➕</span> Thêm từ vựng tiếng Trung mới';
    }
    if (this.formHeadingDesc) {
      this.formHeadingDesc.textContent = 'Nhập thông tin từ vựng. Pinyin tự động chuyển thanh điệu theo số (ví dụ: ma1 → mā).';
    }
    if (this.submitBtnIcon) this.submitBtnIcon.textContent = '💾';
    if (this.submitBtnText) this.submitBtnText.textContent = 'Lưu từ vựng vào kho';
    if (this.btnCancelEditForm) this.btnCancelEditForm.style.display = 'none';
    if (this.tabAddIcon) this.tabAddIcon.textContent = '➕';
    if (this.tabAddTitle) this.tabAddTitle.textContent = 'Thêm từ mới';
    if (this.hanziDuplicateWarning) this.hanziDuplicateWarning.style.display = 'none';

    this.updateLivePreview();
  }

  handleAddVocabSubmit() {
    const hanzi = this.inputHanzi.value.trim();
    let pinyin = this.inputPinyin.value.trim();
    let hanviet = this.inputHanviet.value.trim();
    let meaningVn = this.inputMeaningVn.value.trim();
    let meaningEn = this.inputMeaningEn.value.trim();
    const exampleCn = this.inputExampleCn.value.trim();
    let exampleVn = this.inputExampleVn.value.trim();

    if (!hanzi) {
      this.showToast('Vui lòng nhập Hán tự!', 'error');
      this.inputHanzi.focus();
      return;
    }
    if (!pinyin) {
      this.showToast('Vui lòng nhập Pinyin!', 'error');
      this.inputPinyin.focus();
      return;
    }
    if (!meaningVn) {
      this.showToast('Vui lòng nhập ý nghĩa tiếng Việt!', 'error');
      this.inputMeaningVn.focus();
      return;
    }

    // Auto-update formatting rules:
    // 1. Pinyin strictly lowercase
    pinyin = formatPinyin(pinyin);
    // 2. Sino-Vietnamese reading strictly uppercase
    hanviet = formatHanViet(hanviet);
    // 3. Meaning & Examples capitalize first letter
    meaningVn = capitalizeFirstLetter(meaningVn);
    meaningEn = meaningEn ? capitalizeFirstLetter(meaningEn) : '-';
    exampleVn = exampleVn ? capitalizeFirstLetter(exampleVn) : '';

    // Check duplicate against existing vocabulary list
    const duplicate = this.vocabList.find(x => 
      x && x.hanzi && x.hanzi.trim().toLowerCase() === hanzi.toLowerCase() &&
      x.id !== this.editingVocabId
    );

    if (duplicate) {
      this.showDuplicateModal(duplicate);
      this.showToast(`Từ "${hanzi}" đã tồn tại trong kho từ vựng!`, 'warning');
      return;
    }

    if (this.editingVocabId) {
      // UPDATE EXISTING VOCABULARY
      const index = this.vocabList.findIndex(x => x.id === this.editingVocabId);
      if (index !== -1) {
        this.vocabList[index] = {
          ...this.vocabList[index],
          hanzi,
          pinyin,
          hanviet: hanviet || '-',
          meaningVn,
          meaningEn: meaningEn || '-',
          exampleCn: exampleCn || '',
          exampleVn: exampleVn || '',
          updatedAt: Date.now()
        };
        this.saveVocabList(this.vocabList);
        this.showToast(`Đã cập nhật thành công từ "${hanzi}"!`, 'success');
      }

      this.exitEditMode();
      // Update in reviewDeck without losing review progress!
      if (this.reviewDeck && this.reviewDeck.length > 0) {
        const deckIdx = this.reviewDeck.findIndex(x => x.id === this.editingVocabId);
        if (deckIdx !== -1) {
          this.reviewDeck[deckIdx] = { ...this.vocabList[index] };
          if (deckIdx === this.reviewIndex) {
            const wasRevealed = this.isCardRevealed;
            this.renderCurrentReviewWord();
            if (wasRevealed) this.revealReviewCard();
          }
        }
      }
      this.renderVocabBank();
      this.switchTab('bank');
      return;
    }

    // ADD NEW VOCABULARY
    const newVocab = {
      id: 'vocab-' + Date.now(),
      hanzi,
      pinyin,
      hanviet: hanviet || '-',
      meaningVn,
      meaningEn: meaningEn || '-',
      exampleCn: exampleCn || '',
      exampleVn: exampleVn || '',
      createdAt: Date.now()
    };

    // Save to beginning of array
    const updatedList = [newVocab, ...this.vocabList];
    this.saveVocabList(updatedList);

    // Reset Form
    this.vocabForm.reset();
    if (this.pinyinLiveChip) this.pinyinLiveChip.textContent = '(Trống)';
    this.updateLivePreview();

    this.showToast(`Đã thêm thành công từ "${hanzi}"!`, 'success');

    // If review deck is active, preserve progress and append new word
    if (this.reviewDeck && this.reviewDeck.length > 0 && this.reviewIndex < this.reviewDeck.length) {
      this.reviewDeck.push(newVocab);
      this.renderVocabBank();
    } else {
      this.initReviewSession();
      this.renderVocabBank();
    }
  }

  // ==========================================
  // REVIEW ENGINE (FLASHCARD RANDOM QUEUE)
  // ==========================================
  initReviewSession() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this.vocabList.length === 0) {
      this.reviewDeck = [];
      this.reviewIndex = 0;
      this.isCardRevealed = false;
      this.showEmptyState();
      return;
    }

    if (this.reviewEmptyState) this.reviewEmptyState.style.display = 'none';

    // Shuffle vocabulary deck using Fisher-Yates
    this.reviewDeck = this.shuffleArray([...this.vocabList]);
    this.reviewIndex = 0;
    this.isCardRevealed = false;

    this.renderCurrentReviewWord();
  }

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  renderCurrentReviewWord() {
    if (this.vocabList.length === 0 || this.reviewDeck.length === 0) {
      this.showEmptyState();
      return;
    }

    if (this.reviewIndex >= this.reviewDeck.length) {
      // Completed all words in the round!
      this.showCompletionScreen();
      return;
    }

    const word = this.reviewDeck[this.reviewIndex];
    if (!word) {
      this.showEmptyState();
      return;
    }

    const total = this.reviewDeck.length;
    const currentNum = this.reviewIndex + 1;

    // Show review card, hide completion & empty state
    if (this.reviewEmptyState) this.reviewEmptyState.style.display = 'none';
    this.reviewCard.style.display = 'flex';
    this.reviewCompletion.style.display = 'none';

    // Update Progress
    this.reviewProgressText.textContent = `Từ ${currentNum} / ${total}`;
    const percent = Math.round((currentNum / total) * 100);
    this.reviewProgressBar.style.width = `${percent}%`;

    // 1. Initial State: Only display the Meanings (Vietnamese & English with capitalized first letter)
    this.reviewPromptVn.textContent = capitalizeFirstLetter(word.meaningVn);
    this.reviewPromptEn.textContent = word.meaningEn !== '-' ? capitalizeFirstLetter(word.meaningEn) : '';
    
    // Hide revealed details
    this.isCardRevealed = false;
    this.reviewRevealArea.classList.remove('visible');
    if (this.btnEditReview) this.btnEditReview.style.display = 'inline-flex';
    if (this.btnAudioReview) this.btnAudioReview.style.display = 'none';

    // Reset buttons
    this.btnReveal.style.display = 'flex';
    this.btnReveal.innerHTML = '<span>👁️</span> Hiện kết quả (Hoàn thành)';
    this.btnNextWord.style.display = 'none';

    // Populate revealed section data for when reveal is triggered
    this.reviewHanzi.textContent = word.hanzi;
    this.reviewPinyin.textContent = formatPinyin(word.pinyin);
    this.reviewHanviet.textContent = formatHanViet(word.hanviet);
    
    if (word.exampleCn) {
      this.reviewExampleBox.style.display = 'block';
      this.reviewExampleCn.textContent = word.exampleCn;
      this.reviewExampleVn.textContent = word.exampleVn || '';
    } else {
      this.reviewExampleBox.style.display = 'none';
    }
  }

  revealReviewCard() {
    if (this.isCardRevealed) return;
    if (this.reviewDeck.length === 0 || !this.reviewDeck[this.reviewIndex]) return;

    this.isCardRevealed = true;
    this.reviewRevealArea.classList.add('visible');

    // Switch buttons: hide Reveal button, display "Từ tiếp theo", "Chỉnh sửa" and "Phát âm"
    this.btnReveal.style.display = 'none';
    this.btnNextWord.style.display = 'inline-flex';
    if (this.btnEditReview) this.btnEditReview.style.display = 'inline-flex';
    if (this.btnAudioReview) this.btnAudioReview.style.display = 'inline-flex';

    // Auto-pronounce Hanzi audio
    const currentWord = this.reviewDeck[this.reviewIndex];
    if (currentWord) {
      this.speakChinese(currentWord.hanzi);
    }
  }

  nextReviewWord() {
    if (this.reviewDeck.length === 0) return;
    this.reviewIndex++;
    this.renderCurrentReviewWord();
  }

  showCompletionScreen() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this.reviewEmptyState) this.reviewEmptyState.style.display = 'none';
    this.reviewCard.style.display = 'none';
    this.reviewCompletion.style.display = 'flex';
    this.reviewProgressText.textContent = `Đã hoàn thành ${this.reviewDeck.length} / ${this.reviewDeck.length} từ`;
    this.reviewProgressBar.style.width = '100%';

    const countElem = document.getElementById('completed-count-text');
    if (countElem) {
      countElem.textContent = `Bạn đã ôn tập toàn bộ ${this.reviewDeck.length} từ vựng trong kho!`;
    }
  }

  showEmptyState() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.reviewDeck = [];
    this.reviewIndex = 0;
    this.isCardRevealed = false;

    if (this.reviewCard) this.reviewCard.style.display = 'none';
    if (this.reviewCompletion) this.reviewCompletion.style.display = 'none';
    if (this.reviewEmptyState) this.reviewEmptyState.style.display = 'flex';
    if (this.reviewProgressText) this.reviewProgressText.textContent = '0 / 0 từ';
    if (this.reviewProgressBar) this.reviewProgressBar.style.width = '0%';
  }

  // ==========================================
  // VOCABULARY BANK (SEARCH / DELETE / PLAY)
  // ==========================================
  renderVocabBank() {
    if (!this.bankGrid) return;

    const query = (this.bankSearchInput ? this.bankSearchInput.value : '').toLowerCase().trim();
    
    const filtered = this.vocabList.filter(item => {
      if (!item) return false;
      if (!query) return true;
      const hz = (item.hanzi || '').toString().toLowerCase();
      const py = (item.pinyin || '').toString().toLowerCase();
      const hv = (item.hanviet || '').toString().toLowerCase();
      const vn = (item.meaningVn || '').toString().toLowerCase();
      const en = (item.meaningEn || '').toString().toLowerCase();
      const exCn = (item.exampleCn || '').toString().toLowerCase();
      const exVn = (item.exampleVn || '').toString().toLowerCase();

      return (
        hz.includes(query) ||
        py.includes(query) ||
        hv.includes(query) ||
        vn.includes(query) ||
        en.includes(query) ||
        exCn.includes(query) ||
        exVn.includes(query)
      );
    });

    if (filtered.length === 0) {
      this.bankGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <p>Không tìm thấy từ vựng nào phù hợp với từ khóa "${this.escapeHtml(query)}".</p>
        </div>
      `;
      return;
    }

    this.bankGrid.innerHTML = filtered.map(item => `
      <div class="vocab-card" id="card-${item.id}">
        <div>
          <div class="vocab-card-header">
            <div>
              <div class="vocab-card-hanzi">${this.escapeHtml(item.hanzi || '')}</div>
              <div class="vocab-card-pinyin">${this.escapeHtml(formatPinyin(item.pinyin || ''))}</div>
            </div>
            <button class="audio-trigger-btn" style="width: 36px; height: 36px; font-size: 1rem;" 
                    onclick="app.speakChinese('${this.escapeQuotes(item.hanzi || '')}')" title="Nghe phát âm">
              🔊
            </button>
          </div>
          <div class="vocab-card-hanviet">Âm Hán-Việt: ${this.escapeHtml(formatHanViet(item.hanviet || ''))}</div>
          <div class="vocab-card-meanings">
            <div class="vocab-card-vn">🇻🇳 ${this.escapeHtml(capitalizeFirstLetter(item.meaningVn || ''))}</div>
            <div class="vocab-card-en">🇬🇧 ${this.escapeHtml(capitalizeFirstLetter(item.meaningEn || ''))}</div>
          </div>
          ${item.exampleCn ? `
            <div style="margin-top: 0.6rem; font-size: 0.85rem; color: var(--text-muted); background: rgba(0,0,0,0.15); padding: 0.4rem 0.6rem; border-radius: 6px;">
              <div style="color: var(--text-primary); font-family: var(--font-hanzi);">${this.escapeHtml(item.exampleCn)}</div>
              <div style="font-size: 0.8rem;">${this.escapeHtml(item.exampleVn || '')}</div>
            </div>
          ` : ''}
        </div>
        <div class="vocab-card-footer">
          <span style="font-size: 0.75rem; color: var(--text-muted);">ID: ${(item.id || '').toString().replace('vocab-', '#')}</span>
          <div class="card-actions-row">
            <button class="card-icon-btn edit" onclick="app.editVocab('${item.id}')" title="Chỉnh sửa từ vựng này">
              ✏️
            </button>
            <button class="card-icon-btn delete" onclick="app.deleteVocab('${item.id}')" title="Xóa từ vựng này">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  deleteVocab(id) {
    const item = this.vocabList.find(x => x.id === id);
    if (!item) return;

    if (confirm(`Bạn có chắc chắn muốn xóa từ "${item.hanzi}" (${item.pinyin}) khỏi kho từ vựng không?`)) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      const updated = this.vocabList.filter(x => x.id !== id);
      this.saveVocabList(updated);
      this.renderVocabBank();
      this.initReviewSession();
      this.showToast(`Đã xóa từ "${item.hanzi}".`, 'info');
    }
  }

  clearAllVocab() {
    if (this.vocabList.length === 0) {
      this.showToast('Kho từ vựng hiện đang trống.', 'info');
      return;
    }
    if (confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ từ vựng trong kho không? (Khuyên dùng: Bạn có thể bấm Xuất JSON để lưu bản dự phòng trước).')) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.saveVocabList([]);
      this.renderVocabBank();
      this.initReviewSession();
      this.showToast('Đã xóa toàn bộ từ vựng trong kho!', 'info');
    }
  }

  restoreSampleVocab() {
    if (!this.vocabList || this.vocabList.length === 0) {
      const defaults = DEFAULT_VOCABULARY.map((item, idx) => normalizeVocabItem(item, idx)).filter(Boolean);
      this.saveVocabList(defaults);
      this.renderVocabBank();
      this.initReviewSession();
      this.showToast('Đã nạp 7 từ vựng mẫu HSK ban đầu thành công!', 'success');
      return;
    }

    const confirmed = confirm(
      `Khôi phục danh sách từ vựng mẫu HSK ban đầu:\n\n` +
      `• Bấm [OK] để BỔ SUNG các từ mẫu vào kho (GIỮ NGUYÊN toàn bộ ${this.vocabList.length} từ bạn đã tự thêm).\n` +
      `• Bấm [Cancel] để HỦY BỎ (Không thay đổi dữ liệu hiện tại).\n\n` +
      `* Ghi chú: Nếu bạn muốn đặt lại kho chỉ còn 7 từ gốc và xóa hết từ khác, vui lòng bấm "🗑️ Xóa tất cả" trước rồi mới nạp lại mẫu.`
    );

    if (!confirmed) return;

    // Tìm các từ mẫu chưa có trong danh sách hiện tại
    const existingHanzi = new Set(this.vocabList.map(v => v.hanzi));
    const toAdd = DEFAULT_VOCABULARY
      .map((item, idx) => normalizeVocabItem(item, idx))
      .filter(Boolean)
      .filter(item => !existingHanzi.has(item.hanzi));

    if (toAdd.length === 0) {
      this.showToast('Tất cả 7 từ mẫu HSK đã có sẵn trong kho từ của bạn!', 'info');
      return;
    }

    const updated = [...this.vocabList, ...toAdd];
    this.saveVocabList(updated);
    this.renderVocabBank();
    this.initReviewSession();
    this.showToast(`Đã bổ sung ${toAdd.length} từ mẫu HSK vào kho (Giữ nguyên toàn bộ từ bạn đã tự thêm)!`, 'success');
  }

  updateStats() {
    const count = this.vocabList.length;
    if (this.statTotalCount) {
      this.statTotalCount.textContent = `${count} từ`;
    }
    const badgeCount = document.getElementById('tab-bank-badge');
    if (badgeCount) {
      badgeCount.textContent = count;
    }
  }

  // ==========================================
  // SPEECH SYNTHESIS (STANDARD MANDARIN VOICE)
  // ==========================================
  initVoiceEngine() {
    this.mandarinVoice = null;
    const findStandardMandarinVoice = () => {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // 1. Tuyệt đối loại trừ giọng Quảng Đông (zh-HK, yue) hoặc Macau (zh-MO)
      const isNotCantonese = (v) => {
        const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
        const name = (v.name || '').toLowerCase();
        return !lang.includes('hk') && !lang.includes('mo') && !lang.includes('yue') && 
               !name.includes('hong kong') && !name.includes('cantonese');
      };

      // 2. Tìm giọng chuẩn Trung Quốc Đại Lục (zh-CN, cmn-Hans, cmn-CN) với chất lượng cao (Natural/Neural/Online)
      const highQualityVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
        const name = (v.name || '').toLowerCase();
        return isNotCantonese(v) && 
               (lang === 'zh-cn' || lang === 'cmn-cn' || lang === 'cmn-hans-cn' || lang.startsWith('zh-cn')) &&
               (name.includes('natural') || name.includes('online') || name.includes('neural') ||
                name.includes('xiaoxiao') || name.includes('yunxi') || name.includes('yunyang') ||
                name.includes('google') || name.includes('普通话') || name.includes('huihui'));
      });

      if (highQualityVoices.length > 0) {
        this.mandarinVoice = highQualityVoices[0];
        return;
      }

      // 3. Tìm bất kỳ giọng zh-CN chuẩn nào
      const zhCnVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
        return isNotCantonese(v) && (lang === 'zh-cn' || lang === 'cmn-cn' || lang === 'cmn-hans-cn' || lang.startsWith('zh-cn'));
      });

      if (zhCnVoices.length > 0) {
        this.mandarinVoice = zhCnVoices[0];
        return;
      }

      // 4. Tìm giọng tiếng Trung chung (bỏ qua Cantonese)
      const generalZhVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase();
        return isNotCantonese(v) && (lang.startsWith('zh') || lang.startsWith('cmn'));
      });

      if (generalZhVoices.length > 0) {
        this.mandarinVoice = generalZhVoices[0];
      }
    };

    findStandardMandarinVoice();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        findStandardMandarinVoice();
      };
    }
  }

  speakChinese(text) {
    if (!text || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop previous
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // Standard Mandarin (Mainland China)
    utterance.rate = 0.85; // Slightly slower for clear pronunciation learning
    utterance.pitch = 1.0;

    if (!this.mandarinVoice && 'speechSynthesis' in window) {
      this.initVoiceEngine();
    }

    if (this.mandarinVoice) {
      utterance.voice = this.mandarinVoice;
    }

    window.speechSynthesis.speak(utterance);
  }


  parseRemoteVocab(text) {
    let list;
    try {
      list = extractVocabArray(JSON.parse(text));
    } catch (e) {
      console.error('vocab.json sai định dạng JSON:', e);
      return null;
    }
    if (!list) {
      console.error('vocab.json không chứa danh sách từ vựng.');
      return null;
    }
    return list.map((item, idx) => normalizeVocabItem(item, idx)).filter(Boolean);
  }

  /**
   * Gộp ba chiều giữa kho trên máy, vocab.json trên repo và danh sách Hán tự
   * ở lần đồng bộ trước (base), để phân biệt "từ mới thêm" với "từ đã bị xóa":
   * - Từ có ở cả hai nơi: giữ bản được sửa sau cùng
   * - Từ chỉ có trên repo: thêm vào máy, trừ khi base có nó (tức là máy này đã xóa)
   * - Từ chỉ có trên máy: giữ lại, trừ khi base có nó (tức là nơi khác đã xóa)
   */
  mergeWithRemote(remoteItems) {
    let base = null;
    try {
      const baseRaw = localStorage.getItem(STORAGE_REPO_BASE);
      if (baseRaw) base = new Set(JSON.parse(baseRaw));
    } catch (e) {
      base = null;
    }

    const timeOf = (item) => item.updatedAt || item.createdAt || 0;
    const remoteByHanzi = new Map(remoteItems.map(item => [item.hanzi, item]));
    const seenHanzi = new Set();
    const usedIds = new Set();
    const merged = [];
    const added = [];
    const updated = [];
    const removed = [];

    this.vocabList.forEach(local => {
      seenHanzi.add(local.hanzi);
      const remote = remoteByHanzi.get(local.hanzi);
      if (!remote) {
        if (base && base.has(local.hanzi)) {
          removed.push(local);
          return;
        }
        merged.push(local);
      } else if (timeOf(remote) > timeOf(local)) {
        const item = { ...remote, id: local.id, createdAt: local.createdAt };
        merged.push(item);
        updated.push(item);
      } else {
        merged.push(local);
      }
      usedIds.add(local.id);
    });

    remoteItems.forEach((remote, i) => {
      if (seenHanzi.has(remote.hanzi)) return;
      seenHanzi.add(remote.hanzi);
      if (base && base.has(remote.hanzi)) return;
      // Đổi id nếu trùng id của một từ khác trên máy
      const item = usedIds.has(remote.id) ? { ...remote, id: `vocab-${Date.now()}-${i}` } : remote;
      usedIds.add(item.id);
      merged.push(item);
      added.push(item);
    });

    return { merged, added, updated, removed };
  }

  applyRemoteMerge(remoteItems) {
    const { merged, added, updated, removed } = this.mergeWithRemote(remoteItems);
    this.saveRepoBase(remoteItems);

    if (added.length === 0 && updated.length === 0 && removed.length === 0) return;

    this.isApplyingRemote = true;
    this.saveVocabList(merged);
    this.isApplyingRemote = false;
    this.renderVocabBank();
    this.applyChangesToReviewDeck(added, updated, removed);

    const parts = [];
    if (added.length) parts.push(`thêm ${added.length}`);
    if (updated.length) parts.push(`cập nhật ${updated.length}`);
    if (removed.length) parts.push(`xóa ${removed.length}`);
    this.showToast(`Đã đồng bộ từ vocab.json: ${parts.join(', ')} từ.`, 'success');
  }

  saveRepoBase(items) {
    localStorage.setItem(STORAGE_REPO_BASE, JSON.stringify(items.map(item => item.hanzi)));
  }

  // Cập nhật vòng ôn tập đang chạy mà không làm mất tiến độ
  applyChangesToReviewDeck(added, updated, removed = []) {
    const sessionActive = this.reviewDeck.length > 0 && this.reviewIndex < this.reviewDeck.length;
    if (!sessionActive) {
      this.initReviewSession();
      return;
    }

    let wasRevealed = this.isCardRevealed;
    if (removed.length > 0) {
      const removedIds = new Set(removed.map(item => item.id));
      const current = this.reviewDeck[this.reviewIndex];
      const removedBefore = this.reviewDeck.slice(0, this.reviewIndex).filter(x => removedIds.has(x.id)).length;
      this.reviewDeck = this.reviewDeck.filter(x => !removedIds.has(x.id));
      this.reviewIndex -= removedBefore;
      if (current && removedIds.has(current.id)) wasRevealed = false;
    }

    updated.forEach(item => {
      const deckIdx = this.reviewDeck.findIndex(x => x.id === item.id);
      if (deckIdx !== -1) this.reviewDeck[deckIdx] = item;
    });
    this.reviewDeck.push(...added);

    if (this.reviewDeck.length === 0) {
      this.initReviewSession();
      return;
    }
    this.renderCurrentReviewWord();
    if (wasRevealed) this.revealReviewCard();
  }


  // ==========================================
  // FIREBASE REALTIME SYNC (Đồng bộ tức thì đa thiết bị)
  // ==========================================
  getFirebaseConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_FIREBASE_CONFIG);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // 1. Kiểm tra cấu hình toàn cục từ file firebase-config.js (window.FIREBASE_CONFIG)
    if (typeof window !== 'undefined' && window.FIREBASE_CONFIG && (window.FIREBASE_CONFIG.apiKey || window.FIREBASE_CONFIG.databaseURL)) {
      return window.FIREBASE_CONFIG;
    }

    // 2. Sử dụng DEFAULT_FIREBASE_CONFIG được khai báo sẵn trong app.js
    if (DEFAULT_FIREBASE_CONFIG && (DEFAULT_FIREBASE_CONFIG.apiKey || DEFAULT_FIREBASE_CONFIG.databaseURL || DEFAULT_FIREBASE_CONFIG.projectId)) {
      return DEFAULT_FIREBASE_CONFIG;
    }

    return null;
  }

  getFirebaseRoom() {
    const room = localStorage.getItem(STORAGE_FIREBASE_ROOM);
    if (room && room.trim()) return room.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (typeof window !== 'undefined' && window.FIREBASE_ROOM && window.FIREBASE_ROOM.trim()) {
      return window.FIREBASE_ROOM.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    return DEFAULT_FIREBASE_ROOM;
  }

  checkMagicSyncLink() {
    try {
      const hash = window.location.hash;
      if (!hash || !hash.includes('firebase_sync=')) return false;
      const match = hash.match(/firebase_sync=([^&]+)/);
      if (!match) return false;
      const raw = decodeURIComponent(atob(match[1]));
      const data = JSON.parse(raw);
      if (data && data.config) {
        localStorage.setItem(STORAGE_FIREBASE_CONFIG, JSON.stringify(data.config));
        if (data.room) {
          localStorage.setItem(STORAGE_FIREBASE_ROOM, data.room);
        }
        history.replaceState(null, '', window.location.pathname + window.location.search);
        this.showToast('🎉 Đã tự động nhận cấu hình Firebase Realtime từ link chia sẻ!', 'success');
        return true;
      }
    } catch (e) {
      console.error('Lỗi phân tích Magic Link:', e);
    }
    return false;
  }

  initFirebase() {
    const cfg = this.getFirebaseConfig();
    if (!cfg) {
      this.setFirebaseStatus('off');
      return;
    }

    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK chưa sẵn sàng.');
      this.setFirebaseStatus('error', 'Chưa tải được Firebase SDK');
      return;
    }

    try {
      if (!cfg.databaseURL && cfg.projectId) {
        cfg.databaseURL = `https://${cfg.projectId}-default-rtdb.firebaseio.com`;
      }

      let app;
      if (firebase.apps && firebase.apps.length > 0) {
        app = firebase.apps[0];
      } else {
        app = firebase.initializeApp(cfg);
      }

      this.firebaseDb = firebase.database(app);
      const room = this.getFirebaseRoom();
      const vocabPath = `chinese_vocab/${room}`;

      if (this.firebaseVocabRef && this._fbListener) {
        this.firebaseVocabRef.off('value', this._fbListener);
      }

      this.firebaseVocabRef = this.firebaseDb.ref(vocabPath);
      this.setFirebaseStatus('connecting');

      // Lắng nghe dữ liệu thay đổi theo thời gian thực (Realtime Listener)
      this._fbListener = this.firebaseVocabRef.on('value', (snapshot) => {
        this.setFirebaseStatus('ok');
        const val = snapshot.val();
        if (!val) {
          if (this.vocabList && this.vocabList.length > 0 && !this.hasPushedInitialFirebase) {
            this.hasPushedInitialFirebase = true;
            this.pushToFirebase(this.vocabList);
          }
          return;
        }

        this.hasPushedInitialFirebase = true;
        let remoteItems = null;
        if (Array.isArray(val)) {
          remoteItems = val;
        } else if (val && typeof val === 'object') {
          if (Array.isArray(val.items)) {
            remoteItems = val.items;
          } else {
            remoteItems = extractVocabArray(val);
          }
        }

        if (remoteItems) {
          const normalized = remoteItems.map((item, idx) => normalizeVocabItem(item, idx)).filter(Boolean);
          this.applyRemoteMerge(normalized);
        }
      }, (error) => {
        console.error('Lỗi Firebase Realtime:', error);
        const msg = error.message || 'Lỗi quyền truy cập (kiểm tra Rules: .read & .write)';
        this.setFirebaseStatus('error', msg);
      });

      // Theo dõi trạng thái kết nối mạng của Firebase
      const connectedRef = this.firebaseDb.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
          this.setFirebaseStatus('ok');
        } else if (this.firebaseStatus === 'ok') {
          this.setFirebaseStatus('connecting');
        }
      });

    } catch (e) {
      console.error('Lỗi khởi tạo Firebase:', e);
      this.setFirebaseStatus('error', e.message);
    }
  }

  setFirebaseStatus(state, detail = '') {
    this.firebaseStatus = state;
    this.firebaseStatusDetail = detail;
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const states = {
      off: ['🔥', 'Chưa kết nối Firebase: từ vựng chỉ lưu trên trình duyệt này'],
      connecting: ['⏳', 'Đang kết nối lại Firebase Realtime...'],
      pending: ['⏳', 'Đang đồng bộ thay đổi lên Cloud...'],
      syncing: ['⏳', 'Đang tải dữ liệu từ Cloud...'],
      ok: ['🔥', `Đang đồng bộ Realtime (Trực tiếp) lúc ${time}`],
      error: ['⚠️', `Lỗi Firebase: ${detail}`]
    };
    const [icon, text] = states[state] || states.off;

    if (this.btnFirebaseSync) {
      this.btnFirebaseSync.textContent = icon;
      this.btnFirebaseSync.setAttribute('title', text);
      if (state === 'ok') {
        this.btnFirebaseSync.classList.add('is-connected');
      } else {
        this.btnFirebaseSync.classList.remove('is-connected');
      }
    }

    if (this.firebaseStatusMsg) {
      this.firebaseStatusMsg.textContent = text;
      this.firebaseStatusMsg.className = `firebase-status-msg ${state}`;
    }
  }

  openFirebaseModal() {
    if (this.isLocked || !this.firebaseModal) return;
    const cfg = this.getFirebaseConfig();
    if (this.firebaseConfigInput) {
      this.firebaseConfigInput.value = '';
      this.firebaseConfigInput.placeholder = cfg ? 'Đã lưu cấu hình (dán cấu hình mới để thay thế)' : 'const firebaseConfig = { ... };';
    }
    if (this.firebaseRoomInput) {
      this.firebaseRoomInput.value = localStorage.getItem(STORAGE_FIREBASE_ROOM) || DEFAULT_FIREBASE_ROOM;
    }
    if (this.btnFirebaseDisconnect) {
      this.btnFirebaseDisconnect.style.display = cfg ? 'inline-flex' : 'none';
    }
    if (this.firebaseConnectedTools) {
      this.firebaseConnectedTools.style.display = cfg ? 'block' : 'none';
    }
    this.setFirebaseStatus(this.firebaseStatus || (cfg ? 'ok' : 'off'), this.firebaseStatusDetail);
    this.firebaseModal.style.display = 'flex';
    setTimeout(() => {
      if (this.firebaseConfigInput) this.firebaseConfigInput.focus();
    }, 50);
  }

  closeFirebaseModal() {
    if (this.firebaseModal) this.firebaseModal.style.display = 'none';
  }

  handleFirebaseSubmit() {
    const rawInput = this.firebaseConfigInput ? this.firebaseConfigInput.value.trim() : '';
    let parsedConfig = null;

    if (rawInput) {
      parsedConfig = parseFirebaseConfig(rawInput);
      if (!parsedConfig) {
        this.setFirebaseStatus('error', 'Cấu hình không hợp lệ. Vui lòng dán JSON hoặc đoạn mã JS chứa apiKey / databaseURL / projectId.');
        return;
      }
    } else {
      parsedConfig = this.getFirebaseConfig();
      if (!parsedConfig) {
        this.setFirebaseStatus('error', 'Vui lòng dán cấu hình Firebase.');
        return;
      }
    }

    const room = this.firebaseRoomInput ? (this.firebaseRoomInput.value.trim() || DEFAULT_FIREBASE_ROOM) : DEFAULT_FIREBASE_ROOM;

    localStorage.setItem(STORAGE_FIREBASE_CONFIG, JSON.stringify(parsedConfig));
    localStorage.setItem(STORAGE_FIREBASE_ROOM, room);

    if (this.firebaseConfigInput) this.firebaseConfigInput.value = '';
    if (this.btnFirebaseDisconnect) this.btnFirebaseDisconnect.style.display = 'inline-flex';
    if (this.firebaseConnectedTools) this.firebaseConnectedTools.style.display = 'block';

    this.initFirebase();
    this.showToast('Đã lưu cấu hình và kích hoạt đồng bộ Firebase Realtime!', 'success');
  }

  handleFirebaseDisconnect() {
    if (this.firebaseVocabRef && this._fbListener) {
      this.firebaseVocabRef.off('value', this._fbListener);
      this._fbListener = null;
    }
    clearTimeout(this.firebasePushTimer);
    localStorage.removeItem(STORAGE_FIREBASE_CONFIG);
    localStorage.removeItem(STORAGE_FIREBASE_ROOM);
    this.firebaseDb = null;
    this.firebaseVocabRef = null;

    if (this.btnFirebaseDisconnect) this.btnFirebaseDisconnect.style.display = 'none';
    if (this.firebaseConnectedTools) this.firebaseConnectedTools.style.display = 'none';
    this.setFirebaseStatus('off');
    this.showToast('Đã ngắt kết nối Firebase Realtime.', 'info');
  }

  copyFirebaseShareLink() {
    const cfg = this.getFirebaseConfig();
    if (!cfg) {
      this.showToast('Vui lòng kết nối Firebase trước khi tạo link!', 'warning');
      return;
    }
    const room = this.getFirebaseRoom();
    const payload = { config: cfg, room: room };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#firebase_sync=${encoded}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showToast('✅ Đã sao chép link! Mở link này trên điện thoại để đồng bộ ngay.', 'success');
      }).catch(() => {
        prompt('Sao chép liên kết sau và mở trên điện thoại/máy khác:', shareUrl);
      });
    } else {
      prompt('Sao chép liên kết sau và mở trên điện thoại/máy khác:', shareUrl);
    }
  }

  scheduleFirebasePush() {
    if (!this.firebaseVocabRef || this.isApplyingRemote || !this.getFirebaseConfig()) return;
    clearTimeout(this.firebasePushTimer);
    this.setFirebaseStatus('pending');
    this.firebasePushTimer = setTimeout(() => {
      this.pushToFirebase(this.vocabList);
    }, 400);
  }

  async pushToFirebase(items) {
    if (!this.firebaseVocabRef || this.isApplyingRemote) return;
    try {
      this.setFirebaseStatus('pending');
      await this.firebaseVocabRef.set({
        items: items,
        updatedAt: Date.now()
      });
      this.saveRepoBase(items);
      this.setFirebaseStatus('ok');
    } catch (err) {
      console.error('Lỗi ghi dữ liệu lên Firebase:', err);
      const msg = err.message || 'Không thể lưu lên Cloud';
      this.setFirebaseStatus('error', msg);
      this.showToast(`Chưa lưu được lên Firebase: ${msg}`, 'error');
    }
  }

  // ==========================================
  // EXPORT / IMPORT JSON
  // ==========================================
  exportVocabJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.vocabList, null, 2));
    const downloadAnchor = document.createElement('a');
    // Đặt tên vocab.json để chép thẳng vào repo rồi commit (đồng bộ lên GitHub Pages)
    const filename = REPO_VOCAB_URL;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    this.showToast('Đã xuất file vocab.json thành công!', 'success');
  }

  importVocabJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawData = JSON.parse(event.target.result);
        const listToImport = extractVocabArray(rawData);

        if (Array.isArray(listToImport) && listToImport.length > 0) {
          const sanitized = listToImport
            .map((item, idx) => normalizeVocabItem(item, idx))
            .filter(item => item !== null && item.hanzi && item.hanzi !== '未知');

          if (sanitized.length === 0) {
            this.showToast('Không tìm thấy từ vựng hợp lệ trong file JSON!', 'error');
            return;
          }

          let finalList = sanitized;
          if (this.vocabList && this.vocabList.length > 0) {
            const doMerge = confirm(
              `Kho từ vựng của bạn hiện có ${this.vocabList.length} từ. File JSON có ${sanitized.length} từ.\n\n` +
              `• Bấm [OK] để GỘP THÊM (Giữ các từ hiện tại và bổ sung từ mới từ file JSON)\n` +
              `• Bấm [Cancel] để GHI ĐÈ THAY THẾ (Chỉ giữ từ trong file JSON, thay thế kho hiện tại)`
            );

            if (doMerge) {
              const map = new Map();
              this.vocabList.forEach(item => map.set(item.hanzi, item));
              sanitized.forEach(item => {
                const existing = map.get(item.hanzi);
                if (existing) {
                  // Cập nhật thông tin mới nhất từ file JSON, bảo toàn id và ngày tạo
                  map.set(item.hanzi, {
                    ...existing,
                    ...item,
                    id: existing.id || item.id,
                    createdAt: existing.createdAt || item.createdAt
                  });
                } else {
                  map.set(item.hanzi, item);
                }
              });
              finalList = Array.from(map.values());
            } else {
              finalList = sanitized;
            }
          }

          // Save and refresh
          this.saveVocabList(finalList);
          this.renderVocabBank();
          this.initReviewSession();
          this.showToast(`Đã nạp thành công! Kho từ hiện có ${finalList.length} từ.`, 'success');
        } else {
          this.showToast('File JSON không đúng định dạng danh sách từ vựng!', 'error');
        }
      } catch (err) {
        console.error('Error importing JSON:', err);
        this.showToast('Lỗi khi đọc file JSON (file bị sai định dạng)!', 'error');
      }
      this.fileImportInput.value = '';
    };
    reader.readAsText(file);
  }

  // =========================================================================
  // Authentication & Lock Screen System
  // =========================================================================
  getMasterHash() {
    return localStorage.getItem(STORAGE_AUTH_HASH) || DEFAULT_MASTER_PASSWORD_HASH;
  }

  async generateSessionToken(masterHash) {
    return await hashPassword(masterHash + "_chinesevocab_active_session_token_2026");
  }

  async checkAuthStatus() {
    const masterHash = this.getMasterHash();
    const expectedSessionToken = await this.generateSessionToken(masterHash);
    const sessionAuth = sessionStorage.getItem(SESSION_AUTH);
    const rememberedHash = localStorage.getItem(STORAGE_REMEMBER_AUTH);

    // Nếu mật khẩu chủ trên hệ thống đã đổi, hủy phiên đăng nhập cũ và buộc nhập mật khẩu mới
    if (rememberedHash && rememberedHash !== masterHash) {
      localStorage.removeItem(STORAGE_REMEMBER_AUTH);
      sessionStorage.removeItem(SESSION_AUTH);
      this.showUnlockScreen();
      return;
    }

    const isSessionValid = (sessionAuth === expectedSessionToken);
    const isRememberValid = (rememberedHash === masterHash);

    if (isSessionValid || isRememberValid) {
      sessionStorage.setItem(SESSION_AUTH, expectedSessionToken);
      this.doUnlockUI();
    } else {
      sessionStorage.removeItem(SESSION_AUTH);
      this.showUnlockScreen();
    }
  }

  showLockSetupScreen() {
    this.isLocked = true;
    if (this.appWrapper) this.appWrapper.classList.add('is-locked');
    if (this.lockScreenOverlay) this.lockScreenOverlay.classList.remove('hidden');
    if (this.lockScreenForm) this.lockScreenForm.style.display = 'none';
    if (this.lockSetupForm) this.lockSetupForm.style.display = 'flex';
    if (this.lockScreenTitle) this.lockScreenTitle.textContent = 'Thiết Lập Mật Khẩu';
    if (this.lockScreenDesc) this.lockScreenDesc.textContent = 'Ứng dụng chưa có mật khẩu bảo vệ. Hãy tạo mật khẩu quản trị của bạn.';
    if (this.setupErrorMsg) {
      this.setupErrorMsg.textContent = '';
      this.setupErrorMsg.style.display = 'none';
    }
    if (this.lockSetupPassword) {
      this.lockSetupPassword.value = '';
      setTimeout(() => this.lockSetupPassword.focus(), 100);
    }
    if (this.lockSetupConfirm) this.lockSetupConfirm.value = '';
  }

  showUnlockScreen() {
    this.isLocked = true;
    if (this.appWrapper) this.appWrapper.classList.add('is-locked');
    if (this.lockScreenOverlay) this.lockScreenOverlay.classList.remove('hidden');
    if (this.lockSetupForm) this.lockSetupForm.style.display = 'none';
    if (this.lockScreenForm) this.lockScreenForm.style.display = 'flex';
    if (this.lockScreenTitle) this.lockScreenTitle.textContent = 'Bảo Mật Cá Nhân';
    if (this.lockScreenDesc) this.lockScreenDesc.textContent = 'Vui lòng nhập mật khẩu để mở khóa ứng dụng';
    if (this.lockErrorMsg) {
      this.lockErrorMsg.textContent = '';
      this.lockErrorMsg.style.display = 'none';
    }
    if (this.lockInputPassword) {
      this.lockInputPassword.value = '';
      setTimeout(() => this.lockInputPassword.focus(), 100);
    }
  }

  doUnlockUI() {
    this.isLocked = false;
    if (this.appWrapper) this.appWrapper.classList.remove('is-locked');
    if (this.lockScreenOverlay) {
      this.lockScreenOverlay.classList.add('hidden');
    }
    if (this.lockInputPassword) this.lockInputPassword.value = '';
    if (this.lockErrorMsg) this.lockErrorMsg.style.display = 'none';
    if (this.setupErrorMsg) this.setupErrorMsg.style.display = 'none';
  }

  async unlockApp(token = null) {
    const masterHash = this.getMasterHash();
    const expectedToken = await this.generateSessionToken(masterHash);
    const currentToken = token || sessionStorage.getItem(SESSION_AUTH);

    if (currentToken !== expectedToken) {
      console.warn('Cảnh báo bảo mật: Yêu cầu mở khóa không hợp lệ!');
      sessionStorage.removeItem(SESSION_AUTH);
      this.showUnlockScreen();
      return false;
    }

    sessionStorage.setItem(SESSION_AUTH, expectedToken);
    this.doUnlockUI();
    return true;
  }

  lockApp() {
    this.isLocked = true;
    sessionStorage.removeItem(SESSION_AUTH);
    localStorage.removeItem(STORAGE_REMEMBER_AUTH);
    this.showUnlockScreen();
    this.showToast('Đã khóa ứng dụng an toàn!', 'info');
  }

  async handleUnlockSubmit() {
    if (!this.lockInputPassword) return;
    const pwd = this.lockInputPassword.value.trim();
    if (!pwd) {
      this.showLockError('Vui lòng nhập mật khẩu!');
      return;
    }

    try {
      const inputHash = await hashPassword(pwd);
      const masterHash = this.getMasterHash();

      if (inputHash === masterHash) {
        if (this.lockRememberMe && this.lockRememberMe.checked) {
          localStorage.setItem(STORAGE_REMEMBER_AUTH, masterHash);
        } else {
          localStorage.removeItem(STORAGE_REMEMBER_AUTH);
        }
        const sessionToken = await this.generateSessionToken(masterHash);
        sessionStorage.setItem(SESSION_AUTH, sessionToken);
        this.doUnlockUI();
        this.showToast('Mở khóa thành công! Chúc bạn học tốt.', 'success');
      } else {
        this.showLockError('Mật khẩu không chính xác. Vui lòng thử lại!');
        this.lockInputPassword.value = '';
        this.lockInputPassword.focus();
      }
    } catch (e) {
      console.error('Error verifying password:', e);
      this.showLockError('Có lỗi xảy ra khi xác thực mật khẩu.');
    }
  }

  showLockError(msg) {
    if (this.lockErrorMsg) {
      this.lockErrorMsg.textContent = msg;
      this.lockErrorMsg.style.display = 'block';
    }
  }

  async handleSetupPasswordSubmit() {
    const pwd = this.lockSetupPassword ? this.lockSetupPassword.value.trim() : '';
    const confirm = this.lockSetupConfirm ? this.lockSetupConfirm.value.trim() : '';

    if (!pwd) {
      this.showSetupError('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (pwd.length < 4) {
      this.showSetupError('Mật khẩu cần có ít nhất 4 ký tự.');
      return;
    }
    if (pwd !== confirm) {
      this.showSetupError('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    try {
      const masterHash = await hashPassword(pwd);
      localStorage.setItem(STORAGE_AUTH_HASH, masterHash);
      localStorage.setItem(STORAGE_REMEMBER_AUTH, masterHash);
      const sessionToken = await this.generateSessionToken(masterHash);
      sessionStorage.setItem(SESSION_AUTH, sessionToken);
      this.doUnlockUI();
      this.showToast('Đã thiết lập mật khẩu bảo mật thành công!', 'success');
    } catch (e) {
      console.error('Error setting master password:', e);
      this.showSetupError('Có lỗi xảy ra khi tạo mật khẩu.');
    }
  }

  showSetupError(msg) {
    if (this.setupErrorMsg) {
      this.setupErrorMsg.textContent = msg;
      this.setupErrorMsg.style.display = 'block';
    }
  }

  openChangePasswordModal() {
    if (this.isLocked) return;
    if (this.changePwModal) {
      this.changePwModal.style.display = 'flex';
      if (this.inputOldPw) this.inputOldPw.value = '';
      if (this.inputNewPw) this.inputNewPw.value = '';
      if (this.inputConfirmPw) this.inputConfirmPw.value = '';
      if (this.changePwErrorMsg) {
        this.changePwErrorMsg.textContent = '';
        this.changePwErrorMsg.style.display = 'none';
      }
      if (this.changePwSyncInfo) {
        this.changePwSyncInfo.style.display = 'none';
      }
      setTimeout(() => {
        if (this.inputOldPw) this.inputOldPw.focus();
      }, 50);
    }
  }

  closeChangePasswordModal() {
    if (this.changePwModal) {
      this.changePwModal.style.display = 'none';
    }
  }

  async handleChangePasswordSubmit() {
    const oldPw = this.inputOldPw ? this.inputOldPw.value.trim() : '';
    const newPw = this.inputNewPw ? this.inputNewPw.value.trim() : '';
    const confirmPw = this.inputConfirmPw ? this.inputConfirmPw.value.trim() : '';

    if (!oldPw) {
      this.showChangePwError('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }
    if (!newPw) {
      this.showChangePwError('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (newPw.length < 4) {
      this.showChangePwError('Mật khẩu mới cần có ít nhất 4 ký tự!');
      return;
    }
    if (newPw !== confirmPw) {
      this.showChangePwError('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      const oldHash = await hashPassword(oldPw);
      const masterHash = this.getMasterHash();

      if (masterHash && oldHash !== masterHash) {
        this.showChangePwError('Mật khẩu hiện tại không chính xác!');
        if (this.inputOldPw) this.inputOldPw.focus();
        return;
      }

      const newHash = await hashPassword(newPw);
      localStorage.setItem(STORAGE_AUTH_HASH, newHash);

      const newSessionToken = await this.generateSessionToken(newHash);
      sessionStorage.setItem(SESSION_AUTH, newSessionToken);

      // If user had "remember me" set, update it to the new hash
      if (localStorage.getItem(STORAGE_REMEMBER_AUTH)) {
        localStorage.setItem(STORAGE_REMEMBER_AUTH, newHash);
      }

      if (this.changePwSyncInfo && this.newMasterHashDisplay) {
        this.newMasterHashDisplay.value = newHash;
        this.changePwSyncInfo.style.display = 'block';
        this.showToast('Đã đổi mật khẩu trên thiết bị này!', 'success');
      } else {
        this.closeChangePasswordModal();
        this.showToast('Đã đổi mật khẩu bảo mật thành công!', 'success');
      }
    } catch (e) {
      console.error('Error changing password:', e);
      this.showChangePwError('Có lỗi xảy ra khi đổi mật khẩu.');
    }
  }

  showChangePwError(msg) {
    if (this.changePwErrorMsg) {
      this.changePwErrorMsg.textContent = msg;
      this.changePwErrorMsg.style.display = 'block';
    }
  }

  // Utility Toast Notifications
  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }
}

// Global initialization
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new VocabApp();
});
