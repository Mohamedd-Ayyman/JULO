import { createSlice } from "@reduxjs/toolkit";

const usersSlice = createSlice({
  name: "user",
  initialState: { user: null },
  reducers: {
    setUser: (state, action) => { state.user = action.payload; },
    updateUserAvatar: (state, action) => {
      if (state.user) state.user.profilepic = action.payload;
    },
    logout: (state) => { state.user = null; localStorage.removeItem("token"); },
  },
});

export const { setUser, updateUserAvatar, logout } = usersSlice.actions;
export default usersSlice.reducer;