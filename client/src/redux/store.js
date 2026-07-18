import { configureStore } from "@reduxjs/toolkit";
import loaderReducer from "./loaderSlice.js";
import userReducer from "./usersSlice.js";
import chatReducer from "./chatSlice.js";
import postReducer from "./postSlice.js";
import notificationReducer from "./notificationSlice.js";
import callReducer from "./callSlice.js";

const store = configureStore({
  reducer: {
    loaderReducer,
    userReducer,
    chatReducer,
    postReducer,
    notificationReducer,
    callReducer,
  },
});

export default store;