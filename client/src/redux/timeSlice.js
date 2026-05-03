import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  now: new Date().toISOString(),
};

const timeSlice = createSlice({
  name: "time",
  initialState,
  reducers: {
    setNow: (state, action) => {
      state.now = action.payload;
    },
    refreshNow: (state) => {
      state.now = new Date().toISOString();
    },
  },
});

export const { setNow, refreshNow } = timeSlice.actions;

export default timeSlice.reducer;
