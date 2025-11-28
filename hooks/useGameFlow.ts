import { useState, useEffect, useCallback } from 'react';
import { gameIntegration, GameState } from '../services/gameIntegration';
import { GameType } from '../types';

export interface UseGameFlowReturn {
    gameState: GameState | null;
    error: string | null;
    startMatchmaking: (gameType: GameType, stake: string) => Promise<void>;
    cancelMatchmaking: () => Promise<void>;
    sendMove: (move: any) => void;
    resignGame: () => void;
    submitScore: (score: number) => Promise<void>;
    revealScore: () => Promise<void>;
    claimTimeout: () => Promise<void>;
    reset: () => void;
}

export function useGameFlow(): UseGameFlowReturn {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to state changes
        const unsubscribeState = gameIntegration.onStateChange(setGameState);
        const unsubscribeError = gameIntegration.onError(setError);

        return () => {
            unsubscribeState();
            unsubscribeError();
        };
    }, []);

    const startMatchmaking = useCallback(async (gameType: GameType, stake: string) => {
        try {
            setError(null);
            await gameIntegration.startMatchmaking(gameType, stake);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, []);

    const cancelMatchmaking = useCallback(async () => {
        try {
            setError(null);
            await gameIntegration.cancelMatchmaking();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, []);

    const sendMove = useCallback((move: any) => {
        try {
            setError(null);
            gameIntegration.sendMove(move);
        } catch (err: any) {
            setError(err.message);
        }
    }, []);

    const resignGame = useCallback(() => {
        try {
            setError(null);
            gameIntegration.resignGame();
        } catch (err: any) {
            setError(err.message);
        }
    }, []);

    const submitScore = useCallback(async (score: number) => {
        try {
            setError(null);
            await gameIntegration.submitScore(score);
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, []);

    const revealScore = useCallback(async () => {
        try {
            setError(null);
            await gameIntegration.revealScore();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, []);

    const claimTimeout = useCallback(async () => {
        try {
            setError(null);
            await gameIntegration.claimTimeout();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, []);

    const reset = useCallback(() => {
        setError(null);
        gameIntegration.reset();
    }, []);

    return {
        gameState,
        error,
        startMatchmaking,
        cancelMatchmaking,
        sendMove,
        resignGame,
        submitScore,
        revealScore,
        claimTimeout,
        reset,
    };
}
