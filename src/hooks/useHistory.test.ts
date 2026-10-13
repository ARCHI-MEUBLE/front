import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHistory } from './useHistory';

describe('useHistory', () => {
  it('undoes and redoes changes', () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => result.current.setState(1));
    act(() => result.current.setState(2));
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);

    act(() => result.current.redo());
    expect(result.current.state).toBe(2);
  });

  it('applies the first change made right after an undo', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => result.current.setState('b'));
    act(() => result.current.undo());
    expect(result.current.state).toBe('a');

    act(() => result.current.setState('c'));
    expect(result.current.state).toBe('c');
    expect(result.current.canRedo).toBe(false);
  });

  it('applies the first change made right after a redo', () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => result.current.setState(1));
    act(() => result.current.undo());
    act(() => result.current.redo());
    act(() => result.current.setState(5));
    expect(result.current.state).toBe(5);
  });
});
