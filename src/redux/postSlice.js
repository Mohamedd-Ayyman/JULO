import { createSlice } from "@reduxjs/toolkit";

const postSlice = createSlice({
  name: "post",
  initialState: { posts: [], loading: false },
  reducers: {
    setPosts: (state, action) => { state.posts = action.payload; },
    prependPost: (state, action) => { state.posts.unshift(action.payload); },
    addPost: (state, action) => { state.posts.push(action.payload); },
    updatePost: (state, action) => {
      const idx = state.posts.findIndex((p) => p._id === action.payload._id);
      if (idx !== -1) {
        state.posts[idx] = { ...state.posts[idx], ...action.payload };
      }
    },
    removePost: (state, action) => {
      state.posts = state.posts.filter((p) => p._id !== action.payload);
    },
    setLoading: (state, action) => { state.loading = action.payload; },
  },
});

export const { setPosts, prependPost, addPost, updatePost, removePost, setLoading } = postSlice.actions;
export default postSlice.reducer;
