// Game State
const gameState = {
    SANITY: 100,
    chosen: {},
    visitedTopics: new Set(),
    hallucinationTriggered: false,
    currentCase: null,
    cases: {
        'case1': { name: 'The Midnight Murder', difficulty: 'Medium' },
        'case2': { name: 'The Gallery Heist', difficulty: 'Hard' },
        'case3': { name: 'The Poisoned Professor', difficulty: 'Easy' }
    },
    collectedEvidence: [],
    achievements: new Set(),
    caseProgress: {},
    soundEnabled: true,
    ttsEnabled: true,
    lastSanityEffect: 0,
    currentSuspect: null
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
    achievementName: document.getElementById('achievement-name')
};

// Audio Context
let audioContext;
let backgroundMusic;
const soundBuffers = {};

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupEventListeners();
});

function initGame() {
    // Initialize case progress
    Object.keys(gameState.cases).forEach(caseId => {
        gameState.caseProgress[caseId] = {
            solved: false,
            tagsCompleted: 0,
            totalTags: 0,
            evidenceCollected: 0,
            suspectsInterviewed: new Set()
        };
    });
    
    // Check for saved game
    if (localStorage.getItem('unsolved_save')) {
        elements.loadGameBtn.classList.remove('hidden');
    }
    
    // Initialize audio
    initAudio();
    
    // Show case selection
    showCaseSelection();
    
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
}

function setupEventListeners() {
    // Case selection
    elements.loadGameBtn.addEventListener('click', loadGame);
    elements.settingsBtn.addEventListener('click', () => toggleModal(elements.settingsModal));
    
    // Settings
    elements.soundToggle.addEventListener('change', (e) => {
        gameState.soundEnabled = e.target.checked;
        if (gameState.soundEnabled && backgroundMusic) {
            backgroundMusic.loop = true;
            backgroundMusic.start();
        } else if (backgroundMusic) {
            backgroundMusic.stop();
        }
    });
    
    elements.ttsToggle.addEventListener('change', (e) => {
        gameState.ttsEnabled = e.target.checked;
    });
    
    elements.closeSettings.addEventListener('click', () => toggleModal(elements.settingsModal));
    
    // Main game
    elements.viewEvidenceBtn.addEventListener('click', showEvidenceModal);
    elements.saveGameBtn.addEventListener('click', saveGame);
    elements.quitGameBtn.addEventListener('click', showCaseSelection);
    elements.accuseBtn.addEventListener('click', showAccuseModal);
    elements.closeEvidence.addEventListener('click', () => toggleModal(elements.evidenceModal));
    elements.closeInterview.addEventListener('click', () => toggleModal(elements.interviewModal));
}

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Preload sound effects
        const soundFiles = [
            'background', 'case_start', 'success', 
            'error', 'evidence', 'hallucination',
            'victory', 'failure', 'achievement'
        ];
        
        soundFiles.forEach(sound => {
            loadSound(`sounds/${sound}.mp3`).then(buffer => {
                soundBuffers[sound] = buffer;
            }).catch(() => {
                loadSound(`sounds/${sound}.wav`).then(buffer => {
                    soundBuffers[sound] = buffer;
                });
            });
        });
    } catch (e) {
        console.error('Audio initialization failed:', e);
        gameState.soundEnabled = false;
        elements.soundToggle.checked = false;
    }
}

async function loadSound(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error(`Error loading sound ${url}:`, e);
        throw e;
    }
}

function playSound(name, loop = false) {
    if (!gameState.soundEnabled || !soundBuffers[name]) return;
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[name];
        source.connect(audioContext.destination);
        source.loop = loop;
        source.start();
        
        if (name === 'background') {
            backgroundMusic = source;
        }
        
        return source;
    } catch (e) {
        console.error('Error playing sound:', e);
    }
}

function speak(text) {
    if (!gameState.ttsEnabled) return;
    
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (gameState.SANITY < 40) {
            utterance.rate = 1.3;
            utterance.pitch = 0.8;
        } else {
            utterance.rate = 1.7;
        }
        
        window.speechSynthesis.speak(utterance);
    }
}

function toggleModal(modal) {
    modal.classList.toggle('hidden');
}

function showCaseSelection() {
    elements.caseSelection.classList.add('active');
    elements.mainGame.classList.remove('active');
    
    // Populate case grid
    elements.caseGrid.innerHTML = '';
    Object.entries(gameState.cases).forEach(([caseId, caseInfo]) => {
        const caseBtn = document.createElement('button');
        caseBtn.className = 'case-btn';
        caseBtn.innerHTML = `${caseInfo.name}<br>(${caseInfo.difficulty})`;
        caseBtn.addEventListener('click', () => startCase(caseId));
        elements.caseGrid.appendChild(caseBtn);
    });
    
    // Show load button if save exists
    elements.loadGameBtn.classList.toggle('hidden', !localStorage.getItem('unsolved_save'));
}

