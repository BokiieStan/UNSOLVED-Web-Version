// Game State
const gameState = {
    SANITY: 100,
    chosen: {},
    visitedTopics: new Set(),
    hallucinationTriggered: false,
    currentCase: null,
    cases: {
        'case1': { name: 'The Midnight Murder', difficulty: 'Medium', description: 'A wealthy businessman found dead in his study. No signs of forced entry.' },
        'case2': { name: 'The Gallery Heist', difficulty: 'Hard', description: 'A priceless painting stolen from a high-security art gallery.' },
        'case3': { name: 'The Poisoned Professor', difficulty: 'Easy', description: 'A university professor found dead in his office. Foul play suspected.' }
    },
    collectedEvidence: [],
    achievements: new Set(),
    caseProgress: {},
    soundEnabled: true,
    ttsEnabled: true,
    lastSanityEffect: 0,
    currentSuspect: null,
    hintsUsed: 0,
    maxHints: 3,
    gameStartTime: Date.now(),
    totalPlayTime: 0,
    caseStartTime: null,
    lastSaveTime: null,
    consecutiveCorrectChoices: 0,
    totalChoices: 0
};

// DOM Elements
const elements = {
    // Screens
    caseSelection: document.getElementById('case-selection'),
    mainGame: document.getElementById('main-game'),
    
    // Case selection
    caseGrid: document.getElementById('case-grid'),
    loadGameBtn: document.getElementById('load-game'),
    settingsBtn: document.getElementById('settings-btn'),
    
    // Main game
    leftPanel: document.getElementById('left-panel'),
    caseTitle: document.getElementById('case-title'),
    fileTags: document.getElementById('file-tags'),
    suspectsList: document.getElementById('suspects-list'),
    viewEvidenceBtn: document.getElementById('view-evidence'),
    saveGameBtn: document.getElementById('save-game'),
    quitGameBtn: document.getElementById('quit-game'),
    accuseBtn: document.getElementById('accuse-btn'),
    rightPanel: document.getElementById('right-panel'),
    fileDisplay: document.getElementById('file-display'),
    bottomPanel: document.getElementById('bottom-panel'),
    clock: document.getElementById('clock'),
    sanity: document.getElementById('sanity'),
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    achievements: document.getElementById('achievements'),
    dialogueBox: document.getElementById('dialogue-box'),
    
    // Modals
    settingsModal: document.getElementById('settings-modal'),
    soundToggle: document.getElementById('sound-toggle'),
    ttsToggle: document.getElementById('tts-toggle'),
    closeSettings: document.getElementById('close-settings'),
    evidenceModal: document.getElementById('evidence-modal'),
    collectedTab: document.getElementById('collected-tab'),
    allTab: document.getElementById('all-tab'),
    collectedEvidence: document.getElementById('collected-evidence'),
    allEvidence: document.getElementById('all-evidence'),
    closeEvidence: document.getElementById('close-evidence'),
    interviewModal: document.getElementById('interview-modal'),
    suspectName: document.getElementById('suspect-name'),
    topicButtons: document.getElementById('topic-buttons'),
    suspectResponse: document.getElementById('suspect-response'),
    closeInterview: document.getElementById('close-interview'),
    optionModal: document.getElementById('option-modal'),
    optionTitle: document.getElementById('option-title'),
    optionButtons: document.getElementById('option-buttons'),
    accuseModal: document.getElementById('accuse-modal'),
    suspectChoices: document.getElementById('suspect-choices'),
    achievementModal: document.getElementById('achievement-modal'),
    achievementName: document.getElementById('achievement-name'),
    statsBtn: document.getElementById('stats-btn'),
    statsBtnGame: document.getElementById('stats-btn-game')
};

// Audio Context
let audioContext;
let backgroundMusic;
const soundBuffers = {};

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupEventListeners();
    initAudio();
    updateClock();
    setInterval(updateClock, 1000);
    
    // Auto-save every 5 minutes
    setInterval(() => {
        if (gameState.currentCase) {
            saveGame();
        }
    }, 300000);
});

