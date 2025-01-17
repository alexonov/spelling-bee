// Game configuration
const RANKS = {
    BEGINNER: 0,
    GOOD_START: 6,
    MOVING_UP: 14,
    GOOD: 22,
    SOLID: 42,
    NICE: 70,
    GREAT: 112,
    AMAZING: 140,
    GENIUS: 195,
    QUEEN_BEE: 279
};

class SpellingBee {
    constructor() {
        // Initialize properties
        this.letters = [];
        this.centerLetter = '';
        this.foundWords = new Set();
        this.score = 0;
        this.currentWord = '';
        this.dictionary = new Set();
        this.theme = localStorage.getItem('theme') || 'light';
        this.stats = this.loadStats();

        // Set theme
        document.documentElement.setAttribute('data-theme', this.theme);

        // DOM elements
        this.cells = document.querySelectorAll('.cell');
        this.currentWordDisplay = document.getElementById('current-word');
        this.scoreDisplay = document.getElementById('current-score');
        this.rankDisplay = document.getElementById('current-rank');
        this.wordsList = document.getElementById('words-list');
        this.mobileWordsList = document.getElementById('mobile-words-list');
        this.mobileOverlay = document.querySelector('.mobile-overlay');
        this.wordsCountDesktop = document.getElementById('words-count-desktop');
        this.wordDropdown = document.querySelector('.word-dropdown');
        this.wordDropdownList = document.querySelector('.word-list');

        // Buttons
        document.getElementById('delete-btn').addEventListener('click', () => this.deleteLetter());
        document.getElementById('shuffle-btn').addEventListener('click', () => this.shuffleLetters());
        document.getElementById('enter-btn').addEventListener('click', () => this.submitWord());
        document.getElementById('share-btn').addEventListener('click', () => this.shareProgress());
        document.getElementById('how-to-play').addEventListener('click', () => this.showRules());
        document.getElementById('words-btn').addEventListener('click', () => this.toggleFoundWords());
        document.getElementById('stats-btn').addEventListener('click', () => this.showStats());
        document.querySelector('.close-words').addEventListener('click', () => this.toggleMobileWords());
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Close buttons for modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                this.hideModal(modal);
            });
        });

        // Click outside to close modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });

        // Close mobile overlay when clicking outside
        this.mobileOverlay.addEventListener('click', (e) => {
            if (e.target === this.mobileOverlay) {
                this.toggleMobileWords();
            }
        });

        // Cell click handlers
        this.cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const letter = cell.textContent;
                if (letter) this.addLetter(letter);
            });
        });

        // Keyboard handlers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.submitWord();
            } else if (e.key === 'Backspace') {
                this.deleteLetter();
            } else if (/^[a-zA-Z]$/.test(e.key)) {
                const letter = e.key.toUpperCase();
                if (this.letters.includes(letter) || letter === this.centerLetter) {
                    this.addLetter(letter);
                }
            }
        });

        // Initialize game
        this.loadDictionary().then(() => {
            // Check if already played today
            const today = new Date().toISOString().split('T')[0];
            const lastPlayed = localStorage.getItem('lastPlayed');

            if (lastPlayed === today) {
                this.loadGameState();
            } else {
                this.initializeGame();
            }
        });
    }

    async loadDictionary() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/alexonov/spelling-bee/main/enable1.txt');
            const text = await response.text();
            const words = text.split(/\r?\n/);
            for (const word of words) {
                const cleanWord = word.trim().toUpperCase();
                if (cleanWord.length > 0) {
                    this.dictionary.add(cleanWord);
                }
            }
        } catch (error) {
            console.error('Error loading dictionary:', error);
            this.dictionary = new Set();
        }
    }

    toggleMobileWords() {
        this.mobileOverlay.classList.toggle('show');
        document.body.style.overflow = this.mobileOverlay.classList.contains('show') ? 'hidden' : '';
    }

    initializeGame() {
        // Generate today's letters based on date
        const today = new Date().toISOString().split('T')[0];
        const seed = this.hashCode(today);
        this.letters = this.generateLetters(seed);
        this.centerLetter = this.letters[0];
        this.letters = this.letters.slice(1);

        // Display letters
        this.displayLetters();
        this.saveGameState();
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    generateLetters(seed) {
        // Letter frequencies (normalized and adjusted for better gameplay)
        const letterFreq = {
            'A': 8.2, 'B': 1.5, 'C': 2.8, 'D': 4.3, 'E': 12.7,
            'F': 2.2, 'G': 2.0, 'H': 6.1, 'I': 7.0, 'J': 0.15,
            'K': 0.77, 'L': 4.0, 'M': 2.4, 'N': 6.7, 'O': 7.5,
            'P': 1.9, 'Q': 0.095, 'R': 6.0, 'S': 6.3, 'T': 9.1,
            'U': 2.8, 'V': 0.98, 'W': 2.4, 'X': 0.15, 'Y': 2.0,
            'Z': 0.074
        };

        // Seeded random function
        const random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        // Helper function for weighted random selection
        const weightedRandom = (weights) => {
            const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
            let r = random() * totalWeight;

            for (const [item, weight] of Object.entries(weights)) {
                r -= weight;
                if (r <= 0) return item;
            }
            return Object.keys(weights)[0];
        };

        // First, select exactly 2 vowels
        const vowels = ['A', 'E', 'I', 'O', 'U'];
        const selectedVowels = new Set();
        const vowelWeights = {};
        vowels.forEach(v => vowelWeights[v] = letterFreq[v]);

        while (selectedVowels.size < 2) {
            const vowel = weightedRandom(vowelWeights);
            selectedVowels.add(vowel);
            delete vowelWeights[vowel];
        }

        // Then select 5 consonants
        const consonantWeights = { ...letterFreq };
        vowels.forEach(v => delete consonantWeights[v]);

        // Adjust weights to give rare letters a better chance
        // Boost rare letters (below 2% frequency) by multiplying their weight
        for (const [letter, freq] of Object.entries(consonantWeights)) {
            if (freq < 2) {
                consonantWeights[letter] = freq * 3; // Triple the chance for rare letters
            }
        }

        const selectedConsonants = new Set();
        while (selectedConsonants.size < 5) {
            const consonant = weightedRandom(consonantWeights);
            selectedConsonants.add(consonant);
            delete consonantWeights[consonant];
        }

        // Combine and shuffle all selected letters
        const allLetters = [...selectedVowels, ...selectedConsonants];

        // Fisher-Yates shuffle with seeded random
        for (let i = allLetters.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [allLetters[i], allLetters[j]] = [allLetters[j], allLetters[i]];
        }

        return allLetters;
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
    }

    displayLetters() {
        const positions = ['top', 'top-right', 'bottom-right', 'bottom-left', 'top-left', 'center'];
        let letterIndex = 0;

        this.cells.forEach(cell => {
            const position = cell.dataset.position;
            if (position === 'center') {
                cell.textContent = this.centerLetter;
            } else {
                cell.textContent = this.letters[letterIndex++];
            }
        });
    }

    addLetter(letter) {
        this.currentWord += letter;
        this.currentWordDisplay.textContent = this.currentWord;
    }

    deleteLetter() {
        this.currentWord = this.currentWord.slice(0, -1);
        this.currentWordDisplay.textContent = this.currentWord;
    }

    shuffleLetters() {
        this.letters = this.shuffleArray([...this.letters]);
        let letterIndex = 0;

        this.cells.forEach(cell => {
            if (cell.dataset.position !== 'center') {
                cell.textContent = this.letters[letterIndex++];
            }
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    submitWord() {
        const word = this.currentWord.toUpperCase();

        const clearAndShowMessage = (message) => {
            this.showMessage(message);
            this.currentWord = '';
            this.currentWordDisplay.textContent = '';
            this.wordDropdown.classList.remove('show');
        };

        if (word.length < 4) {
            clearAndShowMessage('Words must be at least 4 letters long');
            return;
        }

        if (!word.includes(this.centerLetter)) {
            clearAndShowMessage('Word must contain center letter');
            return;
        }

        if (this.foundWords.has(word)) {
            clearAndShowMessage('Word already found');
            return;
        }

        // Check if word only contains valid letters
        const validLetters = new Set([...this.letters, this.centerLetter]);
        if (![...word].every(letter => validLetters.has(letter))) {
            clearAndShowMessage('Invalid letters used');
            return;
        }

        if (!this.dictionary.has(word)) {
            clearAndShowMessage('Not in word list');
            return;
        }

        // Word is valid
        this.foundWords.add(word);
        this.updateScore(word);
        this.displayWord(word);
        this.currentWord = '';
        this.currentWordDisplay.textContent = '';

        this.saveGameState();
    }

    updateScore(word) {
        const previousScore = this.score;
        const previousRank = this.rankDisplay.textContent;

        // Calculate base points based on word length
        let points = 0;
        switch (word.length) {
            case 4:
                points = 1;
                break;
            default:
                points = word.length; // 5 points for 5 letters, 6 for 6, etc.
                break;
        }

        // Check for pangram (uses all 7 letters)
        const uniqueLetters = new Set([...word]);
        if (uniqueLetters.size === 7) {
            points += 7; // Bonus points for pangram
            this.showMessage(`🎉 Pangram! +${points} points (${points - 7} + 7 bonus)`, true);
        } else if (word.length >= 7) {
            this.showMessage(`Nice! +${points} points`, false);
        }

        this.score += points;
        this.scoreDisplay.textContent = this.score;
        this.updateRank(previousRank);
    }

    updateRank(previousRank) {
        let currentRank = 'BEGINNER';
        let progress = 0;
        const rankEntries = Object.entries(RANKS);

        // Find current rank and calculate progress
        for (let i = 0; i < rankEntries.length; i++) {
            const [rank, threshold] = rankEntries[i];
            const nextThreshold = rankEntries[i + 1]?.[1] || threshold;

            if (this.score >= threshold) {
                currentRank = rank.replace('_', ' ');
                // Calculate progress to next rank (0-4)
                if (i < rankEntries.length - 1) {
                    const range = nextThreshold - threshold;
                    const scoreInRange = this.score - threshold;
                    progress = Math.min(4, Math.floor((scoreInRange / range) * 5));
                } else {
                    progress = 4; // Max progress if at highest rank
                }
            }
        }

        // Update rank display
        this.rankDisplay.textContent = currentRank;

        // Update progress dots
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index <= progress);
        });

        // Show message if rank increased
        if (currentRank !== previousRank && previousRank) {
            this.showMessage(`🎉 New Rank: ${currentRank}!`, true);
        }
    }

    toggleFoundWords() {
        const dropdown = document.querySelector('.word-dropdown');
        const wordList = document.querySelector('.word-list');

        // Hide any other dropdowns
        this.wordDropdown.classList.remove('show');

        if (!dropdown.classList.contains('show')) {
            // Position dropdown below the word count button
            const wordsBtn = document.getElementById('words-btn');
            const rect = wordsBtn.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${rect.bottom + 5}px`;
            dropdown.style.left = `${rect.left}px`;
            dropdown.style.width = `${rect.width}px`;
            dropdown.style.maxHeight = '300px';

            // Update list with found words
            wordList.innerHTML = '';
            const sortedWords = Array.from(this.foundWords).sort();
            sortedWords.forEach(word => {
                const span = document.createElement('span');
                span.textContent = word;
                if (new Set([...word]).size === 7) {
                    span.classList.add('pangram');
                }
                wordList.appendChild(span);
            });

            // Close dropdown when clicking outside
            const closeDropdown = (e) => {
                if (!dropdown.contains(e.target) && e.target !== wordsBtn) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                }
            };
            setTimeout(() => document.addEventListener('click', closeDropdown), 0);
        }

        dropdown.classList.toggle('show');
    }

    updateWordDropdown() {
        // Remove word dropdown functionality since we can't efficiently
        // predict possible words with streaming dictionary
        this.wordDropdown.classList.remove('show');
    }

    displayWord(word) {
        const createWordSpan = () => {
            const span = document.createElement('span');
            span.textContent = word;
            if (new Set([...word]).size === 7) {
                span.classList.add('pangram');
            }
            return span;
        };

        // Add to desktop list
        this.wordsList.appendChild(createWordSpan());

        // Add to mobile list
        this.mobileWordsList.appendChild(createWordSpan());

        // Update word counts
        const count = this.foundWords.size;
        document.getElementById('word-count').textContent = count;
        this.wordsCountDesktop.textContent = count;

        // Hide dropdown after word is added
        this.wordDropdown.classList.remove('show');
    }

    showMessage(message, isPangram = false) {
        const modal = document.getElementById('modal');
        const modalText = document.getElementById('modal-text');

        modalText.textContent = message;
        modalText.className = isPangram ? 'pangram' : '';

        this.showModal(modal);

        // Auto-hide after 2 seconds for game messages
        if (!isPangram && message !== this.getRules()) {
            setTimeout(() => this.hideModal(modal), 2000);
        }
    }

    showModal(modal) {
        modal.style.display = 'block';
        modal.offsetHeight; // Trigger reflow for animation
        modal.classList.add('show');
    }

    hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    loadStats() {
        const defaultStats = {
            played: 0,
            queenBees: 0,
            currentStreak: 0,
            maxStreak: 0,
            rankDistribution: {
                'BEGINNER': 0,
                'GOOD START': 0,
                'MOVING UP': 0,
                'GOOD': 0,
                'SOLID': 0,
                'NICE': 0,
                'GREAT': 0,
                'AMAZING': 0,
                'GENIUS': 0,
                'QUEEN BEE': 0
            },
            lastPlayed: null,
            lastRank: null
        };

        const savedStats = localStorage.getItem('spellingBeeStats');
        if (!savedStats) return defaultStats;

        const stats = JSON.parse(savedStats);

        // Handle old format stats
        if (!stats.hasOwnProperty('lastRank')) {
            stats.lastRank = null;
            // Convert wins to queenBees if present
            if (stats.hasOwnProperty('wins')) {
                stats.queenBees = stats.wins;
                delete stats.wins;
            }
        }

        // Ensure all properties exist
        return { ...defaultStats, ...stats };
    }

    saveStats() {
        localStorage.setItem('spellingBeeStats', JSON.stringify(this.stats));
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const currentRank = this.rankDisplay.textContent;

        // Update played count and last played date only if it's a new day
        if (this.stats.lastPlayed !== today) {
            this.stats.played++;
            this.stats.lastPlayed = today;
            this.stats.lastRank = null; // Reset last rank for new day
        }

        // Only update rank distribution if we've reached a higher rank
        if (currentRank !== this.stats.lastRank) {
            // Get rank index from RANKS object
            const rankEntries = Object.entries(RANKS);
            const currentRankIndex = rankEntries.findIndex(([rank]) => rank.replace('_', ' ') === currentRank);
            const lastRankIndex = this.stats.lastRank ?
                rankEntries.findIndex(([rank]) => rank.replace('_', ' ') === this.stats.lastRank) : -1;

            // Only update if we've reached a higher rank
            if (currentRankIndex > lastRankIndex) {
                // Remove the count from the previous rank if it exists
                if (this.stats.lastRank) {
                    this.stats.rankDistribution[this.stats.lastRank]--;
                }
                // Add to the new rank
                this.stats.rankDistribution[currentRank] = (this.stats.rankDistribution[currentRank] || 0) + 1;
                this.stats.lastRank = currentRank;

                // Update Queen Bee count and streak
                if (currentRank === 'QUEEN BEE') {
                    this.stats.queenBees++;
                    this.stats.currentStreak++;
                    this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.currentStreak);
                }
            }
        }

        this.saveStats();
    }

    showStats() {
        const statsModal = document.getElementById('stats-modal');

        // Update stats display
        document.getElementById('stats-played').textContent = this.stats.played;
        document.getElementById('stats-win-rate').textContent =
            this.stats.played > 0
                ? Math.round((this.stats.queenBees / this.stats.played) * 100) + '%'
                : '0%';
        document.getElementById('stats-current-streak').textContent = this.stats.currentStreak;
        document.getElementById('stats-max-streak').textContent = this.stats.maxStreak;

        // Update rank distribution chart
        const rankChart = document.getElementById('rank-chart');
        rankChart.innerHTML = '';

        const maxCount = Math.max(...Object.values(this.stats.rankDistribution));
        Object.entries(this.stats.rankDistribution).forEach(([rank, count]) => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';

            const label = document.createElement('div');
            label.className = 'chart-label';
            label.textContent = rank;

            const fill = document.createElement('div');
            fill.className = 'chart-fill';

            const value = document.createElement('div');
            value.className = 'chart-value';
            value.style.width = maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%';

            const number = document.createElement('div');
            number.className = 'chart-number';
            number.textContent = count;

            fill.appendChild(value);
            bar.appendChild(label);
            bar.appendChild(fill);
            bar.appendChild(number);
            rankChart.appendChild(bar);
        });

        this.showModal(statsModal);
    }

    getRules() {
        return `
            Rules:
            • Each word must contain the center letter
            • Words must be 4 letters or longer
            • Letters can be reused

            Scoring:
            • 4-letter words: 1 point each
            • 5-letter words: 5 points each
            • 6-letter words: 6 points each
            • 7-letter words: 7 points each
            • Pangrams (using all 7 letters): +7 bonus points

            Ranks:
            • Beginner: 0
            • Good Start: 6
            • Moving Up: 14
            • Good: 22
            • Solid: 42
            • Nice: 70
            • Great: 112
            • Amazing: 140
            • Genius: 195
            • Queen Bee: 279
        `;
    }

    showRules() {
        this.showMessage(this.getRules());
    }

    shareProgress() {
        const today = new Date().toLocaleDateString();
        const shareText = `Spelling Bee ${today}
Score: ${this.score}
Rank: ${this.rankDisplay.textContent}
Found ${this.foundWords.size} words`;

        if (navigator.share) {
            navigator.share({
                title: 'Spelling Bee Score',
                text: shareText
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareText)
                .then(() => this.showMessage('Score copied to clipboard!'))
                .catch(console.error);
        }
    }

    saveGameState() {
        const today = new Date().toISOString().split('T')[0];
        const gameState = {
            date: today,
            score: this.score,
            foundWords: Array.from(this.foundWords),
            letters: this.letters,
            centerLetter: this.centerLetter,
            theme: this.theme
        };
        localStorage.setItem('spellingBeeState', JSON.stringify(gameState));
        localStorage.setItem('lastPlayed', today);
        this.updateStats();
    }

    loadGameState() {
        const savedState = localStorage.getItem('spellingBeeState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.score = state.score;
            this.foundWords = new Set(state.foundWords);
            this.letters = state.letters;
            this.centerLetter = state.centerLetter;
            this.theme = state.theme || 'light';

            // Update UI
            this.scoreDisplay.textContent = this.score;
            document.documentElement.setAttribute('data-theme', this.theme);
            this.updateRank();
            this.displayLetters();

            // Clear existing words
            this.wordsList.innerHTML = '';
            this.mobileWordsList.innerHTML = '';
            document.getElementById('word-count').textContent = '0';
            this.wordsCountDesktop.textContent = '0';

            // Add words in alphabetical order
            const sortedWords = Array.from(this.foundWords).sort();
            sortedWords.forEach(word => this.displayWord(word));
        }
    }

    clearGameState() {
        this.score = 0;
        this.foundWords = new Set();
        this.scoreDisplay.textContent = '0';
        this.updateRank();
        this.wordsList.innerHTML = '';
        this.mobileWordsList.innerHTML = '';
        document.getElementById('word-count').textContent = '0';
        this.wordsCountDesktop.textContent = '0';
        localStorage.removeItem('spellingBeeState');
        localStorage.removeItem('lastPlayed');
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new SpellingBee();
});