async function startCase(caseId) {
    gameState.currentCase = caseId;
    gameState.visitedTopics = new Set();
    gameState.hallucinationTriggered = false;
    gameState.collectedEvidence = [];
    gameState.chosen = {};
    
    // Initialize case progress
    const tags = await getCaseTags();
    gameState.caseProgress[caseId] = {
        solved: false,
        tagsCompleted: 0,
        totalTags: tags.size,
        evidenceCollected: 0,
        suspectsInterviewed: new Set()
    };
    
    setupMainUI();
    updateText();
    
    // Play case start sound
    playSound('case_start');
}

function setupMainUI() {
    elements.caseSelection.classList.remove('active');
    elements.mainGame.classList.add('active');
    
    // Set case title
    const caseInfo = gameState.cases[gameState.currentCase];
    elements.caseTitle.textContent = `🕵️ ${caseInfo.name}`;
    
    // Update all UI elements
    updateFileTags();
    updateSuspectsList();
    updateEvidenceButton();
    updateProgressBar();
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

async function getCaseTags() {
    try {
        const text = await loadFile();
        const tags = new Set();
        const regex = /\[\?\s*(.*?)\s*\?\]/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            tags.add(match[1].trim());
        }
        
        return tags;
    } catch (error) {
        console.error("Error getting tags:", error);
        return new Set();
    }
}

async function loadOptions() {
    try {
        const response = await fetch(`cases/${gameState.currentCase}/options.json`);
        if (!response.ok) throw new Error("File not found");
        return await response.json();
    } catch (error) {
        console.error("Error loading options:", error);
        return {};
    }
}

async function loadSuspects() {
    try {
        const response = await fetch(`cases/${gameState.currentCase}/suspects.json`);
        if (!response.ok) throw new Error("File not found");
        const suspects = await response.json();
        
        // Merge with DLC suspects if available
        if (window.loadExtraSuspects) {
            const extraSuspects = window.loadExtraSuspects();
            return { ...suspects, ...extraSuspects };
        }
        
        return suspects;
    } catch (error) {
        console.error("Error loading suspects:", error);
        return {};
    }
}

async function loadEvidence() {
    try {
        const response = await fetch(`cases/${gameState.currentCase}/evidence.json`);
        if (!response.ok) throw new Error("File not found");
        const evidence = await response.json();
        
        // Merge with DLC evidence if available
        if (window.loadExtraEvidence) {
            const extraEvidence = window.loadExtraEvidence();
            return { ...evidence, ...extraEvidence };
        }
        
        return evidence;
    } catch (error) {
        console.error("Error loading evidence:", error);
        return {};
    }
}

async function loadSolution() {
    try {
        const response = await fetch(`cases/${gameState.currentCase}/solution.json`);
        if (!response.ok) throw new Error("File not found");
        return await response.json();
    } catch (error) {
        console.error("Error loading solution:", error);
        return { killer: "", motive: "" };
    }
}

function updateFileTags() {
    elements.fileTags.innerHTML = '';
    const tags = Array.from(getCaseTags());
    
    tags.forEach(tag => {
        const isCompleted = tag in gameState.chosen;
        const tagBtn = document.createElement('button');
        tagBtn.className = `file-tag ${isCompleted ? 'completed' : 'incomplete'}`;
        tagBtn.textContent = `[${tag}]`;
        tagBtn.addEventListener('click', () => chooseOption(tag));
        elements.fileTags.appendChild(tagBtn);
    });
}

async function chooseOption(tag) {
    const options = await loadOptions();
    if (!options || !options[tag]) {
        addDialogue(`> No options available for [${tag}]`);
        return;
    }
    
    // Clear previous options
    elements.optionButtons.innerHTML = '';
    elements.optionTitle.textContent = `Select: ${tag}`;
    
    // Add new options
    options[tag].choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.addEventListener('click', () => selectOption(tag, choice, options[tag].correct));
        elements.optionButtons.appendChild(btn);
    });
    
    toggleModal(elements.optionModal);
}

