import { configureStore } from "@reduxjs/toolkit";
import loaderReducer from "./loaderSlice.js";
import userReducer from "./usersSlice.js";
import chatReducer from "./chatSlice.js";
import postReducer from "./postSlice.js";
import notificationReducer from "./notificationSlice.js";

const store = configureStore({
  reducer: {
    loaderReducer,
    userReducer,
    chatReducer,
    postReducer,
    notificationReducer,
  },
});

export default store;