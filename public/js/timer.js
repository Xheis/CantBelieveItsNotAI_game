export function createClock() {
  let offset = 0;

  return {
    sync(state) {
      if (state?.serverNow) {
        offset = state.serverNow - Date.now();
      }
    },

    now() {
      return Date.now() + offset;
    },

    remainingMs(state) {
      if (!state?.phaseEndsAt) return Infinity;

      return Math.max(0, state.phaseEndsAt - (Date.now() + offset));
    },

    elapsedMs(state) {
      if (!state?.phaseStartedAt) return 0;

      return Math.max(0, Date.now() + offset - state.phaseStartedAt);
    },

    totalMs(state) {
      if (!state?.phaseEndsAt || !state?.phaseStartedAt) return 0;

      return state.phaseEndsAt - state.phaseStartedAt;
    },
  };
}