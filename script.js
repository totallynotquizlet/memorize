document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    const app = {
        currentSet: {
            title: '',
            passages: [] // Array of { id, title, content }
        },
        currentPassageIndex: 0,
        currentMode: 'reveal', // 'reveal', 'type', 'order', 'create', 'empty'
        
        // Reveal Mode State
        revealIndex: -1, // -1 means nothing revealed
        
        // Type Mode State
        typeSettings: {
            wordsPercentage: 100,
            showUnderlines: true
        },

        // Order Mode State
        orderItems: [], // Array of objects for draggable state
        
        draggedItem: null,
        themeKey: 'memorizeAppTheme',
        toastTimeout: null,
        isCreateDirty: false
    };

    // --- DOM ELEMENTS ---
    const dom = {
        body: document.body,
        headerTitle: document.getElementById('header-title'),
        navButtons: document.querySelectorAll('.nav-button'),
        shareDeckButton: document.getElementById('share-deck-button'),
        themeToggleButton: document.getElementById('theme-toggle-button'),
        themeIconSun: document.getElementById('theme-icon-sun'),
        themeIconMoon: document.getElementById('theme-icon-moon'),

        // Create View
        createView: document.getElementById('create-view'),
        deckTitleInput: document.getElementById('deck-title-input'),
        passageEditorList: document.getElementById('passage-editor-list'),
        addPassageButton: document.getElementById('add-passage-button'),
        parseDeckButton: document.getElementById('parse-deck-button'),
        clearCreateButton: document.getElementById('clear-create-button'),

        // Reveal View
        revealView: document.getElementById('reveal-view'),
        revealPassageTitle: document.getElementById('reveal-passage-title'),
        revealContentArea: document.getElementById('reveal-content-area'),
        revealLineButton: document.getElementById('reveal-line-button'),
        revealShowAll: document.getElementById('reveal-show-all'),
        revealHideAll: document.getElementById('reveal-hide-all'),
        prevPassageBtn: document.getElementById('prev-passage-btn'),
        nextPassageBtn: document.getElementById('next-passage-btn'),
        revealContainer: document.getElementById('reveal-container'),

        // Type View
        typeView: document.getElementById('type-view'),
        typePassageTitle: document.getElementById('type-passage-title'),
        typeInputArea: document.getElementById('type-input-area'),
        typeGhostOverlay: document.getElementById('type-ghost-overlay'),
        typeWordsSlider: document.getElementById('type-words-slider'),
        typeWordsDisplay: document.getElementById('type-words-display'),
        typeToggleHints: document.getElementById('type-toggle-hints'),
        typeCheckButton: document.getElementById('type-check-button'),
        typeResetButton: document.getElementById('type-reset-button'),
        typeFeedback: document.getElementById('type-feedback'),
        typePrevBtn: document.getElementById('type-prev-btn'),
        typeNextBtn: document.getElementById('type-next-btn'),

        // Order View
        orderView: document.getElementById('order-view'),
        orderPassageTitle: document.getElementById('order-passage-title'),
        orderList: document.getElementById('order-list'),
        orderCheckBtn: document.getElementById('order-check-btn'),
        orderResetBtn: document.getElementById('order-reset-btn'),
        orderPrevBtn: document.getElementById('order-prev-btn'),
        orderNextBtn: document.getElementById('order-next-btn'),

        // Modals & Misc
        toastNotification: document.getElementById('toast-notification'),
        emptyDeckView: document.getElementById('empty-deck-view'),
        
        aboutButton: document.getElementById('about-button'),
        aboutModalOverlay: document.getElementById('about-modal-overlay'),
        aboutModalClose: document.getElementById('about-modal-close'),
        aboutModalBackdrop: document.querySelector('#about-modal-overlay .modal-backdrop'),

        // Keybinds Modal
        keybindsButton: document.getElementById('keybinds-button'),
        keybindsModalOverlay: document.getElementById('keybinds-modal-overlay'),
        keybindsModalClose: document.getElementById('keybinds-modal-close'),
        keybindsModalBackdrop: document.querySelector('#keybinds-modal-overlay .modal-backdrop'),

        clearConfirmModalOverlay: document.getElementById('clear-confirm-modal-overlay'),
        clearConfirmButton: document.getElementById('clear-confirm-button'),
        clearCancelButton: document.getElementById('clear-cancel-button'),
    };

    // --- INIT ---
    function init() {
        loadTheme();
        loadSetFromURL();
        addEventListeners();
        
        if (app.currentSet.passages.length === 0) {
            setMode('create');
        } else {
            setMode('reveal');
        }
    }

    // --- THEME ---
    function loadTheme() {
        const savedTheme = localStorage.getItem(app.themeKey) || 'dark';
        setTheme(savedTheme);
    }
    function toggleTheme() {
        setTheme(dom.body.classList.contains('light-mode') ? 'dark' : 'light');
    }
    function setTheme(theme) {
        if (theme === 'light') {
            dom.body.classList.add('light-mode');
            dom.themeIconSun.classList.add('hidden');
            dom.themeIconMoon.classList.remove('hidden');
        } else {
            dom.body.classList.remove('light-mode');
            dom.themeIconSun.classList.remove('hidden');
            dom.themeIconMoon.classList.add('hidden');
        }
        localStorage.setItem(app.themeKey, theme);
    }

    // --- ROUTING & DATA ---
    function loadSetFromURL() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const json = base64UrlDecode(hash);
                const data = JSON.parse(json);
                if (data && Array.isArray(data.passages)) {
                    app.currentSet = data;
                }
            } catch (e) {
                console.error("Error parsing URL", e);
                showToast("Error loading set.");
            }
        }
    }

    function updateURLHash() {
        try {
            const json = JSON.stringify(app.currentSet);
            const hash = base64UrlEncode(json);
            history.replaceState(null, '', '#' + hash);
        } catch (e) { console.error(e); }
    }

    function setMode(mode) {
        if (app.currentSet.passages.length === 0 && mode !== 'create') {
            mode = 'empty';
        }

        // Hide all views
        document.querySelectorAll('.app-view').forEach(el => el.style.display = 'none');
        
        // Update Nav
        dom.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
        dom.shareDeckButton.classList.toggle('hidden', mode === 'empty' || mode === 'create');
        
        app.currentMode = mode;
        dom.body.dataset.mode = mode;

        if (mode === 'create') {
            dom.createView.style.display = 'block';
            renderCreateEditor();
        } else if (mode === 'empty') {
            dom.emptyDeckView.style.display = 'block';
        } else {
            // Study modes
            if (mode === 'reveal') {
                dom.revealView.style.display = 'block';
                initRevealMode();
            } else if (mode === 'type') {
                dom.typeView.style.display = 'block';
                initTypeMode();
            } else if (mode === 'order') {
                dom.orderView.style.display = 'block';
                initOrderMode();
            }
        }
    }

    // --- EVENT LISTENERS ---
    function addEventListeners() {
        dom.themeToggleButton.addEventListener('click', toggleTheme);
        dom.navButtons.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
        
        // Share
        dom.shareDeckButton.addEventListener('click', () => {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => showToast("Link copied to clipboard!"));
        });

        // Create View
        dom.addPassageButton.addEventListener('click', () => { createPassageRow(); app.isCreateDirty = true; });
        dom.parseDeckButton.addEventListener('click', saveAndLoadSet);
        dom.clearCreateButton.addEventListener('click', () => dom.clearConfirmModalOverlay.classList.add('visible'));
        
        // Reveal View
        dom.revealLineButton.addEventListener('click', revealNextLine);
        dom.revealShowAll.addEventListener('click', () => setRevealState('all'));
        dom.revealHideAll.addEventListener('click', () => setRevealState('none'));
        dom.prevPassageBtn.addEventListener('click', () => changePassage(-1));
        dom.nextPassageBtn.addEventListener('click', () => changePassage(1));

        // Type View
        dom.typeToggleHints.addEventListener('click', toggleTypeHints);
        dom.typeWordsSlider.addEventListener('input', (e) => {
            app.typeSettings.wordsPercentage = e.target.value;
            dom.typeWordsDisplay.textContent = e.target.value + '%';
        });
        dom.typeCheckButton.addEventListener('click', checkTypeAnswer);
        dom.typeResetButton.addEventListener('click', initTypeMode);
        dom.typePrevBtn.addEventListener('click', () => changePassage(-1));
        dom.typeNextBtn.addEventListener('click', () => changePassage(1));
        
        // Sync scroll for ghost overlay
        dom.typeInputArea.addEventListener('scroll', () => {
            dom.typeGhostOverlay.scrollTop = dom.typeInputArea.scrollTop;
        });
        // Also sync on input to handle rapid changes
        dom.typeInputArea.addEventListener('input', () => {
            dom.typeGhostOverlay.scrollTop = dom.typeInputArea.scrollTop;
        });

        // Order View
        dom.orderCheckBtn.addEventListener('click', checkOrder);
        dom.orderResetBtn.addEventListener('click', initOrderMode);
        dom.orderPrevBtn.addEventListener('click', () => changePassage(-1));
        dom.orderNextBtn.addEventListener('click', () => changePassage(1));
        
        // Drag and Drop (Create & Order)
        [dom.passageEditorList, dom.orderList].forEach(list => {
            list.addEventListener('dragstart', handleDragStart);
            list.addEventListener('dragover', handleDragOver);
            list.addEventListener('drop', handleDrop);
            list.addEventListener('dragend', handleDragEnd);
        });

        // Modals
        dom.aboutButton.addEventListener('click', () => dom.aboutModalOverlay.classList.add('visible'));
        dom.aboutModalClose.addEventListener('click', () => dom.aboutModalOverlay.classList.remove('visible'));
        dom.aboutModalBackdrop.addEventListener('click', () => dom.aboutModalOverlay.classList.remove('visible'));
        
        dom.keybindsButton.addEventListener('click', () => dom.keybindsModalOverlay.classList.add('visible'));
        dom.keybindsModalClose.addEventListener('click', () => dom.keybindsModalOverlay.classList.remove('visible'));
        dom.keybindsModalBackdrop.addEventListener('click', () => dom.keybindsModalOverlay.classList.remove('visible'));

        dom.clearCancelButton.addEventListener('click', () => dom.clearConfirmModalOverlay.classList.remove('visible'));
        dom.clearConfirmButton.addEventListener('click', () => {
            dom.deckTitleInput.value = '';
            dom.passageEditorList.innerHTML = '';
            createPassageRow(); // Add one empty
            dom.clearConfirmModalOverlay.classList.remove('visible');
            app.isCreateDirty = false;
            showToast("Editor Cleared.");
        });

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (app.currentMode === 'reveal') {
                    revealNextLine();
                }
            } else if (e.code === 'ArrowRight') {
                changePassage(1);
            } else if (e.code === 'ArrowLeft') {
                changePassage(-1);
            }
        });
    }

    // --- GLOBAL HELPERS ---
    function changePassage(delta) {
        const len = app.currentSet.passages.length;
        if (len === 0) return;
        app.currentPassageIndex = (app.currentPassageIndex + delta + len) % len;
        setMode(app.currentMode); // Re-init current mode
    }

    // --- REVEAL MODE ---
    function initRevealMode() {
        const passage = app.currentSet.passages[app.currentPassageIndex];
        dom.revealPassageTitle.textContent = passage.title || "Untitled Passage";
        
        dom.revealContentArea.innerHTML = '';
        app.revealIndex = -1;

        // Split by lines
        const lines = passage.content.split('\n').filter(line => line.trim() !== '');
        
        lines.forEach((lineText, index) => {
            const p = document.createElement('p');
            p.className = 'reveal-line hidden'; // Start hidden
            p.textContent = lineText;
            p.dataset.index = index;
            p.addEventListener('click', () => {
                 // Allow clicking specific lines to toggle
                 if (p.classList.contains('hidden')) {
                     p.classList.remove('hidden');
                     p.classList.add('visible');
                 } else {
                     p.classList.remove('visible');
                     p.classList.add('hidden');
                 }
            });
            dom.revealContentArea.appendChild(p);
        });
    }

    function revealNextLine() {
        const lines = dom.revealContentArea.querySelectorAll('.reveal-line');
        // Find first hidden line
        let nextHiddenIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].classList.contains('hidden')) {
                nextHiddenIndex = i;
                break;
            }
        }

        if (nextHiddenIndex !== -1) {
            const line = lines[nextHiddenIndex];
            line.classList.remove('hidden');
            line.classList.add('visible');
            // Smooth scroll to keep context
            if (nextHiddenIndex > 2) { // Only scroll if we are a bit down
                 line.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function setRevealState(state) {
        const lines = dom.revealContentArea.querySelectorAll('.reveal-line');
        // Stagger the reveal for a pristine effect if showing all
        if (state === 'all') {
            lines.forEach((line, i) => {
                setTimeout(() => {
                    line.classList.remove('hidden');
                    line.classList.add('visible');
                }, i * 30); // 30ms stagger
            });
        } else {
            lines.forEach(line => {
                line.classList.remove('visible');
                line.classList.add('hidden');
            });
        }
    }

    // --- TYPE MODE ---
    function initTypeMode() {
        const passage = app.currentSet.passages[app.currentPassageIndex];
        dom.typePassageTitle.textContent = passage.title || "Untitled Passage";
        dom.typeInputArea.value = '';
        dom.typeFeedback.className = 'mt-6 hidden p-6 rounded-xl text-center font-bold text-lg shadow-md';
        dom.typeFeedback.textContent = '';
        
        updateTypeGhost();
    }

    function toggleTypeHints() {
        app.typeSettings.showUnderlines = !app.typeSettings.showUnderlines;
        dom.typeToggleHints.textContent = app.typeSettings.showUnderlines ? "ON" : "OFF";
        dom.typeToggleHints.classList.toggle('active', app.typeSettings.showUnderlines);
        updateTypeGhost();
    }

    function updateTypeGhost() {
        const passage = app.currentSet.passages[app.currentPassageIndex];
        
        if (!app.typeSettings.showUnderlines) {
            dom.typeGhostOverlay.textContent = '';
            return;
        }

        // Generate ghost text (replace alphanumeric chars with underscore)
        const ghostText = passage.content.replace(/[a-zA-Z0-9]/g, '_');
        dom.typeGhostOverlay.textContent = ghostText;
    }

    function checkTypeAnswer() {
        const passage = app.currentSet.passages[app.currentPassageIndex];
        const userText = dom.typeInputArea.value.trim();
        const targetText = passage.content.trim();
        
        // Normalize whitespace for comparison
        const normalize = str => str.replace(/\s+/g, ' ').toLowerCase();
        
        const targetWords = normalize(targetText).split(' ');
        const userWords = normalize(userText).split(' ');
        
        let correctCount = 0;
        // Check word by word (simple version)
        userWords.forEach((word, i) => {
            if (i < targetWords.length && word === targetWords[i]) {
                correctCount++;
            }
        });

        const totalWords = targetWords.length;
        const requiredWords = Math.ceil(totalWords * (app.typeSettings.wordsPercentage / 100));
        
        dom.typeFeedback.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
        dom.typeFeedback.classList.add('animate-pop'); // Trigger animation

        if (correctCount >= requiredWords) {
            dom.typeFeedback.textContent = `Success! You matched ${correctCount}/${totalWords} words (Target: ${requiredWords}).`;
            dom.typeFeedback.classList.add('bg-green-100', 'text-green-800');
        } else {
            dom.typeFeedback.textContent = `Keep going! ${correctCount}/${totalWords} words correct. Need ${requiredWords} to pass.`;
            dom.typeFeedback.classList.add('bg-red-100', 'text-red-800');
        }
        
        // Remove animation class so it can trigger again
        setTimeout(() => dom.typeFeedback.classList.remove('animate-pop'), 500);
    }

    // --- ORDER MODE ---
    function initOrderMode() {
        const passage = app.currentSet.passages[app.currentPassageIndex];
        dom.orderPassageTitle.textContent = passage.title || "Untitled Passage";
        dom.orderList.innerHTML = '';
        
        // Split by lines
        let lines = passage.content.split('\n').filter(l => l.trim() !== '');
        
        // Store original index in dataset.
        let items = lines.map((text, index) => ({ text, originalIndex: index }));
        
        // Shuffle
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'order-item draggable-item';
            div.draggable = true;
            div.dataset.originalIndex = item.originalIndex;
            div.textContent = item.text;
            dom.orderList.appendChild(div);
        });
    }

    function checkOrder() {
        const items = dom.orderList.querySelectorAll('.order-item');
        let allCorrect = true;
        let firstIncorrect = null;
        
        items.forEach((item, index) => {
            if (parseInt(item.dataset.originalIndex) === index) {
                item.classList.add('correct');
                item.classList.remove('incorrect');
            } else {
                item.classList.add('incorrect');
                item.classList.remove('correct');
                allCorrect = false;
                if (!firstIncorrect) firstIncorrect = item;
            }
        });
        
        if (allCorrect) {
            showToast("Perfect Order! well done.");
        } else {
            showToast("Not quite right yet. Keep trying!");
            // Shake effect handled by CSS class
            setTimeout(() => {
                items.forEach(i => i.classList.remove('incorrect', 'correct'));
            }, 2000);
        }
    }

    // --- CREATE MODE ---
    function renderCreateEditor() {
        dom.deckTitleInput.value = app.currentSet.title;
        dom.passageEditorList.innerHTML = '';
        
        if (app.currentSet.passages.length === 0) {
            createPassageRow(); // Start with one
        } else {
            app.currentSet.passages.forEach(p => createPassageRow(p.title, p.content));
        }
    }

    function createPassageRow(title = '', content = '') {
        const div = document.createElement('div');
        div.className = 'passage-editor-row draggable-item'; 
        div.draggable = true;
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <span class="font-bold text-[var(--color-text-secondary)] text-sm tracking-wider">PASSAGE</span>
                <button class="delete-card-button text-[var(--color-incorrect)] hover:text-red-400 font-bold transition-colors">&times;</button>
            </div>
            <input type="text" class="passage-title-input w-full bg-transparent border-b-2 border-[var(--color-border)] mb-4 p-2 font-bold text-lg focus:border-[var(--color-primary)] outline-none transition-colors" placeholder="Passage Title" value="${title}">
            <textarea class="passage-content-input w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 h-40 focus:border-[var(--color-primary)] outline-none resize-y transition-colors leading-relaxed" placeholder="Paste text here...">${content}</textarea>
        `;
        
        div.querySelector('.delete-card-button').addEventListener('click', () => {
             div.style.opacity = '0';
             div.style.transform = 'scale(0.9)';
             setTimeout(() => div.remove(), 200);
        });
        dom.passageEditorList.appendChild(div);
    }

    function saveAndLoadSet() {
        const title = dom.deckTitleInput.value.trim() || 'Untitled Set';
        const rows = dom.passageEditorList.querySelectorAll('.passage-editor-row');
        const newPassages = [];
        
        rows.forEach((row, index) => {
            const pTitle = row.querySelector('.passage-title-input').value.trim();
            const pContent = row.querySelector('.passage-content-input').value.trim();
            if (pContent) {
                newPassages.push({
                    id: Date.now() + index,
                    title: pTitle || `Passage ${index + 1}`,
                    content: pContent
                });
            }
        });

        if (newPassages.length === 0) {
            showToast("Please add at least one passage.");
            return;
        }

        app.currentSet = { title, passages: newPassages };
        updateURLHash();
        app.currentPassageIndex = 0;
        setMode('reveal');
        showToast("Set Saved Successfully!");
    }

    // --- DRAG AND DROP HANDLERS ---
    function handleDragStart(e) {
        if (!e.target.classList.contains('draggable-item')) return;
        app.draggedItem = e.target;
        e.dataTransfer.effectAllowed = 'move';
        // Delay adding the class so the drag image is the original element
        requestAnimationFrame(() => e.target.classList.add('dragging'));
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        const container = e.currentTarget;
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(app.draggedItem);
        } else {
            container.insertBefore(app.draggedItem, afterElement);
        }
    }
    
    function handleDrop(e) {
        e.preventDefault();
        app.isCreateDirty = true;
    }

    function handleDragEnd() {
        if (app.draggedItem) app.draggedItem.classList.remove('dragging');
        app.draggedItem = null;
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.draggable-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- UTILS ---
    function showToast(msg) {
        dom.toastNotification.textContent = msg;
        dom.toastNotification.classList.add('show');
        clearTimeout(app.toastTimeout);
        app.toastTimeout = setTimeout(() => dom.toastNotification.classList.remove('show'), 3000);
    }
    
    function base64UrlEncode(str) {
        return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    
    function base64UrlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return decodeURIComponent(escape(atob(str)));
    }

    // Start
    init();
});
