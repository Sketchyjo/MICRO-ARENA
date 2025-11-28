export class WordleEngine {
    private words = ['ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ASIDE', 'ASSET', 'AUDIO', 'AUDIT', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'BADLY', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLANK', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CALIF', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOUD', 'COACH', 'COAST', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CURVE', 'CYCLE', 'DAILY', 'DANCE', 'DATED', 'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR', 'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HAPPY', 'HARRY', 'HEART', 'HEAVY', 'HENCE', 'HENRY', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JAPAN', 'JIMMY', 'JOINT', 'JONES', 'JUDGE', 'KNOWN', 'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LEWIS', 'LIGHT', 'LIMIT', 'LINKS', 'LIVES', 'LOCAL', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARIA', 'MATCH', 'MAYBE', 'MAYOR', 'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVED', 'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PETER', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REALM', 'REBEL', 'REFER', 'RELAX', 'REPAY', 'REPLY', 'RIGHT', 'RIGID', 'RIVAL', 'RIVER', 'ROBIN', 'ROGER', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SETUP', 'SEVEN', 'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SIMON', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STEEP', 'STEER', 'STEVE', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEAMS', 'TEETH', 'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIMER', 'TIMES', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TWICE', 'TWIST', 'TYLER', 'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YOUNG', 'YOUTH'];

    initialize() {
        const targetWord = this.words[Math.floor(Math.random() * this.words.length)];
        
        return {
            targetWord,
            player1Guesses: [],
            player2Guesses: [],
            player1Complete: false,
            player2Complete: false,
            player1Score: 0,
            player2Score: 0,
            gameState: 'active',
            player1: null,
            player2: null,
            startTime: Date.now()
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const { guess } = move;
        
        if (!guess || typeof guess !== 'string' || guess.length !== 5) {
            return { valid: false, error: 'Guess must be 5 letters' };
        }
        
        if (!/^[A-Z]+$/.test(guess)) {
            return { valid: false, error: 'Guess must contain only letters' };
        }
        
        const isPlayer1 = gameState.player1 === playerAddress;
        const playerGuesses = isPlayer1 ? gameState.player1Guesses : gameState.player2Guesses;
        const playerComplete = isPlayer1 ? gameState.player1Complete : gameState.player2Complete;
        
        if (playerComplete) {
            return { valid: false, error: 'You have already completed the puzzle' };
        }
        
        if (playerGuesses.length >= 6) {
            return { valid: false, error: 'Maximum 6 guesses allowed' };
        }
        
        return { valid: true };
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const { guess } = move;
        const newState = { ...gameState };
        const isPlayer1 = gameState.player1 === playerAddress;
        
        const result = this.evaluateGuess(guess, newState.targetWord);
        const guessData = {
            word: guess,
            result,
            timestamp: Date.now()
        };
        
        if (isPlayer1) {
            newState.player1Guesses = [...newState.player1Guesses, guessData];
            if (guess === newState.targetWord) {
                newState.player1Complete = true;
                newState.player1Score = this.calculateScore(newState.player1Guesses.length, Date.now() - newState.startTime);
            }
        } else {
            newState.player2Guesses = [...newState.player2Guesses, guessData];
            if (guess === newState.targetWord) {
                newState.player2Complete = true;
                newState.player2Score = this.calculateScore(newState.player2Guesses.length, Date.now() - newState.startTime);
            }
        }
        
        return newState;
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        const player1Done = gameState.player1Complete || gameState.player1Guesses.length >= 6;
        const player2Done = gameState.player2Complete || gameState.player2Guesses.length >= 6;
        
        if (player1Done && player2Done) {
            return {
                isComplete: true,
                scores: {
                    player1: gameState.player1Score,
                    player2: gameState.player2Score
                }
            };
        }
        
        return { isComplete: false };
    }

    private evaluateGuess(guess: string, target: string): string[] {
        const result = new Array(5).fill('absent');
        const targetChars = target.split('');
        const guessChars = guess.split('');
        
        // First pass: mark correct positions
        for (let i = 0; i < 5; i++) {
            if (guessChars[i] === targetChars[i]) {
                result[i] = 'correct';
                targetChars[i] = ''; // Mark as used
                guessChars[i] = ''; // Mark as used
            }
        }
        
        // Second pass: mark present letters
        for (let i = 0; i < 5; i++) {
            if (guessChars[i] !== '') {
                const targetIndex = targetChars.indexOf(guessChars[i]);
                if (targetIndex !== -1) {
                    result[i] = 'present';
                    targetChars[targetIndex] = ''; // Mark as used
                }
            }
        }
        
        return result;
    }

    private calculateScore(guesses: number, timeMs: number): number {
        // Base score for solving
        let score = 100;
        
        // Bonus for fewer guesses (max 500 bonus)
        score += (7 - guesses) * 100;
        
        // Time bonus (faster = higher score, max 100 bonus)
        const timeBonus = Math.max(0, 100 - Math.floor(timeMs / 1000));
        score += timeBonus;
        
        return Math.max(0, score);
    }

    assignPlayers(gameState: any, player1: string, player2: string) {
        gameState.player1 = player1;
        gameState.player2 = player2;
        return gameState;
    }
}