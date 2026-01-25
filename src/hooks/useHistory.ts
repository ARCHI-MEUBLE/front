import { useState, useCallback, useRef } from 'react';

interface UseHistoryOptions {
  maxHistory?: number;
}

interface UseHistoryReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useHistory<T>(
  initialState: T,
  options: UseHistoryOptions = {}
): UseHistoryReturn<T> {
  const { maxHistory = 50 } = options;

  // L'historique passé (pour undo)
  const [past, setPast] = useState<T[]>([]);
  // L'état actuel
  const [present, setPresent] = useState<T>(initialState);
  // L'historique futur (pour redo)
  const [future, setFuture] = useState<T[]>([]);

  // Ref pour éviter d'enregistrer les changements pendant undo/redo
  const isUndoingRef = useRef(false);

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      return;
    }

    setPresent((currentPresent) => {
      const resolvedNewState = typeof newState === 'function'
        ? (newState as (prev: T) => T)(currentPresent)
        : newState;

      // Ne pas enregistrer si l'état n'a pas changé
      if (JSON.stringify(resolvedNewState) === JSON.stringify(currentPresent)) {
        return currentPresent;
      }

      // Ajouter l'état actuel à l'historique passé
      setPast((currentPast) => {
        const newPast = [...currentPast, currentPresent];
        // Limiter la taille de l'historique
        if (newPast.length > maxHistory) {
          return newPast.slice(-maxHistory);
        }
        return newPast;
      });

      // Effacer l'historique futur car on a fait une nouvelle action
      setFuture([]);

      return resolvedNewState;
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    isUndoingRef.current = true;

    const newPast = [...past];
    const previousState = newPast.pop()!;

    setPast(newPast);
    setFuture((currentFuture) => [present, ...currentFuture]);
    setPresent(previousState);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    isUndoingRef.current = true;

    const newFuture = [...future];
    const nextState = newFuture.shift()!;

    setFuture(newFuture);
    setPast((currentPast) => [...currentPast, present]);
    setPresent(nextState);
  }, [future, present]);

  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    state: present,
    setState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    clearHistory,
  };
}

// Hook simplifié pour gérer l'historique d'un état complexe
export function useConfiguratorHistory<T extends object>(initialState: T) {
  const {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  } = useHistory(initialState, { maxHistory: 30 });

  // Fonction pour mettre à jour une partie de l'état
  const updateState = useCallback((updates: Partial<T>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, [setState]);

  return {
    state,
    setState,
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
