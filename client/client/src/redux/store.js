import { configureStore } from "@reduxjs/toolkit";
import loaderReducer from "./loaderSlice.js";
import userReducer from "./usersSlice.js";
import timeReducer from "./timeSlice.js";
import chatReducer from "./chatSlice.js";

const store = configureStore({
  reducer: {
    loaderReducer,
    userReducer,
    timeReducer,
    chatReducer,
  },
});

export default store;
