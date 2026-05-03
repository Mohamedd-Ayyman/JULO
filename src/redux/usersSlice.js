import { createSlice } from "@reduxjs/toolkit";

const usersSlice = createSlice({
  name: "user",
  initialState: { user: null },
  reducers: {
    setUser: (state, action) => { state.user = action.payload; },
    logout: (state) => { state.user = null; localStorage.removeItem("token"); },
  },
});

export const { setUser, logout } = usersSlice.actions;
export default usersSlice.reducer;
