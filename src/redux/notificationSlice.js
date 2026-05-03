import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
  name: "notification",
  initialState: { notifications: [], unreadCount: 0 },
  reducers: {
    setNotifications: (state, action) => { state.notifications = action.payload; },
    addNotification: (state, action) => { state.notifications.unshift(action.payload); state.unreadCount += 1; },
    markAllRead: (state) => { state.notifications.forEach((n) => n.read = true); state.unreadCount = 0; },
  },
});

export const { setNotifications, addNotification, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