function initGame() {
    // Initialize case progress
    Object.keys(gameState.cases).forEach(caseId => {
        gameState.caseProgress[caseId] = {
            solved: false,
            tagsCompleted: 0,
            totalTags: 0,
            evidenceCollected: 0,
            suspectsInterviewed: new Set(),
            startTime: null,
            completionTime: null,
            hintsUsed: 0,
            accuracy: 0
        };
    });
    
    // Load saved game if available
    const savedGame = localStorage.getItem('unsolved_save');
    if (savedGame) {
        elements.loadGameBtn.classList.remove('hidden');
    }
    
    // Initialize achievements
    unlockAchievement('First Steps');
}

function setupEventListeners() {
    // Case selection
    elements.loadGameBtn.addEventListener('click', loadGame);
    elements.settingsBtn.addEventListener('click', () => toggleModal(elements.settingsModal));
    elements.closeSettings.addEventListener('click', () => toggleModal(elements.settingsModal));
    elements.statsBtn.addEventListener('click', showStatisticsModal);
    
    // Main game
    elements.saveGameBtn.addEventListener('click', saveGame);
    elements.quitGameBtn.addEventListener('click', showCaseSelection);
    elements.viewEvidenceBtn.addEventListener('click', showEvidenceModal);
    elements.closeEvidence.addEventListener('click', () => toggleModal(elements.evidenceModal));
    elements.accuseBtn.addEventListener('click', showAccuseModal);
    elements.closeInterview.addEventListener('click', () => toggleModal(elements.interviewModal));
    elements.closeAccuse.addEventListener('click', () => toggleModal(elements.accuseModal));
    elements.getHint.addEventListener('click', getHint);
    elements.statsBtnGame.addEventListener('click', showStatisticsModal);
    
    // Statistics modal
    const statsModal = document.getElementById('stats-modal');
    const closeStats = document.getElementById('close-stats');
    if (statsModal && closeStats) {
        closeStats.addEventListener('click', () => toggleModal(statsModal));
    }
    
    // Settings
    elements.soundToggle.addEventListener('change', (e) => {
        gameState.soundEnabled = e.target.checked;
        if (!gameState.soundEnabled && backgroundMusic) {
            backgroundMusic.pause();
        }
    });
    
    elements.ttsToggle.addEventListener('change', (e) => {
        gameState.ttsEnabled = e.target.checked;
    });
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                toggleModal(modal);
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                toggleModal(openModal);
            }
        }
        
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (gameState.currentCase) {
                saveGame();
            }
        }
        
        if (e.key === 'h' && gameState.currentCase) {
            e.preventDefault();
            getHint();
        }
    });
}

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        loadSounds();
    } catch (error) {
        console.warn('Audio not supported:', error);
    }
}

async function loadSounds() {
    const soundFiles = [
        'achievement.wav',
        'background.mp3',
        'case_start.wav',
        'error.wav',
        'evidence.wav',
        'failure.wav',
        'hallucination.wav',
        'nightmare.wav',
        'success.wav',
        'victory.wav'
    ];
    
    for (const soundFile of soundFiles) {
        try {
            await loadSound(`./sounds/${soundFile}`);
        } catch (error) {
            console.warn(`Failed to load sound: ${soundFile}`, error);
        }
    }
}

async function loadSound(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        soundBuffers[url.split('/').pop()] = audioBuffer;
    } catch (error) {
        console.warn(`Error loading sound ${url}:`, error);
    }
}

function playSound(name, loop = false) {
    if (!gameState.soundEnabled || !audioContext || !soundBuffers[name]) {
        return;
    }
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[name];
        source.connect(audioContext.destination);
        
        if (loop) {
            source.loop = true;
            backgroundMusic = source;
        }
        
        source.start();
    } catch (error) {
        console.warn('Error playing sound:', error);
    }
}

function speak(text) {
    if (!gameState.ttsEnabled || !('speechSynthesis' in window)) {
        return;
    }
    
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 0.9;
        speechSynthesis.speak(utterance);
    } catch (error) {
        console.warn('TTS error:', error);
    }
}

