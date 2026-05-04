export const ROUTES = {
  HOME: "/",
  FEED: "/feed",
  CHAT: "/chat",
  CHAT_ID: (id) => `/chat/${id}`,
  EXPLORE: "/explore",
  NOTIFICATIONS: "/notifications",
  PROFILE: "/profile",
  PROFILE_USER: (id) => `/profile/${id}`,
  SETTINGS: "/settings",
  POST_DETAIL: (id) => `/post/${id}`,
  SIGNUP: "/signup",
  LOGIN: "/login",
  NOT_FOUND: "/404",
};

export const API = {
  // Auth
  AUTH_SIGNUP: "/api/auth/signup",
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",

  // User
  USER_ME: "/api/user/get-logged-in",
  USER_ALL: "/api/user/get-all-users",
  USER_UPDATE: "/api/user/update-profile",
  USER_UPLOAD_AVATAR: "/api/upload/avatar",

  // Chat
  CHAT_CREATE: "/api/chat/create-new-chat",
  CHAT_ALL: "/api/chat/get-all-user-chats",

  // Message
  MSG_NEW: "/api/message/new-message",
  MSG_MARK_READ: "/api/message/mark-read",
  MSG_RETRIEVE: (chatId) => `/api/message/retrieve-chat/${chatId}`,

  // Post
  POST_CREATE: "/api/post/create",
  POST_FEED: "/api/post/feed",
  POST_GET: (id) => `/api/post/${id}`,
  POST_LIKE: (id) => `/api/post/${id}/like`,
  POST_SHARE: (id) => `/api/post/${id}/share`,
  POST_DELETE: (id) => `/api/post/${id}`,
  POST_USER: (id) => `/api/post/user/${id}`,
  POST_COMMENT: (id) => `/api/post/${id}/comment`,
  POST_COMMENT_LIKE: (id) => `/api/post/comment/${id}/like`,
  POST_COMMENTS: (id) => `/api/post/${id}/comments`,
  POST_SEARCH: "/api/post/search/query",

  // Follow
  FOLLOW: (id) => `/api/follow/follow/${id}`,
  UNFOLLOW: (id) => `/api/follow/unfollow/${id}`,
  FOLLOW_STATUS: (id) => `/api/follow/status/${id}`,
  FOLLOWERS: (id) => `/api/follow/followers/${id}`,
  FOLLOWING: (id) => `/api/follow/following/${id}`,

  // Notification
  NOTIF_ALL: "/api/notification/all",
  NOTIF_READ_ALL: "/api/notification/read-all",
  NOTIF_READ: (id) => `/api/notification/${id}/read`,
  NOTIF_DELETE: (id) => `/api/notification/${id}`,

  // Upload
  UPLOAD_AVATAR: "/api/upload/avatar",
  UPLOAD_POST_IMAGE: "/api/upload/post-image",
};

export const SOCKET_EVENTS = {
  // Client → Server
  SEND_MESSAGE: "send_message",
  JOIN_CHAT: "join_chat",
  LEAVE_CHAT: "leave_chat",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  NEW_POST: "new_post",

  // Server → Client
  RECEIVE_MESSAGE: "receive_message",
  USER_TYPING: "user_typing",
  USER_STOPPED_TYPING: "user_stopped_typing",
  FEED_UPDATE: "feed_update",
  NOTIFICATION: "notification",
  NEW_POST_RECEIVED: "new_post",
};
