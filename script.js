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
            wordsGivenPercentage: 0,
            showUnderlines: true,
            givenIndices: new Set()
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
        // revealHintButton removed
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
        typeIgnoreCase: document.getElementById('type-ignore-case'),
        typeIgnorePunctuation: document.getElementById('type-ignore-punctuation'),
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

        // Manage navigation arrows visibility
        updateNavigationVisibility();

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

    function updateNavigationVisibility() {
        const passageCount = app.currentSet.passages.length;
        const shouldHide = passageCount <= 1;
        const displayVal = shouldHide ? 'none' : 'block';
        
        // Reveal mode arrows
        dom.prevPassageBtn.style.display = displayVal;
        dom.nextPassageBtn.style.display = displayVal;
        
        // Type mode arrows
        dom.typePrevBtn.style.display = displayVal;
        dom.typeNextBtn.style.display = displayVal;
        
        // Order mode arrows
        dom.orderPrevBtn.style.display = displayVal;
        dom.orderNextBtn.style.display = displayVal;
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
        // Hint button listener removed
        dom.revealShowAll.addEventListener('click', () => setRevealState('all'));
        dom.revealHideAll.addEventListener('click', () => setRevealState('none'));
        dom.prevPassageBtn.addEventListener('click', () => changePassage(-1));
        dom.nextPassageBtn.addEventListener('click', () => changePassage(1));

        // Type View
        dom.typeToggleHints.addEventListener('click', toggleTypeHints);
        dom.typeWordsSlider.addEventListener('input', (e) => {
            app.typeSettings.wordsGivenPercentage = e.target.value;
            dom.typeWordsDisplay.textContent = e.target.value + '%';
            // Regenerate hints when slider moves
            initTypeMode(false); 
        });
        dom.typeCheckButton.addEventListener('click', checkTypeAnswer);
        dom.typeResetButton.addEventListener('click', () => initTypeMode(true));
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
            p.dataset.index = index;
            p.dataset.fullText = lineText;
            p.dataset.hintCount = 0; // Tracks characters revealed via hint

            // Internal structure for partial reveals
            const visibleSpan = document.createElement('span');
            visibleSpan.className = 'reveal-visible-part';
            
            const hiddenSpan = document.createElement('span');
            hiddenSpan.className = 'reveal-hidden-part';
            hiddenSpan.textContent = lineText;

            p.appendChild(visibleSpan);
            p.appendChild(hiddenSpan);

            p.addEventListener('click', () => {
                 // Allow clicking specific lines to toggle
                 if (p.classList.contains('hidden')) {
                     fullyRevealLine(p);
                 } else {
                     hideLine(p);
                 }
            });
            dom.revealContentArea.appendChild(p);
        });
    }

    function fullyRevealLine(p) {
        p.classList.remove('hidden');
        p.classList.add('visible');
        p.dataset.hintCount = p.dataset.fullText.length;
        
        const visibleSpan = p.querySelector('.reveal-visible-part');
        const hiddenSpan = p.querySelector('.reveal-hidden-part');
        
        visibleSpan.textContent = p.dataset.fullText;
        hiddenSpan.textContent = '';
    }

    function hideLine(p) {
        p.classList.remove('visible');
        p.classList.add('hidden');
        p.dataset.hintCount = 0;
        
        const visibleSpan = p.querySelector('.reveal-visible-part');
        const hiddenSpan = p.querySelector('.reveal-hidden-part');
        
        visibleSpan.textContent = '';
        hiddenSpan.textContent = p.dataset.fullText;
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
            fullyRevealLine(line);
            
            // Smooth scroll to keep context
            if (nextHiddenIndex > 2) { 
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
                    fullyRevealLine(line);
                }, i * 30); // 30ms stagger
            });
        } else {
            lines.forEach(line => {
                hideLine(line);
            });
        }
    }

    // --- TYPE MODE ---
    function initTypeMode(resetInput = true) {
        const passage = app.currentSet.passages[app.currentPassageIndex];
        dom.typePassageTitle.textContent = passage.title || "Untitled Passage";
        
        if (resetInput) {
            dom.typeInputArea.value = '';
            dom.typeFeedback.className = 'mt-6 hidden p-6 rounded-xl text-center font-bold text-lg shadow-md';
            dom.typeFeedback.textContent = '';
        }
        
        // Determine which words to give (hint)
        const normalize = str => str.replace(/\n/g, ' \n ').split(' ').filter(x => x);
        const words = normalize(passage.content);
        
        // Fix for freeze bug: Calculate percentage based on actual words, not total tokens (which includes newlines)
        const validIndices = [];
        words.forEach((word, index) => {
            if (word.trim() !== '') {
                validIndices.push(index);
            }
        });

        const wordsToGiveCount = Math.floor(validIndices.length * (app.typeSettings.wordsGivenPercentage / 100));
        
        app.typeSettings.givenIndices = new Set();
        
        // Shuffle valid indices to pick random ones efficiently
        for (let i = validIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
        }
        
        // Take the first N indices
        for (let i = 0; i < wordsToGiveCount; i++) {
            app.typeSettings.givenIndices.add(validIndices[i]);
        }

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

        // Logic: 
        // 1. Split original text into tokens (preserving newlines/spaces mostly for visual matching)
        // 2. If index is in givenIndices, show the word.
        // 3. Else, replace alphanumeric chars with underscore.
        
        // A simple split strategy that handles newlines
        let currentWordIndex = 0;
        const ghostText = passage.content.replace(/[\w\u00C0-\u00FF]+|\n/g, (match) => {
            if (match === '\n') return '\n';
            
            // Check if this word should be given
            const isGiven = app.typeSettings.givenIndices.has(currentWordIndex);
            currentWordIndex++;

            if (isGiven) {
                return match;
            } else {
                return match.replace(/[a-zA-Z0-9\u00C0-\u00FF]/g, '_');
            }
        });

        dom.typeGhostOverlay.textContent = ghostText;
    }

    function checkTypeAnswer() {
        const passage = app.currentSet.passages[app.currentPassageIndex];
        const userText = dom.typeInputArea.value; // Get raw input including spaces/newlines
        const targetText = passage.content;
        
        // Get options from checkboxes
        const ignoreCase = dom.typeIgnoreCase.checked;
        const ignorePunct = dom.typeIgnorePunctuation.checked;

        // Generate Diff HTML
        const resultHtml = generateFeedbackHTML(targetText, userText, ignoreCase, ignorePunct);
        
        dom.typeFeedback.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
        dom.typeFeedback.classList.add('animate-pop'); // Trigger animation
        
        // Always show the container
        dom.typeFeedback.classList.remove('hidden');
        dom.typeFeedback.innerHTML = resultHtml;
        
        // Remove animation class so it can trigger again
        setTimeout(() => dom.typeFeedback.classList.remove('animate-pop'), 500);
    }
    
    function generateFeedbackHTML(target, user, ignoreCase, ignorePunct) {
        // --- PREPARATION ---
        // We create "Alignment Strings" to run the diff algorithm on.
        // These are simplified versions of the text (lowercase, maybe stripped punctuation)
        // that help the algorithm match 'T' with 't' even if casing is wrong.
        
        // We also need to map indices from the Align string back to the Original string
        // so we can display the Original characters with the correct styling.
        
        function createMap(str) {
            let alignStr = "";
            let indices = []; // indices[alignIndex] = originalIndex
            
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                // Should this char be part of alignment?
                // If ignorePunct is TRUE, we skip punctuation in the alignment string.
                // This lets "Hello World" match "Hello, World" (the comma is ignored).
                
                let include = true;
                if (ignorePunct) {
                    if (/[^\w\s\u00C0-\u00FF]|_/.test(char)) {
                        include = false;
                    }
                }
                
                if (include) {
                    alignStr += char.toLowerCase(); // Always lower for alignment
                    indices.push(i);
                }
            }
            return { alignStr, indices };
        }

        const mapT = createMap(target);
        const mapU = createMap(user);
        
        // Run LCS Diff on the simplified alignment strings
        const diffs = calculateDiff(mapT.alignStr, mapU.alignStr);
        // diffs is array of [op, char]. op: 0(match), -1(del from target), 1(ins to user)
        
        let html = "";
        let tAlignIdx = 0; // Index in mapT.alignStr
        let tLastOrigIdx = 0; // Track last processed index in original target to find skipped punct
        
        // Helper to escape HTML to prevent XSS
        const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

        // --- RENDER LOOP ---
        diffs.forEach(([op, char]) => {
            if (op === 1) {
                // INSERTION (User typed something extra).
                // We generally ignore showing user's extra typos in the "Target" display
                // to keep the passage looking clean.
                return; 
            }
            
            // For Equal (0) or Delete (-1), we are processing a char from Target.
            // First, check if we skipped any chars (punctuation) in the original Target 
            // before this alignment character.
            
            const tCurrOrigIdx = mapT.indices[tAlignIdx];
            
            // Print any skipped characters (punctuation) between last match and this match
            if (tCurrOrigIdx > tLastOrigIdx) {
                const skippedPart = target.substring(tLastOrigIdx, tCurrOrigIdx);
                // If ignorePunct is TRUE, these are green (validly ignored).
                // If ignorePunct is FALSE, these shouldn't have been skipped (logic error?),
                // but our createMap logic only skips if ignorePunct is TRUE. 
                // So these are always Green/Valid here.
                html += `<span class="text-green-600 opacity-60">${esc(skippedPart)}</span>`;
            }
            
            // Now handle the current aligned character
            const originalChar = target[tCurrOrigIdx];
            
            if (op === 0) {
                // MATCH in alignment (e.g. 't' matches 't')
                // But we must check Strict Case if needed.
                
                // We compare the *Original* target char with the *Original* user char
                // We need to find which user char this aligned to.
                // Since we are iterating diffs linearly, and op=0 consumes one from U,
                // we can find it via indices logic, but simpler:
                // We don't have easy access to the exact user original char here due to the diff structure flattening.
                // HOWEVER: matching 't' (target) with 'T' (user) -> alignStr matched 't'=='t'.
                
                // Heuristic: If ignoreCase is OFF, and originalChar != lower(originalChar),
                // we assume user typed lowercase because alignment used lowercase.
                // Better: We need to check if we can get the user char. 
                // Since `diffs` doesn't give us the User's Original Index easily for matches,
                // we accept a minor approximation:
                // If strict case is ON, we rely on the fact that if they were different cases,
                // they would match in alignment but we can't easily verify the user's casing 
                // without tracking the user index strictly.
                
                // Let's refine: We need to know if the User typed 'T' or 't'.
                // Standard LCS doesn't tell us "Which char from B matched A".
                
                // FIX: Since this is a study tool, let's assume if it Matched in LCS, 
                // it is CORRECT unless we are in Strict Case mode and the Target has uppercase.
                // If Target is Uppercase and User is Lowercase, it's an error.
                // But we don't know what User typed! 
                
                // RE-FIX: We will trust the user matched correctly if it's green, 
                // UNLESS we want to be super pedantic. 
                // Actually, the user specifically asked for "not capitalized... underlined red".
                // This means we MUST know what the user typed.
                
                // To do this simply without complex index tracking:
                // If the user checked "Ignore Case", it is Green.
                // If the user Unchecked "Ignore Case", we need to verify.
                // But wait, if "Ignore Case" is Unchecked, then our alignment map 
                // SHOULD NOT have lowercased the strings!
                // If we don't lowercase, then 'T' and 't' won't match in LCS.
                // They will show up as a DELETE 'T' and INSERT 't'.
                
                // PERFECT SOLUTION:
                // Modify `createMap` to NOT lowercase if ignoreCase is FALSE.
                // Then LCS will treat 'T' and 't' as different.
                // 'T' will become a DELETE operation (-1).
                // DELETE operations are rendered as RED UNDERLINE.
                // This solves the logic perfectly!
                
                html += `<span class="text-green-600">${esc(originalChar)}</span>`;
                
            } else if (op === -1) {
                // DELETE (Char in Target, missing in User)
                // This renders as Red Underline.
                // This covers:
                // 1. Completely missing letters/words.
                // 2. Wrong case (if strict mode is on, 'T' != 't', so 'T' is deleted).
                // 3. Missing punctuation (if strict mode is on).
                
                html += `<span class="underline decoration-wavy decoration-red-500 text-red-600 font-bold bg-red-50/50">${esc(originalChar)}</span>`;
            }
            
            tLastOrigIdx = tCurrOrigIdx + 1; // Advance
            tAlignIdx++; // Advance alignment index
        });
        
        // Append any trailing skipped punctuation in Target
        if (tLastOrigIdx < target.length) {
            const tail = target.substring(tLastOrigIdx);
            // If we are here, these were skipped.
            // If ignorePunct is True -> Green.
            // If ignorePunct is False -> They wouldn't be skipped.
            html += `<span class="text-green-600 opacity-60">${esc(tail)}</span>`;
        }
        
        return html;
        
        // --- INNER HELPER: REFINED CREATE MAP ---
        function createMap(str) {
            let alignStr = "";
            let indices = [];
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                let include = true;
                if (ignorePunct) {
                    if (/[^\w\s\u00C0-\u00FF]|_/.test(char)) include = false;
                }
                
                if (include) {
                    // CRITICAL LOGIC:
                    // If ignoreCase is TRUE, we normalize to lower.
                    // If ignoreCase is FALSE, we keep original case.
                    // This forces LCS to see 'T' vs 't' as a mismatch (Delete/Insert)
                    // which triggers the Red Underline logic.
                    alignStr += ignoreCase ? char.toLowerCase() : char;
                    indices.push(i);
                }
            }
            return { alignStr, indices };
        }
    }

    // Standard LCS (Longest Common Subsequence) Algorithm
    // Returns array of operations to transform s1 to s2.
    // [0, char] = match
    // [-1, char] = delete from s1
    // [1, char] = insert into s2
    function calculateDiff(s1, s2) {
        const m = s1.length;
        const n = s2.length;
        // Using 1D array optimization for space if needed, but 2D is clearer
        // Given text length usually < 5000 chars, O(N*M) is acceptable for JS (25M ops max ~ 100ms)
        
        const C = new Int32Array((m + 1) * (n + 1)); // Flattened 2D array
        
        // Fill LCS table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    C[i * (n + 1) + j] = C[(i - 1) * (n + 1) + (j - 1)] + 1;
                } else {
                    const v1 = C[i * (n + 1) + (j - 1)];
                    const v2 = C[(i - 1) * (n + 1) + j];
                    C[i * (n + 1) + j] = (v1 > v2) ? v1 : v2;
                }
            }
        }
        
        // Backtrack
        let i = m, j = n;
        const result = [];
        
        while (i > 0 && j > 0) {
            if (s1[i - 1] === s2[j - 1]) {
                result.push([0, s1[i - 1]]);
                i--; j--;
            } else if (C[(i - 1) * (n + 1) + j] > C[i * (n + 1) + (j - 1)]) {
                result.push([-1, s1[i - 1]]); // Delete from s1
                i--;
            } else {
                result.push([1, s2[j - 1]]); // Insert into s2
                j--;
            }
        }
        while (i > 0) { result.push([-1, s1[i - 1]]); i--; }
        while (j > 0) { result.push([1, s2[j - 1]]); j--; }
        
        return result.reverse();
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
