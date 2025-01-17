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
        this.letters = [];
        this.centerLetter = '';
        this.foundWords = new Set();
        this.score = 0;
        this.currentWord = '';
        this.dictionary = new Set();

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
        document.querySelector('.close-words').addEventListener('click', () => this.toggleMobileWords());

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
            this.initializeGame();
            this.loadGameState();
        });
    }

    async loadDictionary() {
        // Common English words that could be used in the game
        const commonWords = [
            'LOSE', 'CLOSE', 'SOLE', 'LESS', 'LOSS', 'LOST', 'ELSE',
            'CELL', 'CLOSE', 'JOKE', 'LOSE', 'SCALE', 'SEAL', 'SELF',
            'SELL', 'SLICE', 'SOLE', 'SOLVE', 'SCENE', 'SCOPE',
            'SCORE', 'SCONE', 'CLOSE', 'CLONE', 'LOOSE', 'LOSER'
        ];
        this.dictionary = new Set(commonWords);
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
        // Simple letter generation based on seed
        const vowels = 'AEIOU';
        const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
        const result = [];

        const random = (max) => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed % max;
        };

        // Ensure at least 2 vowels
        result.push(vowels[random(vowels.length)]);
        result.push(vowels[random(vowels.length)]);

        // Add 5 more unique letters
        while (result.length < 7) {
            const letter = random(2) === 0
                ? vowels[random(vowels.length)]
                : consonants[random(consonants.length)];
            if (!result.includes(letter)) {
                result.push(letter);
            }
        }

        return result;
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
        this.updateWordDropdown();
    }

    deleteLetter() {
        this.currentWord = this.currentWord.slice(0, -1);
        this.currentWordDisplay.textContent = this.currentWord;
        this.updateWordDropdown();
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

        // Dictionary check disabled for debugging
        // if (!this.dictionary.has(word)) {
        //     clearAndShowMessage('Not in word list');
        //     return;
        // }

        // Word is valid
        this.foundWords.add(word);
        this.updateScore(word);
        this.displayWord(word);
        this.currentWord = '';
        this.currentWordDisplay.textContent = '';


        this.saveGameState();
    }

    updateScore(word) {
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
        this.updateRank();
    }

    updateRank() {
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
        if (this.currentWord.length < 1) {
            this.wordDropdown.classList.remove('show');
            return;
        }

        const currentLetters = new Set([...this.currentWord.toUpperCase()]);
        const possibleWords = Array.from(this.dictionary)
            .filter(word =>
                word.startsWith(this.currentWord.toUpperCase()) &&
                !this.foundWords.has(word) &&
                word.includes(this.centerLetter) &&
                [...word].every(letter => this.letters.includes(letter) || letter === this.centerLetter)
            )
            .sort((a, b) => a.length - b.length);

        if (possibleWords.length === 0) {
            this.wordDropdown.classList.remove('show');
            return;
        }

        this.wordDropdownList.innerHTML = '';
        possibleWords.forEach(word => {
            const span = document.createElement('span');
            span.textContent = word;
            if (new Set([...word]).size === 7) {
                span.classList.add('pangram');
            }
            span.addEventListener('click', () => {
                this.currentWord = word;
                this.currentWordDisplay.textContent = word;
                this.submitWord();
                this.wordDropdown.classList.remove('show');
            });
            this.wordDropdownList.appendChild(span);
        });

        this.wordDropdown.classList.add('show');
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

        modal.style.display = 'block';
        // Trigger reflow for animation
        modal.offsetHeight;
        modal.classList.add('show');

        const close = document.querySelector('.close');
        const hideModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // Match transition duration
        };

        close.onclick = hideModal;
        window.onclick = (e) => {
            if (e.target === modal) hideModal();
        };

        // Auto-hide after 2 seconds for game messages
        if (!isPangram && message !== this.getRules()) {
            setTimeout(hideModal, 2000);
        }
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
        const gameState = {
            date: new Date().toISOString().split('T')[0],
            score: this.score,
            foundWords: Array.from(this.foundWords)
        };
        localStorage.setItem('spellingBeeState', JSON.stringify(gameState));
    }

    loadGameState() {
        const savedState = localStorage.getItem('spellingBeeState');
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.date === new Date().toISOString().split('T')[0]) {
                this.score = state.score;
                this.foundWords = new Set(state.foundWords);
                this.scoreDisplay.textContent = this.score;
                this.updateRank();

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
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new SpellingBee();
});
