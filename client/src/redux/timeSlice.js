import { createSlice } from "@reduxjs/toolkit";

const launchDate = new Date("2026-03-10T00:00:00");

const timeSlice = createSlice({
  name: "time",
  initialState: {
    startTime: launchDate.getTime(),
    elapsed: 0,
  },
  reducers: {
    tick: (state) => {
      state.elapsed = Math.floor(-(Date.now() - state.startTime) / 1000);
    },
    resetTimer: (state) => {
      state.startTime = Date.now();
      state.elapsed = 0;
    },
  },
});

export const { tick, resetTimer } = timeSlice.actions;
export default timeSlice.reducer;