function toggleModal(modal) {
    if (!modal) return;
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function showCaseSelection() {
    elements.mainGame.classList.remove('active');
    elements.caseSelection.classList.add('active');
    
    // Clear case-specific state
    gameState.currentCase = null;
    gameState.currentCaseData = null;
    
    // Update case grid with descriptions
    updateCaseGrid();
    
    // Stop background music
    if (backgroundMusic) {
        backgroundMusic.pause();
    }
}

function updateCaseGrid() {
    elements.caseGrid.innerHTML = '';
    
    Object.entries(gameState.cases).forEach(([caseId, caseInfo]) => {
        const caseBtn = document.createElement('div');
        caseBtn.className = 'case-btn';
        caseBtn.innerHTML = `
            <h3>${caseInfo.name}</h3>
            <p>${caseInfo.description}</p>
            <span class="difficulty ${caseInfo.difficulty.toLowerCase()}">${caseInfo.difficulty}</span>
        `;
        
        caseBtn.addEventListener('click', () => startCase(caseId));
        elements.caseGrid.appendChild(caseBtn);
    });
}

async function startCase(caseId) {
    gameState.currentCase = caseId;
    gameState.caseStartTime = Date.now();
    gameState.caseProgress[caseId].startTime = Date.now();
    
    // Reset case-specific state
    gameState.collectedEvidence = [];
    gameState.visitedTopics = new Set();
    gameState.hallucinationTriggered = false;
    gameState.hintsUsed = 0;
    gameState.consecutiveCorrectChoices = 0;
    gameState.totalChoices = 0;
    
    // Update UI
    elements.caseSelection.classList.remove('active');
    elements.mainGame.classList.add('active');
    elements.caseTitle.textContent = `🕵️ ${gameState.cases[caseId].name}`;
    
    // Play case start sound
    if (gameState.soundEnabled) {
        playSound('case_start.wav');
    }
    
    // Load case data
    await loadCaseData(caseId);
    
    // Update hints display
    updateHintsDisplay();
    
    // Add welcome dialogue
    addDialogue(`> Case ${caseId.toUpperCase()} initiated. Good luck, detective.`);
    
    // Start background music
    if (gameState.soundEnabled && backgroundMusic) {
        backgroundMusic.play();
    }
    
    // Unlock case-specific achievement
    unlockAchievement(`Case ${caseId.toUpperCase()} Started`);
}

async function loadCaseData(caseId) {
    try {
        // Load all case data in parallel
        const [tags, options, suspects, evidence, solution] = await Promise.all([
            getCaseTags(caseId),
            loadOptions(caseId),
            loadSuspects(caseId),
            loadEvidence(caseId),
            loadSolution(caseId)
        ]);
        
        // Store case data
        gameState.currentCaseData = {
            tags,
            options,
            suspects,
            evidence,
            solution
        };
        
        // Update UI
        updateFileTags();
        updateSuspectsList();
        updateEvidenceButton();
        updateProgressBar();
        
    } catch (error) {
        console.error('Error loading case data:', error);
        addDialogue('> Error loading case data. Please try again.');
    }
}

async function updateText() {
    try {
        let text = await loadFile();
        
        // Apply DLC modifications if available
        if (window.modifyText) {
            text = modifyText(text, gameState.SANITY);
        }
        
        // Sanity-based hallucinations
        if (gameState.SANITY < 25 && Math.random() < 0.2) {
            text = text.replace("body", "your body");
        }
        
        // Replace tags with player choices
        text = text.replace(/\[\?\s*(.*?)\s*\?\]/g, (match, tag) => {
            return gameState.chosen[tag.trim()] || `[? ${tag.trim()} ?]`;
        });
        
        elements.fileDisplay.textContent = text;
        elements.sanity.textContent = `🧠 SANITY: ${gameState.SANITY}%`;
        
        // Update progress bar
        updateProgressBar();
        
        // Visual effects
        applySanityVisualEffects();
    } catch (error) {
        console.error("Error updating text:", error);
        elements.fileDisplay.textContent = "Error loading case file.";
    }
}

async function loadFile() {
    try {
        const response = await fetch(`cases/${gameState.currentCase}/report.txt`);
        if (!response.ok) throw new Error("File not found");
        return await response.text();
    } catch (error) {
        console.error("Error loading file:", error);
        return "Case file missing or corrupted.";
    }
}

async function getCaseTags(caseId) {
    try {
        const response = await fetch(`./cases/${caseId}/options.json`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading case tags:', error);
        return {};
    }
}

async function loadOptions(caseId) {
    try {
        const response = await fetch(`./cases/${caseId}/options.json`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading options:', error);
        return {};
    }
}

async function loadSuspects(caseId) {
    try {
        const response = await fetch(`./cases/${caseId}/suspects.json`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading suspects:', error);
        return {};
    }
}

async function loadEvidence(caseId) {
    try {
        const response = await fetch(`./cases/${caseId}/evidence.json`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading evidence:', error);
        return {};
    }
}

async function loadSolution(caseId) {
    try {
        const response = await fetch(`./cases/${caseId}/solution.json`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading solution:', error);
        return {};
    }
}

function updateFileTags() {
    if (!gameState.currentCaseData?.options) return;
    
    elements.fileTags.innerHTML = '';
    Object.keys(gameState.currentCaseData.options).forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = `file-tag ${gameState.chosen[tag] ? 'completed' : 'incomplete'}`;
        tagElement.textContent = tag;
        tagElement.addEventListener('click', () => chooseOption(tag));
        elements.fileTags.appendChild(tagElement);
    });
}

async function chooseOption(tag) {
    if (!gameState.currentCaseData?.options[tag]) {
        addDialogue('> No options available for this file.');
        return;
    }
    
    const options = gameState.currentCaseData.options[tag];
    elements.optionTitle.textContent = `Select Option - ${tag}`;
    elements.optionButtons.innerHTML = '';
    
    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option;
        button.className = 'option-btn';
        button.addEventListener('click', () => selectOption(tag, option, options.correctChoice));
        elements.optionButtons.appendChild(button);
    });
    
    toggleModal(elements.optionModal);
}

function selectOption(tag, choice, correctChoice) {
    gameState.totalChoices++;
    gameState.chosen[tag] = choice;
    
    const isCorrect = choice === correctChoice;
    if (isCorrect) {
        gameState.consecutiveCorrectChoices++;
        gameState.SANITY = Math.min(100, gameState.SANITY + 5);
        addDialogue('> Correct choice. Your deduction skills are sharp.');
        unlockAchievement('Sharp Detective');
    } else {
        gameState.consecutiveCorrectChoices = 0;
        gameState.SANITY = Math.max(0, gameState.SANITY - 10);
        addDialogue('> Incorrect choice. Your sanity decreases.');
    }
    
    // Update accuracy
    const currentCase = gameState.caseProgress[gameState.currentCase];
    currentCase.accuracy = (gameState.consecutiveCorrectChoices / gameState.totalChoices) * 100;
    
    // Update UI
    updateFileTags();
    updateProgressBar();
    applySanityVisualEffects();
    
    // Close modal
    toggleModal(elements.optionModal);
    
    // Check for achievements
    if (gameState.consecutiveCorrectChoices >= 5) {
        unlockAchievement('Unstoppable');
    }
    
    if (gameState.SANITY <= 20) {
        unlockAchievement('On the Edge');
    }
}

async function updateSuspectsList() {
    if (!gameState.currentCaseData?.suspects) return;
    
    elements.suspectsList.innerHTML = '';
    Object.keys(gameState.currentCaseData.suspects).forEach(suspect => {
        const suspectElement = document.createElement('div');
        const isInterviewed = gameState.caseProgress[gameState.currentCase].suspectsInterviewed.has(suspect);
        suspectElement.className = `suspect-btn ${isInterviewed ? 'interviewed' : 'not-interviewed'}`;
        suspectElement.textContent = suspect;
        suspectElement.addEventListener('click', () => talkTo(suspect, gameState.currentCaseData.suspects));
        elements.suspectsList.appendChild(suspectElement);
    });
}

async function talkTo(suspect, suspectsData) {
    if (!suspectsData[suspect]) return;
    
    gameState.currentSuspect = suspect;
    elements.suspectName.textContent = `Interview: ${suspect}`;
    elements.topicButtons.innerHTML = '';
    
    Object.keys(suspectsData[suspect]).forEach(topic => {
        const topicBtn = document.createElement('button');
        topicBtn.className = 'topic-btn';
        topicBtn.textContent = topic;
        topicBtn.addEventListener('click', () => discussTopic(topic, suspect, suspectsData));
        elements.topicButtons.appendChild(topicBtn);
    });
    
    toggleModal(elements.interviewModal);
}

async function discussTopic(topic, suspect, suspectsData) {
    const response = suspectsData[suspect][topic];
    if (!response) return;
    
    elements.suspectResponse.textContent = response;
    
    // Mark as interviewed
    gameState.caseProgress[gameState.currentCase].suspectsInterviewed.add(suspect);
    updateSuspectsList();
    updateProgressBar();
    
    // Add to dialogue
    addDialogue(`> Interviewed ${suspect} about ${topic}.`);
    
    // Check for evidence collection
    if (response.includes('evidence') || response.includes('clue')) {
        const evidenceName = `${suspect}'s Testimony`;
        if (!gameState.collectedEvidence.includes(evidenceName)) {
            gameState.collectedEvidence.push(evidenceName);
            addDialogue(`> Evidence collected: ${evidenceName}`);
            updateEvidenceButton();
            updateProgressBar();
        }
    }
}

function updateEvidenceButton() {
    const evidenceCount = gameState.collectedEvidence.length;
    elements.viewEvidenceBtn.textContent = `View All (${evidenceCount})`;
}

async function showEvidenceModal() {
    const evidenceData = gameState.currentCaseData?.evidence || {};
    const allEvidence = Object.keys(evidenceData);
    const collectedEvidence = gameState.collectedEvidence;
    
    // Update tab counts
    document.querySelector('[data-tab="collected"]').textContent = `Collected (${collectedEvidence.length})`;
    document.querySelector('[data-tab="all"]').textContent = `All Evidence (${allEvidence.length})`;
    
    // Populate collected evidence
    elements.collectedEvidence.innerHTML = '';
    collectedEvidence.forEach(evidence => {
        const evidenceItem = createEvidenceItem(evidence, evidenceData[evidence] || 'No description available.');
        elements.collectedEvidence.appendChild(evidenceItem);
    });
    
    // Populate all evidence
    elements.allEvidence.innerHTML = '';
    allEvidence.forEach(evidence => {
        const isCollected = collectedEvidence.includes(evidence);
        const evidenceItem = createEvidenceItem(evidence, evidenceData[evidence], isCollected);
        elements.allEvidence.appendChild(evidenceItem);
    });
    
    toggleModal(elements.evidenceModal);
}

function createEvidenceItem(name, description, isCollected = true) {
    const item = document.createElement('div');
    item.className = `evidence-item ${isCollected ? 'collected' : 'uncollected'}`;
    item.innerHTML = `
        <h4>${name}</h4>
        <p>${description}</p>
    `;
    return item;
}

async function showAccuseModal() {
    if (!gameState.currentCaseData?.suspects) return;
    
    elements.suspectChoices.innerHTML = '';
    Object.keys(gameState.currentCaseData.suspects).forEach(suspect => {
        const suspectBtn = document.createElement('button');
        suspectBtn.className = 'suspect-choice-btn';
        suspectBtn.textContent = suspect;
        suspectBtn.addEventListener('click', () => finalizeAccusation(suspect));
        elements.suspectChoices.appendChild(suspectBtn);
    });
    
    toggleModal(elements.accuseModal);
}

async function finalizeAccusation(suspect) {
    const solution = gameState.currentCaseData?.solution;
    if (!solution) return;
    
    const isCorrect = solution.killer === suspect;
    
    if (isCorrect) {
        addDialogue(`> Correct! ${suspect} was the killer. Case solved!`);
        unlockAchievement('Case Solver');
        playSound('victory.wav');
    } else {
        addDialogue(`> Wrong! ${suspect} was not the killer. The real killer was ${solution.killer}.`);
        gameState.SANITY = Math.max(0, gameState.SANITY - 20);
        playSound('failure.wav');
    }
    
    toggleModal(elements.accuseModal);
    elements.accuseBtn.classList.add('hidden');
    
    // Update case progress
    gameState.caseProgress[gameState.currentCase].solved = true;
    gameState.caseProgress[gameState.currentCase].completionTime = Date.now();
    
    unlockAchievement('Case Complete');
}

function unlockAchievement(name) {
    if (gameState.achievements.has(name)) return;
    
    gameState.achievements.add(name);
    elements.achievements.textContent = `🏆 ${gameState.achievements.size}`;
    
    // Show achievement modal
    elements.achievementName.textContent = name;
    toggleModal(elements.achievementModal);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toggleModal(elements.achievementModal);
    }, 3000);
    
    // Play achievement sound
    if (gameState.soundEnabled) {
        playSound('achievement.wav');
    }
    
    addDialogue(`> Achievement unlocked: ${name}`);
}