function selectOption(tag, choice, correctChoice) {
    toggleModal(elements.optionModal);
    
    if (choice !== correctChoice) {
        gameState.SANITY = Math.max(0, gameState.SANITY - 10);
        addDialogue(`> Wrong: ${choice}`);
        playSound('error');
    } else {
        gameState.caseProgress[gameState.currentCase].tagsCompleted++;
        addDialogue(`> Correct: ${choice}`);
        playSound('success');
        
        // Check for achievement
        if (gameState.caseProgress[gameState.currentCase].tagsCompleted === 
            gameState.caseProgress[gameState.currentCase].totalTags) {
            unlockAchievement("Case Solver");
        }
    }
    
    gameState.chosen[tag] = choice;
    speak(`${tag} set to ${choice}`);
    updateText();
    updateFileTags();
    saveGame();
}

async function updateSuspectsList() {
    elements.suspectsList.innerHTML = '';
    const suspects = await loadSuspects();
    
    Object.keys(suspects).forEach(suspect => {
        const isInterviewed = gameState.caseProgress[gameState.currentCase].suspectsInterviewed.has(suspect);
        const suspectBtn = document.createElement('button');
        suspectBtn.className = `suspect-btn ${isInterviewed ? 'interviewed' : 'not-interviewed'}`;
        suspectBtn.textContent = suspect;
        suspectBtn.addEventListener('click', () => talkTo(suspect, suspects));
        elements.suspectsList.appendChild(suspectBtn);
    });
}

async function talkTo(suspect, suspectsData) {
    gameState.currentSuspect = suspect;
    elements.suspectName.textContent = `Interview: ${suspect}`;
    elements.topicButtons.innerHTML = '';
    elements.suspectResponse.textContent = '';
    
    // Add topic buttons
    Object.keys(suspectsData[suspect]).forEach(topic => {
        const btn = document.createElement('button');
        btn.className = 'topic-btn';
        btn.textContent = topic;
        btn.addEventListener('click', () => discussTopic(topic, suspect, suspectsData));
        elements.topicButtons.appendChild(btn);
    });
    
    toggleModal(elements.interviewModal);
}

async function discussTopic(topic, suspect, suspectsData) {
    const isVisited = gameState.visitedTopics.has(topic);
    let response;
    
    if (isVisited) {
        response = "I've already told you about that.";
    } else {
        response = suspectsData[suspect][topic];
        gameState.visitedTopics.add(topic);
        
        // Chance to find evidence
        if (Math.random() < 0.3 && gameState.SANITY > 30) {
            const evidence = await loadEvidence();
            const evidenceKeys = Object.keys(evidence);
            
            if (evidenceKeys.length > 0) {
                const newEvidence = evidenceKeys[Math.floor(Math.random() * evidenceKeys.length)];
                
                if (!gameState.collectedEvidence.includes(newEvidence)) {
                    gameState.collectedEvidence.push(newEvidence);
                    gameState.caseProgress[gameState.currentCase].evidenceCollected++;
                    addDialogue(`> Found new evidence: ${newEvidence}`);
                    playSound('evidence');
                    updateEvidenceButton();
                }
            }
        }
    }
    
    const movement = ["nods", "shrugs", "taps desk", "leans forward", "glances away"][Math.floor(Math.random() * 5)];
    const headMove = ["left", "right", "down", "up"][Math.floor(Math.random() * 4)];
    
    const line = `${suspect} (${movement}): ${response} They move their head ${headMove}.`;
    elements.suspectResponse.textContent = line;
    addDialogue(line);
    speak(response);
    
    // Track interview progress
    gameState.caseProgress[gameState.currentCase].suspectsInterviewed.add(suspect);
    saveGame();
    updateSuspectsList();
    
    // Update sanity based on topic
    if (topic.toLowerCase().includes('murder') || topic.toLowerCase().includes('death')) {
        gameState.SANITY = Math.max(0, gameState.SANITY - 2);
        updateText();
    }
}

function updateEvidenceButton() {
    const evidenceCount = gameState.collectedEvidence.length;
    elements.viewEvidenceBtn.textContent = `View Evidence (${evidenceCount})`;
    
    // Show accuse button if enough evidence collected
    const evidenceData = loadEvidence().then(evidence => {
        const totalEvidence = Object.keys(evidence).length;
        elements.accuseBtn.classList.toggle('hidden', evidenceCount < totalEvidence * 0.8);
    });
}

