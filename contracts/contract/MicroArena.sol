// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MicroArena
 * @dev Production-ready smart contract for 1v1 skill-based gaming with cUSD stakes
 * @notice Supports 6 game types: Chess, WHOT, Survey Clash, Mancala, Connect4, Wordle
 */
contract MicroArena is ReentrancyGuard, Ownable {
    // ============ ENUMS ============

    enum GameType {
        CHESS,
        WHOT,
        SURVEY,
        MANCALA,
        CONNECT4,
        WORDLE
    }
    enum MatchStatus {
        WAITING,
        ACTIVE,
        COMMITTED,
        REVEALED,
        COMPLETED,
        CANCELLED
    }

    // ============ STRUCTS ============

    struct Match {
        uint256 id;
        GameType gameType;
        address player1;
        address player2;
        uint256 stake; // Amount in cUSD (18 decimals)
        MatchStatus status;
        bytes32 p1CommitHash; // keccak256(score, salt)
        bytes32 p2CommitHash;
        uint256 p1Score;
        uint256 p2Score;
        address winner; // address(0) for draw
        uint256 createdAt;
        uint256 commitDeadline;
        uint256 revealDeadline;
    }

    // ============ STATE VARIABLES ============

    IERC20 public immutable cUSD;
    uint256 public platformFeePercent = 2; // 2% platform fee
    uint256 public constant MAX_FEE = 10; // Maximum 10% fee
    uint256 public commitTimeout = 5 minutes;
    uint256 public revealTimeout = 3 minutes;

    uint256 private matchCounter;
    mapping(uint256 => Match) public matches;
    mapping(address => uint256[]) public playerMatches;
    mapping(address => uint256) public playerWins;
    mapping(address => uint256) public playerLosses;

    address public feeCollector;
    uint256 public totalFeesCollected;

    // ============ EVENTS ============

    event MatchCreated(
        uint256 indexed matchId,
        address indexed player1,
        GameType gameType,
        uint256 stake
    );
    event MatchJoined(uint256 indexed matchId, address indexed player2);
    event ScoreCommitted(
        uint256 indexed matchId,
        address indexed player,
        bytes32 commitHash
    );
    event ScoreRevealed(
        uint256 indexed matchId,
        address indexed player,
        uint256 score
    );
    event MatchCompleted(
        uint256 indexed matchId,
        address indexed winner,
        uint256 payout
    );
    event MatchCancelled(uint256 indexed matchId, address indexed canceller);
    event TimeoutClaimed(
        uint256 indexed matchId,
        address indexed claimer,
        address indexed winner
    );

    // ============ ERRORS ============

    error InvalidStake();
    error MatchNotFound();
    error MatchAlreadyFull();
    error MatchNotActive();
    error AlreadyCommitted();
    error NotCommitted();
    error InvalidReveal();
    error DeadlineNotPassed();
    error NotPlayerInMatch();
    error InsufficientAllowance();
    error TransferFailed();

    // ============ CONSTRUCTOR ============

    constructor(address _cUSDAddress) Ownable(msg.sender) {
        cUSD = IERC20(_cUSDAddress);
        feeCollector = msg.sender;
    }

    // ============ MATCH CREATION & JOINING ============

    /**
     * @notice Create a new match with cUSD stake
     * @param gameType The type of game to play
     * @param stake Amount of cUSD to stake (in wei, 18 decimals)
     */
    function createMatch(
        GameType gameType,
        uint256 stake
    ) external nonReentrant returns (uint256) {
        if (stake == 0) revert InvalidStake();

        // Transfer cUSD from player to contract
        if (cUSD.allowance(msg.sender, address(this)) < stake)
            revert InsufficientAllowance();
        if (!cUSD.transferFrom(msg.sender, address(this), stake))
            revert TransferFailed();

        uint256 matchId = ++matchCounter;

        matches[matchId] = Match({
            id: matchId,
            gameType: gameType,
            player1: msg.sender,
            player2: address(0),
            stake: stake,
            status: MatchStatus.WAITING,
            p1CommitHash: bytes32(0),
            p2CommitHash: bytes32(0),
            p1Score: 0,
            p2Score: 0,
            winner: address(0),
            createdAt: block.timestamp,
            commitDeadline: 0,
            revealDeadline: 0
        });

        playerMatches[msg.sender].push(matchId);

        emit MatchCreated(matchId, msg.sender, gameType, stake);
        return matchId;
    }

    /**
     * @notice Join an existing match
     * @param matchId The ID of the match to join
     */
    function joinMatch(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (m.player2 != address(0)) revert MatchAlreadyFull();
        if (m.status != MatchStatus.WAITING) revert MatchNotActive();

        // Transfer cUSD from player2 to contract
        if (cUSD.allowance(msg.sender, address(this)) < m.stake)
            revert InsufficientAllowance();
        if (!cUSD.transferFrom(msg.sender, address(this), m.stake))
            revert TransferFailed();

        m.player2 = msg.sender;
        m.status = MatchStatus.ACTIVE;

        playerMatches[msg.sender].push(matchId);

        emit MatchJoined(matchId, msg.sender);
    }

    /**
     * @notice Cancel a match that hasn't been joined yet
     * @param matchId The ID of the match to cancel
     */
    function cancelMatch(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (msg.sender != m.player1) revert NotPlayerInMatch();
        if (m.status != MatchStatus.WAITING) revert MatchNotActive();

        m.status = MatchStatus.CANCELLED;

        // Refund stake to player1
        if (!cUSD.transfer(m.player1, m.stake)) revert TransferFailed();

        emit MatchCancelled(matchId, msg.sender);
    }

    // ============ COMMIT-REVEAL PATTERN ============

    /**
     * @notice Commit score hash after game completion
     * @param matchId The ID of the match
     * @param scoreHash keccak256(abi.encodePacked(score, salt, msg.sender, block.number))
     */
    function commitScore(uint256 matchId, bytes32 scoreHash) external {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (m.status != MatchStatus.ACTIVE && m.status != MatchStatus.COMMITTED)
            revert MatchNotActive();
        if (msg.sender != m.player1 && msg.sender != m.player2)
            revert NotPlayerInMatch();
        
        // Prevent empty hash commits
        if (scoreHash == bytes32(0)) revert InvalidReveal();

        if (msg.sender == m.player1) {
            if (m.p1CommitHash != bytes32(0)) revert AlreadyCommitted();
            m.p1CommitHash = scoreHash;
        } else {
            if (m.p2CommitHash != bytes32(0)) revert AlreadyCommitted();
            m.p2CommitHash = scoreHash;
        }

        // If both players have committed, set reveal deadline
        if (m.p1CommitHash != bytes32(0) && m.p2CommitHash != bytes32(0)) {
            m.status = MatchStatus.COMMITTED;
            m.commitDeadline = block.timestamp;
            m.revealDeadline = block.timestamp + revealTimeout;
        } else if (m.commitDeadline == 0) {
            // First commit sets the commit deadline
            m.commitDeadline = block.timestamp + commitTimeout;
        }

        emit ScoreCommitted(matchId, msg.sender, scoreHash);
    }

    /**
     * @notice Reveal score and salt
     * @param matchId The ID of the match
     * @param score The actual score achieved
     * @param salt Random bytes32 used in commitment
     * @param commitBlock Block number when commitment was made
     */
    function revealScore(
        uint256 matchId,
        uint256 score,
        bytes32 salt,
        uint256 commitBlock
    ) external {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (
            m.status != MatchStatus.COMMITTED &&
            m.status != MatchStatus.REVEALED
        ) revert MatchNotActive();
        if (msg.sender != m.player1 && msg.sender != m.player2)
            revert NotPlayerInMatch();
        
        // Check reveal deadline
        if (block.timestamp > m.revealDeadline) revert DeadlineNotPassed();
        
        // Validate score range
        if (!_validateScore(m.gameType, score)) revert InvalidReveal();

        // Enhanced hash includes sender and block number to prevent replay attacks
        bytes32 expectedHash = keccak256(abi.encodePacked(score, salt, msg.sender, commitBlock));

        if (msg.sender == m.player1) {
            if (m.p1CommitHash != expectedHash) revert InvalidReveal();
            if (m.p1Score != 0) revert AlreadyCommitted(); // Already revealed
            m.p1Score = score;
        } else {
            if (m.p2CommitHash != expectedHash) revert InvalidReveal();
            if (m.p2Score != 0) revert AlreadyCommitted(); // Already revealed
            m.p2Score = score;
        }

        emit ScoreRevealed(matchId, msg.sender, score);

        // If both players have revealed, finalize match
        if (m.p1Score != 0 && m.p2Score != 0) {
            _finalizeMatch(matchId);
        } else {
            m.status = MatchStatus.REVEALED;
        }
    }

    /**
     * @notice Claim win by timeout if opponent doesn't commit/reveal in time
     * @param matchId The ID of the match
     */
    function claimTimeout(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (msg.sender != m.player1 && msg.sender != m.player2)
            revert NotPlayerInMatch();

        address winner;

        // Timeout during commit phase
        if (
            m.status == MatchStatus.ACTIVE &&
            m.commitDeadline != 0 &&
            block.timestamp > m.commitDeadline
        ) {
            if (m.p1CommitHash != bytes32(0) && m.p2CommitHash == bytes32(0)) {
                winner = m.player1;
            } else if (
                m.p2CommitHash != bytes32(0) && m.p1CommitHash == bytes32(0)
            ) {
                winner = m.player2;
            } else {
                revert DeadlineNotPassed();
            }
        }
        // Timeout during reveal phase
        else if (
            m.status == MatchStatus.COMMITTED ||
            m.status == MatchStatus.REVEALED
        ) {
            if (block.timestamp <= m.revealDeadline) revert DeadlineNotPassed();

            if (m.p1Score != 0 && m.p2Score == 0) {
                winner = m.player1;
            } else if (m.p2Score != 0 && m.p1Score == 0) {
                winner = m.player2;
            } else if (m.p1Score == 0 && m.p2Score == 0) {
                winner = address(0);
            } else {
                revert DeadlineNotPassed();
            }
        } else {
            revert MatchNotActive();
        }

        m.winner = winner;
        m.status = MatchStatus.COMPLETED;

        _distributePayout(matchId);

        emit TimeoutClaimed(matchId, msg.sender, winner);
    }

    // ============ INTERNAL FUNCTIONS ============

    function _finalizeMatch(uint256 matchId) internal {
        Match storage m = matches[matchId];

        require(_validateScore(m.gameType, m.p1Score), "Invalid player1 score");
        require(_validateScore(m.gameType, m.p2Score), "Invalid player2 score");

        if (m.p1Score > m.p2Score) {
            m.winner = m.player1;
            playerWins[m.player1]++;
            playerLosses[m.player2]++;
        } else if (m.p2Score > m.p1Score) {
            m.winner = m.player2;
            playerWins[m.player2]++;
            playerLosses[m.player1]++;
        } else {
            m.winner = address(0);
        }

        m.status = MatchStatus.COMPLETED;
        _distributePayout(matchId);
    }

    function _validateScore(GameType gameType, uint256 score) internal pure returns (bool) {
        // Strict score validation to prevent manipulation
        if (gameType == GameType.CHESS) {
            return score == 0 || score == 50 || score == 100; // Loss, Draw, Win only
        } else if (gameType == GameType.WHOT) {
            return score <= 1000 && score >= 0;
        } else if (gameType == GameType.SURVEY) {
            return score <= 500 && score >= 0;
        } else if (gameType == GameType.MANCALA) {
            return score <= 48 && score >= 0; // Max stones possible
        } else if (gameType == GameType.CONNECT4) {
            return score == 0 || score == 50 || score == 100; // Loss, Draw, Win only
        } else if (gameType == GameType.WORDLE) {
            return score <= 600 && score >= 0;
        }
        return false;
    }

    function _distributePayout(uint256 matchId) internal {
        Match storage m = matches[matchId];

        uint256 totalPot = m.stake * 2;
        uint256 payout;

        if (m.winner == address(0)) {
            if (!cUSD.transfer(m.player1, m.stake)) revert TransferFailed();
            if (!cUSD.transfer(m.player2, m.stake)) revert TransferFailed();
            payout = m.stake;
        } else {
            uint256 fee = (totalPot * platformFeePercent) / 100;
            payout = totalPot - fee;

            if (!cUSD.transfer(m.winner, payout)) revert TransferFailed();
            if (fee > 0 && !cUSD.transfer(feeCollector, fee)) revert TransferFailed();

            totalFeesCollected += fee;
        }

        emit MatchCompleted(matchId, m.winner, payout);
    }

    // ============ VIEW FUNCTIONS ============

    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    function getPlayerMatches(address player) external view returns (uint256[] memory) {
        return playerMatches[player];
    }

    function getPlayerStats(address player) external view returns (uint256 wins, uint256 losses) {
        return (playerWins[player], playerLosses[player]);
    }

    function getAvailableMatches(
        GameType gameType,
        uint256 minStake,
        uint256 maxStake
    ) external view returns (uint256[] memory) {
        uint256[] memory available = new uint256[](matchCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= matchCounter; i++) {
            Match storage m = matches[i];
            if (
                m.status == MatchStatus.WAITING &&
                m.gameType == gameType &&
                m.stake >= minStake &&
                m.stake <= maxStake
            ) {
                available[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = available[i];
        }

        return result;
    }

    // ============ ADMIN FUNCTIONS ============

    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= MAX_FEE, "Fee too high");
        platformFeePercent = newFeePercent;
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid address");
        feeCollector = newCollector;
    }

    function setTimeouts(
        uint256 newCommitTimeout,
        uint256 newRevealTimeout
    ) external onlyOwner {
        require(newCommitTimeout > 0 && newRevealTimeout > 0, "Invalid timeouts");
        commitTimeout = newCommitTimeout;
        revealTimeout = newRevealTimeout;
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= cUSD.balanceOf(address(this)), "Insufficient balance");
        if (!cUSD.transfer(owner(), amount)) revert TransferFailed();
    }
}