function updateProgressBar() {
    if (!gameState.currentCase) return;
    
    const currentCase = gameState.caseProgress[gameState.currentCase];
    const totalEvidence = Object.keys(gameState.currentCaseData?.evidence || {}).length;
    const totalSuspects = Object.keys(gameState.currentCaseData?.suspects || {}).length;
    
    const evidenceProgress = gameState.collectedEvidence.length;
    const suspectProgress = currentCase.suspectsInterviewed.size;
    
    const totalProgress = evidenceProgress + suspectProgress;
    const maxProgress = totalEvidence + totalSuspects;
    
    const percentage = maxProgress > 0 ? (totalProgress / maxProgress) * 100 : 0;
    
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `${totalProgress}/${maxProgress}`;
    
    // Update case progress
    currentCase.evidenceCollected = evidenceProgress;
    currentCase.tagsCompleted = Object.keys(gameState.chosen).length;
    currentCase.totalTags = Object.keys(gameState.currentCaseData?.options || {}).length;
    
    // Check if case is complete
    if (totalProgress >= maxProgress && !currentCase.solved) {
        currentCase.solved = true;
        currentCase.completionTime = Date.now();
        unlockAchievement('Case Complete');
        addDialogue('> All evidence collected and suspects interviewed. You may now make an accusation.');
        elements.accuseBtn.classList.remove('hidden');
    }
}