async function showEvidenceModal() {
    const evidence = await loadEvidence();
    
    // Update tab counts
    document.querySelector('[data-tab="collected"]').textContent = 
        `Collected (${gameState.collectedEvidence.length})`;
    document.querySelector('[data-tab="all"]').textContent = 
        `All Evidence (${Object.keys(evidence).length})`;
    
    // Populate collected evidence
    elements.collectedEvidence.innerHTML = '';
    gameState.collectedEvidence.forEach(evidenceName => {
        if (evidence[evidenceName]) {
            const item = createEvidenceItem(evidenceName, evidence[evidenceName]);
            elements.collectedEvidence.appendChild(item);
        }
    });
    
    // Populate all evidence
    elements.allEvidence.innerHTML = '';
    Object.entries(evidence).forEach(([name, desc]) => {
        const isCollected = gameState.collectedEvidence.includes(name);
        const item = createEvidenceItem(name, desc, isCollected);
        elements.allEvidence.appendChild(item);
    });
    
    // Set up tab switching
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });
    
    toggleModal(elements.evidenceModal);
}

function createEvidenceItem(name, description, isCollected = true) {
    const item = document.createElement('div');
    item.className = 'evidence-item';
    
    const title = document.createElement('h4');
    title.textContent = `${isCollected ? '✅' : '❌'} ${name}`;
    title.style.color = isCollected ? '#aaa' : '#444';
    
    const desc = document.createElement('p');
    desc.textContent = description;
    desc.style.color = isCollected ? '#aaa' : '#444';
    
    item.appendChild(title);
    item.appendChild(desc);
    return item;
}

async function showAccuseModal() {
    elements.suspectChoices.innerHTML = '';
    const suspects = await loadSuspects();
    
    Object.keys(suspects).forEach(suspect => {
        const btn = document.createElement('button');
        btn.textContent = suspect;
        btn.addEventListener('click', () => finalizeAccusation(suspect));
        elements.suspectChoices.appendChild(btn);
    });
    
    toggleModal(elements.accuseModal);
}

async function finalizeAccusation(suspect) {
    toggleModal(elements.accuseModal);
    const solution = await loadSolution();
    const realKiller = solution.killer || "";
    
    if (suspect === realKiller) {
        addDialogue(`> CORRECT! ${suspect} is the killer! Case solved.`);
        gameState.caseProgress[gameState.currentCase].solved = true;
        playSound('victory');
        unlockAchievement("Master Detective");
    } else {
        addDialogue(`> WRONG! ${suspect} is not the killer. Your sanity decreases.`);
        gameState.SANITY = Math.max(0, gameState.SANITY - 20);
        playSound('failure');
        updateText();
    }
    
    saveGame();
}

function unlockAchievement(name) {
    if (!gameState.achievements.has(name)) {
        gameState.achievements.add(name);
        elements.achievements.textContent = `🏆 ${gameState.achievements.size}`;
        
        // Show achievement popup
        elements.achievementName.textContent = name;
        toggleModal(elements.achievementModal);
        playSound('achievement');
        
        setTimeout(() => toggleModal(elements.achievementModal), 3000);
    }
}

function updateProgressBar() {
    const progress = gameState.caseProgress[gameState.currentCase];
    const percent = progress.totalTags > 0 ? (progress.tagsCompleted / progress.totalTags) * 100 : 0;
    
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `${progress.tagsCompleted}/${progress.totalTags}`;
}

function addDialogue(text) {
    elements.dialogueBox.textContent += text + '\n';
    elements.dialogueBox.scrollTop = elements.dialogueBox.scrollHeight;
}

function applySanityVisualEffects() {
    const now = Date.now();
    if (now - gameState.lastSanityEffect < 2000) return; // Throttle effects
    
    gameState.lastSanityEffect = now;
    
    if (gameState.SANITY < 70) {
        // Add subtle distortion
        if (window.applyVisualEffect) {
            window.applyVisualEffect(gameState.SANITY);
        }
    }
    
    if (gameState.SANITY < 40 && !gameState.hallucinationTriggered) {
        addDialogue("The room warps for a moment. Reality is soft.");
        gameState.hallucinationTriggered = true;
        playSound('hallucination');
    }
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: true });
    elements.clock.textContent = `🕒 ${timeString}`;
    
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
        ttsEnabled: gameState.ttsEnabled
    };
    
    localStorage.setItem('unsolved_save', JSON.stringify(saveData));
    addDialogue('> Game saved successfully.');
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
        
        // Update UI
        elements.soundToggle.checked = gameState.soundEnabled;
        elements.ttsToggle.checked = gameState.ttsEnabled;
        elements.achievements.textContent = `🏆 ${gameState.achievements.size}`;
        
        // Start the loaded case
        startCase(gameState.currentCase);
    } catch (error) {
        console.error("Error loading game:", error);
        addDialogue("> Error loading saved game.");
    }
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