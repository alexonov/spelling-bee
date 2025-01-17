// Game configuration
const RANKS = {
    BEGINNER: 0,
    GOOD_START: 4,
    MOVING_UP: 11,
    GOOD: 18,
    SOLID: 33,
    NICE: 56,
    GREAT: 89,
    AMAZING: 111,
    GENIUS: 155,
    QUEEN_BEE: 222
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

        // Buttons
        document.getElementById('delete-btn').addEventListener('click', () => this.deleteLetter());
        document.getElementById('shuffle-btn').addEventListener('click', () => this.shuffleLetters());
        document.getElementById('enter-btn').addEventListener('click', () => this.submitWord());
        document.getElementById('share-btn').addEventListener('click', () => this.shareProgress());
        document.getElementById('how-to-play').addEventListener('click', () => this.showRules());

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

        if (word.length < 4) {
            this.showMessage('Words must be at least 4 letters long');
            return;
        }

        if (!word.includes(this.centerLetter)) {
            this.showMessage('Word must contain center letter');
            return;
        }

        if (this.foundWords.has(word)) {
            this.showMessage('Word already found');
            return;
        }

        // Check if word only contains valid letters
        const validLetters = new Set([...this.letters, this.centerLetter]);
        if (![...word].every(letter => validLetters.has(letter))) {
            this.showMessage('Invalid letters used');
            return;
        }

        if (!this.dictionary.has(word)) {
            this.showMessage('Not in word list');
            return;
        }

        // Word is valid
        this.foundWords.add(word);
        this.updateScore(word);
        this.displayWord(word);
        this.currentWord = '';
        this.currentWordDisplay.textContent = '';

        // Check if it's a pangram
        const uniqueLetters = new Set([...word]);
        if (uniqueLetters.size === 7) {
            this.showMessage('🎉 Pangram! +7 points', true);
        }

        this.saveGameState();
    }

    updateScore(word) {
        // Calculate points
        let points = word.length >= 4 ? Math.max(1, word.length) : 0;

        // Check for pangram
        const uniqueLetters = new Set([...word]);
        if (uniqueLetters.size === 7) {
            points += 7;
        }

        this.score += points;
        this.scoreDisplay.textContent = this.score;
        this.updateRank();
    }

    updateRank() {
        let currentRank = 'BEGINNER';
        for (const [rank, threshold] of Object.entries(RANKS)) {
            if (this.score >= threshold) {
                currentRank = rank.replace('_', ' ');
            }
        }
        this.rankDisplay.textContent = currentRank;
    }

    displayWord(word) {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word;
        if (new Set([...word]).size === 7) {
            wordSpan.classList.add('pangram');
        }
        this.wordsList.appendChild(wordSpan);

        // Update word count
        const wordCountSpan = document.getElementById('word-count');
        const currentCount = parseInt(wordCountSpan.textContent);
        wordCountSpan.textContent = currentCount + 1;
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
            • Scoring:
              - 4 letters = 1 point
              - 5+ letters = 1 point per letter
              - Using all 7 letters = 7 bonus points
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
                document.getElementById('word-count').textContent = '0';

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
        document.getElementById('word-count').textContent = '0';
        localStorage.removeItem('spellingBeeState');
    }

    initializeGame() {
        // Check if it's a new day
        const today = new Date().toISOString().split('T')[0];
        const lastPlayed = localStorage.getItem('lastPlayedDate');

        if (lastPlayed !== today) {
            this.clearGameState();
            localStorage.setItem('lastPlayedDate', today);
        }

        // Generate today's letters based on date
        const seed = this.hashCode(today);
        this.letters = this.generateLetters(seed);
        this.centerLetter = this.letters[0];
        this.letters = this.letters.slice(1);

        // Display letters
        this.displayLetters();
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new SpellingBee();
});
