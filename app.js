/**
 * Chinese Vocabulary Master - Main Application Logic
 */

// Security & Authentication Storage Keys
const STORAGE_AUTH_HASH = 'chinese_vocab_auth_hash';
const STORAGE_REMEMBER_AUTH = 'chinese_vocab_remember_auth';
const SESSION_AUTH = 'chinese_vocab_session_auth';

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

function normalizeVocabItem(item) {
  if (!item) return item;
  return {
    ...item,
    pinyin: formatPinyin(item.pinyin),
    hanviet: formatHanViet(item.hanviet),
    meaningVn: capitalizeFirstLetter(item.meaningVn),
    meaningEn: capitalizeFirstLetter(item.meaningEn),
    exampleVn: capitalizeFirstLetter(item.exampleVn)
  };
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

    this.initDOM();
    this.initTheme();
    this.bindEvents();
    this.updateStats();
    this.renderVocabBank();
    this.initReviewSession();
    this.checkAuthStatus();
  }

  // Load from local storage or fallback to defaults
  loadVocabList() {
    try {
      const saved = localStorage.getItem('chinese_vocab_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize existing saved items so all follow the uppercase/lowercase/capitalize rules
          return parsed.map(normalizeVocabItem);
        }
      }
    } catch (e) {
      console.error('Error loading vocabulary list from storage:', e);
    }
    const defaults = DEFAULT_VOCABULARY.map(normalizeVocabItem);
    this.saveVocabList(defaults);
    return defaults;
  }

  saveVocabList(list) {
    this.vocabList = list;
    localStorage.setItem('chinese_vocab_list', JSON.stringify(list));
    this.updateStats();
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
      const currentWord = this.reviewDeck[this.reviewIndex];
      if (currentWord) {
        this.speakChinese(currentWord.hanzi);
      }
    });
    if (this.btnEditReview) {
      this.btnEditReview.addEventListener('click', () => {
        const currentWord = this.reviewDeck[this.reviewIndex];
        if (currentWord) {
          this.editVocab(currentWord.id);
        }
      });
    }

    // Keyboard Shortcuts for Review
    window.addEventListener('keydown', (e) => {
      if (this.isLocked) return;
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

    // Bank Search
    this.bankSearchInput.addEventListener('input', () => this.renderVocabBank());

    // JSON Export / Import
    this.btnExportJson.addEventListener('click', () => this.exportVocabJson());
    this.btnImportJson.addEventListener('click', () => this.fileImportInput.click());
    this.fileImportInput.addEventListener('change', (e) => this.importVocabJson(e));

    // Reset Sample
    this.btnResetSample.addEventListener('click', () => {
      if (confirm('Khôi phục danh sách từ vựng mẫu HSK ban đầu? Các từ tự thêm sẽ được giữ nếu bạn xuất file sao lưu trước.')) {
        this.saveVocabList([...DEFAULT_VOCABULARY]);
        this.renderVocabBank();
        this.initReviewSession();
        this.showToast('Đã khôi phục bộ từ vựng mẫu thành công!', 'success');
      }
    });

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
  }

  switchTab(tabId) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    this.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    if (tabId === 'review') {
      // If review deck is empty or finished, restart
      if (this.reviewDeck.length === 0 || this.reviewIndex >= this.reviewDeck.length) {
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
      x.hanzi.trim().toLowerCase() === hanzi.toLowerCase() &&
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
    const hanviet = this.inputHanviet.value.trim();
    const meaningVn = this.inputMeaningVn.value.trim();
    const meaningEn = this.inputMeaningEn.value.trim();
    const exampleCn = this.inputExampleCn.value.trim();
    const exampleVn = this.inputExampleVn.value.trim();

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
      x.hanzi.trim().toLowerCase() === hanzi.toLowerCase() &&
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
      this.initReviewSession();
      this.renderVocabBank();
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

    // Reshuffle and refresh views
    this.initReviewSession();
    this.renderVocabBank();
  }

  // ==========================================
  // REVIEW ENGINE (FLASHCARD RANDOM QUEUE)
  // ==========================================
  initReviewSession() {
    if (this.vocabList.length === 0) {
      this.showEmptyState();
      return;
    }

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
    if (this.reviewIndex >= this.reviewDeck.length) {
      // Completed all words in the round!
      this.showCompletionScreen();
      return;
    }

    const word = this.reviewDeck[this.reviewIndex];
    const total = this.reviewDeck.length;
    const currentNum = this.reviewIndex + 1;

    // Show review card, hide completion
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
    if (this.btnEditReview) this.btnEditReview.style.display = 'none';

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

    this.isCardRevealed = true;
    this.reviewRevealArea.classList.add('visible');

    // Switch buttons: hide Reveal button, display "Từ tiếp theo" button and "Chỉnh sửa" button
    this.btnReveal.style.display = 'none';
    this.btnNextWord.style.display = 'inline-flex';
    if (this.btnEditReview) this.btnEditReview.style.display = 'inline-flex';

    // Auto-pronounce Hanzi audio
    const currentWord = this.reviewDeck[this.reviewIndex];
    if (currentWord) {
      this.speakChinese(currentWord.hanzi);
    }
  }

  nextReviewWord() {
    this.reviewIndex++;
    this.renderCurrentReviewWord();
  }

  showCompletionScreen() {
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
    this.reviewCard.style.display = 'none';
    this.reviewCompletion.style.display = 'flex';
    this.reviewCompletion.innerHTML = `
      <div class="celebration-icon">📖</div>
      <h2 style="font-size: 1.5rem;">Chưa có từ vựng nào!</h2>
      <p style="color: var(--text-secondary);">Hãy sang tab "Thêm từ mới" để nhập từ vựng tiếng Trung đầu tiên của bạn.</p>
      <button class="reveal-btn" style="max-width: 250px; margin-top: 1rem;" onclick="app.switchTab('add')">
        ➕ Thêm từ vựng ngay
      </button>
    `;
  }

  // ==========================================
  // VOCABULARY BANK (SEARCH / DELETE / PLAY)
  // ==========================================
  renderVocabBank() {
    if (!this.bankGrid) return;

    const query = (this.bankSearchInput ? this.bankSearchInput.value : '').toLowerCase().trim();
    
    const filtered = this.vocabList.filter(item => {
      if (!query) return true;
      return (
        item.hanzi.toLowerCase().includes(query) ||
        item.pinyin.toLowerCase().includes(query) ||
        item.hanviet.toLowerCase().includes(query) ||
        item.meaningVn.toLowerCase().includes(query) ||
        item.meaningEn.toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      this.bankGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <p>Không tìm thấy từ vựng nào phù hợp với từ khóa "${query}".</p>
        </div>
      `;
      return;
    }

    this.bankGrid.innerHTML = filtered.map(item => `
      <div class="vocab-card" id="card-${item.id}">
        <div>
          <div class="vocab-card-header">
            <div>
              <div class="vocab-card-hanzi">${this.escapeHtml(item.hanzi)}</div>
              <div class="vocab-card-pinyin">${this.escapeHtml(formatPinyin(item.pinyin))}</div>
            </div>
            <button class="audio-trigger-btn" style="width: 36px; height: 36px; font-size: 1rem;" 
                    onclick="app.speakChinese('${this.escapeQuotes(item.hanzi)}')" title="Nghe phát âm">
              🔊
            </button>
          </div>
          <div class="vocab-card-hanviet">Âm Hán-Việt: ${this.escapeHtml(formatHanViet(item.hanviet))}</div>
          <div class="vocab-card-meanings">
            <div class="vocab-card-vn">🇻🇳 ${this.escapeHtml(capitalizeFirstLetter(item.meaningVn))}</div>
            <div class="vocab-card-en">🇬🇧 ${this.escapeHtml(capitalizeFirstLetter(item.meaningEn))}</div>
          </div>
          ${item.exampleCn ? `
            <div style="margin-top: 0.6rem; font-size: 0.85rem; color: var(--text-muted); background: rgba(0,0,0,0.15); padding: 0.4rem 0.6rem; border-radius: 6px;">
              <div style="color: var(--text-primary); font-family: var(--font-hanzi);">${this.escapeHtml(item.exampleCn)}</div>
              <div style="font-size: 0.8rem;">${this.escapeHtml(item.exampleVn || '')}</div>
            </div>
          ` : ''}
        </div>
        <div class="vocab-card-footer">
          <span style="font-size: 0.75rem; color: var(--text-muted);">ID: ${item.id.replace('vocab-', '#')}</span>
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
      const updated = this.vocabList.filter(x => x.id !== id);
      this.saveVocabList(updated);
      this.renderVocabBank();
      this.initReviewSession();
      this.showToast(`Đã xóa từ "${item.hanzi}".`, 'info');
    }
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
  // SPEECH SYNTHESIS (CHINESE VOICE)
  // ==========================================
  speakChinese(text) {
    if (!text || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop previous
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // Standard Mandarin
    utterance.rate = 0.85; // Slightly slower for clear pronunciation learning

    // Try finding specific Chinese voice if available
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn'));
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // ==========================================
  // EXPORT / IMPORT JSON
  // ==========================================
  exportVocabJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.vocabList, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `chinese_vocabulary_backup_${new Date().toISOString().slice(0, 10)}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('Đã xuất file dữ liệu từ vựng thành công!', 'success');
  }

  importVocabJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          // Merge or replace
          const combined = [...importedData];
          this.saveVocabList(combined);
          this.renderVocabBank();
          this.initReviewSession();
          this.showToast(`Đã nạp thành công ${importedData.length} từ vựng từ file!`, 'success');
        } else {
          this.showToast('File JSON không đúng định dạng danh sách từ vựng!', 'error');
        }
      } catch (err) {
        this.showToast('Lỗi khi đọc file JSON!', 'error');
      }
      this.fileImportInput.value = '';
    };
    reader.readAsText(file);
  }

  // =========================================================================
  // Authentication & Lock Screen System
  // =========================================================================
  async checkAuthStatus() {
    const masterHash = localStorage.getItem(STORAGE_AUTH_HASH);
    if (!masterHash) {
      // First-time visit: no password set yet, prompt user to create master password
      this.showLockSetupScreen();
      return;
    }

    const sessionAuth = sessionStorage.getItem(SESSION_AUTH);
    const rememberedHash = localStorage.getItem(STORAGE_REMEMBER_AUTH);

    if (sessionAuth === 'true' || (rememberedHash && rememberedHash === masterHash)) {
      this.unlockApp(false);
    } else {
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

  unlockApp(animate = true) {
    this.isLocked = false;
    sessionStorage.setItem(SESSION_AUTH, 'true');
    if (this.appWrapper) this.appWrapper.classList.remove('is-locked');
    if (this.lockScreenOverlay) {
      this.lockScreenOverlay.classList.add('hidden');
    }
    if (this.lockInputPassword) this.lockInputPassword.value = '';
    if (this.lockErrorMsg) this.lockErrorMsg.style.display = 'none';
    if (this.setupErrorMsg) this.setupErrorMsg.style.display = 'none';
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
      const masterHash = localStorage.getItem(STORAGE_AUTH_HASH);

      if (inputHash === masterHash) {
        if (this.lockRememberMe && this.lockRememberMe.checked) {
          localStorage.setItem(STORAGE_REMEMBER_AUTH, masterHash);
        } else {
          localStorage.removeItem(STORAGE_REMEMBER_AUTH);
        }
        this.unlockApp(true);
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
      this.unlockApp(true);
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
      const masterHash = localStorage.getItem(STORAGE_AUTH_HASH);

      if (masterHash && oldHash !== masterHash) {
        this.showChangePwError('Mật khẩu hiện tại không chính xác!');
        if (this.inputOldPw) this.inputOldPw.focus();
        return;
      }

      const newHash = await hashPassword(newPw);
      localStorage.setItem(STORAGE_AUTH_HASH, newHash);

      // If user had "remember me" set, update it to the new hash
      if (localStorage.getItem(STORAGE_REMEMBER_AUTH)) {
        localStorage.setItem(STORAGE_REMEMBER_AUTH, newHash);
      }

      this.closeChangePasswordModal();
      this.showToast('Đã đổi mật khẩu bảo mật thành công!', 'success');
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