function addDialogue(text) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const dialogueElement = document.createElement('div');
    dialogueElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${text}`;
    dialogueElement.className = 'dialogue-entry';
    
    elements.dialogueBox.appendChild(dialogueElement);
    elements.dialogueBox.scrollTop = elements.dialogueBox.scrollHeight;
    
    // Limit dialogue entries
    while (elements.dialogueBox.children.length > 10) {
        elements.dialogueBox.removeChild(elements.dialogueBox.firstChild);
    }
    
    // Text-to-speech
    if (gameState.ttsEnabled && 'speechSynthesis' in window) {
        speak(text.replace('> ', ''));
    }
}

function applySanityVisualEffects() {
    const sanity = gameState.SANITY;
    
    // Update sanity display
    elements.sanity.textContent = `🧠 SANITY: ${sanity}%`;
    
    // Apply visual effects based on sanity
    if (sanity < 30) {
        document.body.style.filter = 'hue-rotate(180deg) saturate(1.5)';
        addDialogue('> Your vision is becoming distorted...');
    } else if (sanity < 50) {
        document.body.style.filter = 'saturate(1.2)';
    } else {
        document.body.style.filter = 'none';
    }
    
    // Sanity-based text modifications
    if (sanity < 40 && Math.random() < 0.1) {
        addDialogue('> You hear whispers in the distance...');
    }
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: true });
    elements.clock.textContent = `🕒 ${timeString}`;
    
    // Update play time
    if (gameState.currentCase) {
        gameState.totalPlayTime = Date.now() - gameState.gameStartTime;
    }
    
    // Night event at 3AM
    if (now.getHours() === 3 && now.getMinutes() < 10 && gameState.SANITY < 60) {
        if (window.nightEvent) {
            window.nightEvent(gameState.SANITY, speak);
        }
    }
}

function saveGame() {
    const saveData = {
        sanity: gameState.SANITY,
        chosen: gameState.chosen,
        currentCase: gameState.currentCase,
        collectedEvidence: gameState.collectedEvidence,
        visitedTopics: Array.from(gameState.visitedTopics),
        caseProgress: gameState.caseProgress,
        achievements: Array.from(gameState.achievements),
        soundEnabled: gameState.soundEnabled,
        ttsEnabled: gameState.ttsEnabled,
        totalPlayTime: gameState.totalPlayTime,
        hintsUsed: gameState.hintsUsed,
        consecutiveCorrectChoices: gameState.consecutiveCorrectChoices,
        totalChoices: gameState.totalChoices,
        gameStartTime: gameState.gameStartTime
    };
    
    localStorage.setItem('unsolved_save', JSON.stringify(saveData));
    gameState.lastSaveTime = Date.now();
    addDialogue('> Game saved successfully.');
    
    // Visual feedback
    elements.saveGameBtn.style.background = 'var(--success-color)';
    setTimeout(() => {
        elements.saveGameBtn.style.background = '';
    }, 1000);
}

function loadGame() {
    const saveData = localStorage.getItem('unsolved_save');
    if (!saveData) return;
    
    try {
        const data = JSON.parse(saveData);
        
        gameState.SANITY = data.sanity || 100;
        gameState.chosen = data.chosen || {};
        gameState.currentCase = data.currentCase || "case1";
        gameState.collectedEvidence = data.collectedEvidence || [];
        gameState.visitedTopics = new Set(data.visitedTopics || []);
        gameState.caseProgress = data.caseProgress || {};
        gameState.achievements = new Set(data.achievements || []);
        gameState.soundEnabled = data.soundEnabled !== undefined ? data.soundEnabled : true;
        gameState.ttsEnabled = data.ttsEnabled !== undefined ? data.ttsEnabled : true;
        gameState.totalPlayTime = data.totalPlayTime || 0;
        gameState.hintsUsed = data.hintsUsed || 0;
        gameState.consecutiveCorrectChoices = data.consecutiveCorrectChoices || 0;
        gameState.totalChoices = data.totalChoices || 0;
        gameState.gameStartTime = data.gameStartTime || Date.now();
        
        // Update UI
        elements.soundToggle.checked = gameState.soundEnabled;
        elements.ttsToggle.checked = gameState.ttsEnabled;
        elements.achievements.textContent = `🏆 ${gameState.achievements.size}`;
        
        // Start the loaded case
        startCase(gameState.currentCase);
        
        addDialogue('> Game loaded successfully.');
        unlockAchievement('Returning Detective');
        
    } catch (error) {
        console.error("Error loading game:", error);
        addDialogue("> Error loading saved game.");
    }
}

// New helper functions
function updateHintsDisplay() {
    const hintsRemaining = gameState.maxHints - gameState.hintsUsed;
    const hintsElement = document.getElementById('hints-remaining');
    const hintButton = document.getElementById('get-hint');
    
    if (hintsElement) {
        hintsElement.textContent = `${hintsRemaining}/${gameState.maxHints}`;
    }
    
    if (hintButton) {
        hintButton.disabled = hintsRemaining <= 0;
        hintButton.textContent = hintsRemaining > 0 ? 'Get Hint' : 'No Hints Left';
    }
}

function getHint() {
    if (gameState.hintsUsed >= gameState.maxHints) {
        addDialogue('> No more hints available.');
        return;
    }
    
    gameState.hintsUsed++;
    const currentCase = gameState.caseProgress[gameState.currentCase];
    currentCase.hintsUsed = gameState.hintsUsed;
    
    // Provide contextual hints
    const incompleteTags = Object.keys(gameState.currentCaseData?.options || {}).filter(tag => !gameState.chosen[tag]);
    const uncollectedEvidence = Object.keys(gameState.currentCaseData?.evidence || {}).filter(evidence => 
        !gameState.collectedEvidence.includes(evidence)
    );
    
    if (incompleteTags.length > 0) {
        const randomTag = incompleteTags[Math.floor(Math.random() * incompleteTags.length)];
        addDialogue(`> Hint: Focus on the "${randomTag}" file.`);
    } else if (uncollectedEvidence.length > 0) {
        const randomEvidence = uncollectedEvidence[Math.floor(Math.random() * uncollectedEvidence.length)];
        addDialogue(`> Hint: Look for "${randomEvidence}" evidence.`);
    } else {
        addDialogue('> Hint: You have all the pieces. Review your evidence carefully.');
    }
    
    updateHintsDisplay();
    unlockAchievement('Seeking Help');
}

function showStatisticsModal() {
    const statsModal = document.getElementById('stats-modal');
    if (!statsModal) return;
    
    // Update statistics
    const totalPlayTime = Math.floor(gameState.totalPlayTime / 1000 / 60); // minutes
    const casesSolved = Object.values(gameState.caseProgress).filter(case_ => case_.solved).length;
    const totalAchievements = gameState.achievements.size;
    const accuracy = gameState.totalChoices > 0 ? 
        Math.round((gameState.consecutiveCorrectChoices / gameState.totalChoices) * 100) : 0;
    
    // Update DOM elements
    const elements = {
        'total-play-time': `${totalPlayTime} minutes`,
        'cases-solved': casesSolved.toString(),
        'total-achievements': totalAchievements.toString(),
        'accuracy-rate': `${accuracy}%`,
        'total-hints': gameState.hintsUsed.toString(),
        'current-sanity': `${gameState.SANITY}%`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    toggleModal(statsModal);
}

function showStatistics() {
    const stats = {
        totalPlayTime: Math.floor(gameState.totalPlayTime / 1000 / 60), // minutes
        casesSolved: Object.values(gameState.caseProgress).filter(case_ => case_.solved).length,
        totalAchievements: gameState.achievements.size,
        averageAccuracy: gameState.totalChoices > 0 ? 
            Math.round((gameState.consecutiveCorrectChoices / gameState.totalChoices) * 100) : 0,
        hintsUsed: gameState.hintsUsed
    };
    
    addDialogue(`> Statistics: ${stats.casesSolved} cases solved, ${stats.totalPlayTime} minutes played, ${stats.averageAccuracy}% accuracy.`);
}

// Enhanced achievement system
function unlockAchievement(name) {
    if (gameState.achievements.has(name)) return;
    
    gameState.achievements.add(name);
    elements.achievements.textContent = `🏆 ${gameState.achievements.size}`;
    
    // Show achievement modal
    elements.achievementName.textContent = name;
    toggleModal(elements.achievementModal);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toggleModal(elements.achievementModal);
    }, 3000);
    
    // Play achievement sound
    if (gameState.soundEnabled) {
        playSound('achievement.wav');
    }
    
    addDialogue(`> Achievement unlocked: ${name}`);
}

// DLC functions that can be added via extra_data.js
window.modifyText = function(text, sanity) {
    if (sanity < 50) {
        const glitches = ["[[error]]", "███", "what did you see?", "he's behind you", "I know your name", "🕯️"];
        return text.split(' ').map(word => {
            return Math.random() < (60 - sanity) / 400 ? glitches[Math.floor(Math.random() * glitches.length)] : word;
        }).join(' ');
    }
    return text;
};

window.nightEvent = function(sanity, ttsFunc) {
    document.body.style.backgroundColor = "darkred";
    ttsFunc("You stayed too long.");
    addDialogue("The walls pulse. You hear... breathing.");
    setTimeout(() => {
        document.body.style.backgroundColor = "black";
    }, 4000);
};

window.applyVisualEffect = function(sanity) {
    const effect = document.createElement('div');
    effect.style.position = 'fixed';
    effect.style.top = '0';
    effect.style.left = '0';
    effect.style.width = '100%';
    effect.style.height = '100%';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '9999';
    effect.style.background = 'rgba(0, 255, 0, 0.05)';
    
    if (sanity < 40) {
        effect.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0.3)';
    }
    
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 300);
};

window.loadExtraSuspects = function() {
    return {
        "Echo (??? Unknown)": {
            "Paranoia": "I didn't kill them. But I saw it. In the walls.",
            "Timeline": {
                "Nightfall": "The shadows don't lie.",
                "Last seen": "Right before it all started. I think."
            }
        }
    };
};

window.loadExtraEvidence = function() {
    return {
        "Torn Note": "The writing is smeared and strange: 'THEY KNO W HAT YO U DID.'",
        "Black Feather": "Found at the crime scene. Not from any known species.",
        "Glass Eye": "No prints. Just staring."
    };
};
