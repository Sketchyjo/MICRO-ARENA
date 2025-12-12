// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MicroArena
 * @dev Production-ready smart contract for 1v1 skill-based gaming with cUSD stakes
 * @notice Supports 10 game types including Penalty Precision Duel
 * @custom:security-contact security@microarena.io
 */
contract MicroArena is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============ ENUMS ============

    enum GameType {
        CHESS,      // 0: Win/Draw/Loss (100/50/0)
        WHOT,       // 1: Card points (0-1000)
        SURVEY,     // 2: Survey points (0-500)
        MANCALA,    // 3: Stones captured (0-48)
        CONNECT4,   // 4: Win/Draw/Loss (100/50/0)
        TRIVIA,     // 5: Quiz score (0-1000)
        RPS,        // 6: Best of 5 (0/50/100)
        CHECKERS,   // 7: Win/Draw/Loss (100/50/0)
        PENALTY     // 8: Penalty Precision Duel (0-100)
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
        uint256 stake;
        MatchStatus status;
        bytes32 p1CommitHash;
        bytes32 p2CommitHash;
        uint256 p1Score;
        uint256 p2Score;
        bool p1Revealed;
        bool p2Revealed;
        address winner;
        uint256 createdAt;
        uint256 commitDeadline;
        uint256 revealDeadline;
    }

    // ============ STATE VARIABLES ============

    IERC20 public immutable cUSD;
    uint256 public platformFeePercent = 2;
    uint256 public constant MAX_FEE = 10;
    uint256 public commitTimeout = 5 minutes;
    uint256 public revealTimeout = 3 minutes;
    uint256 public minStake = 1e18; // 1 cUSD minimum
    uint256 public maxStake = 1000e18; // 1000 cUSD maximum for risk management
    uint256 public matchExpiry = 24 hours;

    uint256 private matchCounter;
    mapping(uint256 => Match) public matches;
    mapping(address => uint256[]) public playerMatches;
    mapping(address => uint256) public playerWins;
    mapping(address => uint256) public playerLosses;
    mapping(address => bool) public blacklisted;

    address public feeCollector;
    uint256 public collectedFees;
    bool public emergencyMode;

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
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event TimeoutsUpdated(uint256 commitTimeout, uint256 revealTimeout);
    event MinStakeUpdated(uint256 oldMinStake, uint256 newMinStake);
    event MaxStakeUpdated(uint256 oldMaxStake, uint256 newMaxStake);
    event FeesWithdrawn(address indexed collector, uint256 amount);
    event PlayerBlacklisted(address indexed player, bool status);
    event EmergencyModeSet(bool enabled);
    event EmergencyWithdraw(
        uint256 indexed matchId,
        address indexed player,
        uint256 amount
    );

    // ============ ERRORS ============

    error InvalidStake();
    error StakeTooLow();
    error StakeTooHigh();
    error MatchNotFound();
    error MatchAlreadyFull();
    error MatchNotActive();
    error AlreadyCommitted();
    error AlreadyRevealed();
    error NotCommitted();
    error InvalidReveal();
    error DeadlineNotPassed();
    error NotPlayerInMatch();
    error CannotJoinOwnMatch();
    error MatchNotExpired();
    error NoFeesToWithdraw();
    error PlayerIsBlacklisted();
    error NotInEmergencyMode();

    // ============ CONSTRUCTOR ============

    constructor(address _cUSDAddress) Ownable(msg.sender) {
        cUSD = IERC20(_cUSDAddress);
        feeCollector = msg.sender;
    }

    // ============ MATCH CREATION & JOINING ============

    function createMatch(
        GameType gameType,
        uint256 stake
    ) external nonReentrant whenNotPaused returns (uint256) {
        if (blacklisted[msg.sender]) revert PlayerIsBlacklisted();
        if (stake == 0) revert InvalidStake();
        if (stake < minStake) revert StakeTooLow();
        if (stake > maxStake) revert StakeTooHigh();

        cUSD.safeTransferFrom(msg.sender, address(this), stake);

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
            p1Revealed: false,
            p2Revealed: false,
            winner: address(0),
            createdAt: block.timestamp,
            commitDeadline: 0,
            revealDeadline: 0
        });

        playerMatches[msg.sender].push(matchId);

        emit MatchCreated(matchId, msg.sender, gameType, stake);
        return matchId;
    }

    function joinMatch(uint256 matchId) external nonReentrant whenNotPaused {
        if (blacklisted[msg.sender]) revert PlayerIsBlacklisted();
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (msg.sender == m.player1) revert CannotJoinOwnMatch();
        if (m.player2 != address(0)) revert MatchAlreadyFull();
        if (m.status != MatchStatus.WAITING) revert MatchNotActive();

        cUSD.safeTransferFrom(msg.sender, address(this), m.stake);

        m.player2 = msg.sender;
        m.status = MatchStatus.ACTIVE;

        playerMatches[msg.sender].push(matchId);

        emit MatchJoined(matchId, msg.sender);
    }

    function cancelMatch(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (msg.sender != m.player1) revert NotPlayerInMatch();
        if (m.status != MatchStatus.WAITING) revert MatchNotActive();

        m.status = MatchStatus.CANCELLED;

        cUSD.safeTransfer(m.player1, m.stake);

        emit MatchCancelled(matchId, msg.sender);
    }

    function cancelExpiredMatch(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (m.status != MatchStatus.WAITING) revert MatchNotActive();
        if (block.timestamp < m.createdAt + matchExpiry)
            revert MatchNotExpired();

        m.status = MatchStatus.CANCELLED;

        cUSD.safeTransfer(m.player1, m.stake);

        emit MatchCancelled(matchId, address(0));
    }

    // ============ COMMIT-REVEAL PATTERN ============

    function commitScore(uint256 matchId, bytes32 scoreHash) external {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (m.status != MatchStatus.ACTIVE && m.status != MatchStatus.COMMITTED)
            revert MatchNotActive();
        if (msg.sender != m.player1 && msg.sender != m.player2)
            revert NotPlayerInMatch();
        if (scoreHash == bytes32(0)) revert InvalidReveal();

        if (msg.sender == m.player1) {
            if (m.p1CommitHash != bytes32(0)) revert AlreadyCommitted();
            m.p1CommitHash = scoreHash;
        } else {
            if (m.p2CommitHash != bytes32(0)) revert AlreadyCommitted();
            m.p2CommitHash = scoreHash;
        }

        if (m.p1CommitHash != bytes32(0) && m.p2CommitHash != bytes32(0)) {
            m.status = MatchStatus.COMMITTED;
            m.commitDeadline = block.timestamp;
            m.revealDeadline = block.timestamp + revealTimeout;
        } else if (m.commitDeadline == 0) {
            m.commitDeadline = block.timestamp + commitTimeout;
        }

        emit ScoreCommitted(matchId, msg.sender, scoreHash);
    }

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
        if (block.timestamp > m.revealDeadline) revert DeadlineNotPassed();
        if (!_validateScore(m.gameType, score)) revert InvalidReveal();

        bytes32 expectedHash = keccak256(
            abi.encodePacked(score, salt, msg.sender, commitBlock)
        );

        if (msg.sender == m.player1) {
            if (m.p1CommitHash != expectedHash) revert InvalidReveal();
            if (m.p1Revealed) revert AlreadyRevealed();
            m.p1Score = score;
            m.p1Revealed = true;
        } else {
            if (m.p2CommitHash != expectedHash) revert InvalidReveal();
            if (m.p2Revealed) revert AlreadyRevealed();
            m.p2Score = score;
            m.p2Revealed = true;
        }

        emit ScoreRevealed(matchId, msg.sender, score);

        if (m.p1Revealed && m.p2Revealed) {
            _finalizeMatch(matchId);
        } else {
            m.status = MatchStatus.REVEALED;
        }
    }

    function claimTimeout(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];

        if (m.id == 0) revert MatchNotFound();
        if (msg.sender != m.player1 && msg.sender != m.player2)
            revert NotPlayerInMatch();

        address winner;

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
        } else if (
            m.status == MatchStatus.COMMITTED ||
            m.status == MatchStatus.REVEALED
        ) {
            if (block.timestamp <= m.revealDeadline) revert DeadlineNotPassed();

            if (m.p1Revealed && !m.p2Revealed) {
                winner = m.player1;
            } else if (m.p2Revealed && !m.p1Revealed) {
                winner = m.player2;
            } else if (!m.p1Revealed && !m.p2Revealed) {
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

    function _validateScore(
        GameType gameType,
        uint256 score
    ) internal pure returns (bool) {
        if (
            gameType == GameType.CHESS ||
            gameType == GameType.CONNECT4 ||
            gameType == GameType.CHECKERS ||
            gameType == GameType.RPS
        ) {
            return score == 0 || score == 50 || score == 100;
        } else if (gameType == GameType.WHOT || gameType == GameType.TRIVIA) {
            return score <= 1000;
        } else if (gameType == GameType.SURVEY) {
            return score <= 500;
        } else if (gameType == GameType.MANCALA) {
            return score <= 48;
        } else if (gameType == GameType.PENALTY) {
            return score <= 100;
        }
        return false;
    }

    function _distributePayout(uint256 matchId) internal {
        Match storage m = matches[matchId];

        uint256 totalPot = m.stake * 2;
        uint256 payout;

        if (m.winner == address(0)) {
            cUSD.safeTransfer(m.player1, m.stake);
            cUSD.safeTransfer(m.player2, m.stake);
            payout = m.stake;
        } else {
            uint256 fee = (totalPot * platformFeePercent) / 100;
            payout = totalPot - fee;

            cUSD.safeTransfer(m.winner, payout);
            if (fee > 0) {
                collectedFees += fee;
            }
        }

        emit MatchCompleted(matchId, m.winner, payout);
    }

    // ============ VIEW FUNCTIONS ============

    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    function getAvailableMatches(
        GameType gameType,
        uint256 minStakeFilter,
        uint256 maxStakeFilter,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](limit);
        uint256 count = 0;
        uint256 skipped = 0;

        for (uint256 i = matchCounter; i >= 1 && count < limit; i--) {
            Match storage m = matches[i];
            if (
                m.status == MatchStatus.WAITING &&
                m.gameType == gameType &&
                m.stake >= minStakeFilter &&
                m.stake <= maxStakeFilter
            ) {
                if (skipped < offset) {
                    skipped++;
                } else {
                    temp[count] = i;
                    count++;
                }
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }

        return result;
    }

    function getMatchCount() external view returns (uint256) {
        return matchCounter;
    }

    // ============ ADMIN FUNCTIONS ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= MAX_FEE, "Fee too high");
        emit PlatformFeeUpdated(platformFeePercent, newFeePercent);
        platformFeePercent = newFeePercent;
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid address");
        emit FeeCollectorUpdated(feeCollector, newCollector);
        feeCollector = newCollector;
    }

    function setTimeouts(
        uint256 newCommitTimeout,
        uint256 newRevealTimeout
    ) external onlyOwner {
        require(
            newCommitTimeout >= 1 minutes && newRevealTimeout >= 1 minutes,
            "Timeout too short"
        );
        commitTimeout = newCommitTimeout;
        revealTimeout = newRevealTimeout;
        emit TimeoutsUpdated(newCommitTimeout, newRevealTimeout);
    }

    function setBlacklist(address player, bool status) external onlyOwner {
        blacklisted[player] = status;
        emit PlayerBlacklisted(player, status);
    }

    function setEmergencyMode(bool enabled) external onlyOwner {
        emergencyMode = enabled;
        emit EmergencyModeSet(enabled);
    }

    function withdrawFees() external onlyOwner {
        uint256 fees = collectedFees;
        if (fees == 0) revert NoFeesToWithdraw();
        collectedFees = 0;
        cUSD.safeTransfer(feeCollector, fees);
        emit FeesWithdrawn(feeCollector, fees);
    }
}
