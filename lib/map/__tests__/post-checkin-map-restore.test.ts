import { describe, expect, it } from 'vitest';
import {
  shouldReopenMapCardAfterCheckInClose,
  shouldShowSaveToListTipAfterCheckIn,
} from '../post-checkin-map-restore';

describe('post-checkin map restore', () => {
  it('reopens the map card whenever check-in had a target', () => {
    expect(shouldReopenMapCardAfterCheckInClose(true)).toBe(true);
    expect(shouldReopenMapCardAfterCheckInClose(false)).toBe(false);
  });

  it('restores the save-to-list tip after a post-tour search check-in', () => {
    expect(
      shouldShowSaveToListTipAfterCheckIn({
        hasCheckInTarget: true,
        saveToListTipAlreadyShowing: false,
        postTourFirstSearchPending: true,
      })
    ).toBe(true);
  });

  it('keeps a tip that was already showing before check-in', () => {
    expect(
      shouldShowSaveToListTipAfterCheckIn({
        hasCheckInTarget: true,
        saveToListTipAlreadyShowing: true,
        postTourFirstSearchPending: false,
      })
    ).toBe(true);
  });

  it('restores the tip when create-then-skip-check-in still has a target', () => {
    expect(
      shouldShowSaveToListTipAfterCheckIn({
        hasCheckInTarget: true,
        saveToListTipAlreadyShowing: false,
        postTourFirstSearchPending: true,
      })
    ).toBe(true);
  });

  it('does not force the tip when there is no check-in target', () => {
    expect(
      shouldShowSaveToListTipAfterCheckIn({
        hasCheckInTarget: false,
        saveToListTipAlreadyShowing: false,
        postTourFirstSearchPending: true,
      })
    ).toBe(false);
  });
});
