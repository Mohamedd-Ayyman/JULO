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
  AUTH_CHANGE_PASSWORD: "/api/auth/change-password",
  AUTH_REFRESH: "/api/auth/refresh",

  // User
  USER_ME: "/api/user/get-logged-in",
  USER_ALL: "/api/user/get-all-users",
  USER_UPDATE: "/api/user/update-profile",
  USER_UPLOAD_AVATAR: "/api/upload/avatar",
  USER_UPLOAD_COVER: "/api/upload/cover",
  USER_DEACTIVATE: "/api/user/deactivate",
  USER_DELETE: "/api/user/account",
  USER_SESSIONS: "/api/auth/sessions",
  USER_NOTIFICATIONS: "/api/user/notifications",
  USER_PRIVACY: "/api/user/privacy",

  // Chat
  CHAT_CREATE: "/api/chat/create-new-chat",
  CHAT_ALL: "/api/chat/get-all-user-chats",
  CHAT_MUTE: (chatId) => `/api/chat/${chatId}/mute`,
  CHAT_UNMUTE: (chatId) => `/api/chat/${chatId}/unmute`,

  // Message
  MSG_NEW: "/api/message/new-message",
  MSG_MARK_READ: "/api/message/mark-read",
  MSG_RETRIEVE: (chatId) => `/api/message/retrieve-chat/${chatId}`,
  MSG_REPLY: "/api/message/reply",
  MSG_EDIT: (messageId) => `/api/message/${messageId}`,
  MSG_DELETE: (messageId) => `/api/message/${messageId}`,
  MSG_REACT: (messageId) => `/api/message/${messageId}/react`,
  MSG_THREAD: (messageId) => `/api/message/thread/${messageId}`,

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
  UPLOAD_COVER: "/api/upload/cover",
  UPLOAD_STORY: "/api/upload/story",
  UPLOAD_POST_IMAGE: "/api/upload/post-image",
  UPLOAD_AUDIO: "/api/upload/audio",
  UPLOAD_CHAT_FILE: "/api/upload/chat-image",

  // Calls
  CALL_INITIATE: "/api/calls",
  CALL_ACCEPT: (callId) => `/api/calls/${callId}/accept`,
  CALL_REJECT: (callId) => `/api/calls/${callId}/reject`,
  CALL_END: (callId) => `/api/calls/${callId}/end`,
  CALL_TURN_CONFIG: "/api/calls/turn-config",
  CALL_ACTIVE: (chatId) => `/api/calls/active/${chatId}`,
  CALL_HISTORY: (chatId) => `/api/calls/history/${chatId}`,
  CALL_MY_HISTORY: "/api/calls/my-history",
  CALL_DETAILS: (callId) => `/api/calls/${callId}`,

  // Calls
  CALL_HISTORY: (chatId) => `/api/call/history/${chatId}`,

  // Link Preview
  LINK_PREVIEW: "/api/link-preview",

  // Stories
  STORIES_ALL: "/api/stories",
  STORIES_MINE: "/api/stories/mine",
  STORIES_CREATE: "/api/stories/create",
  STORIES_VIEW: (id) => `/api/stories/${id}/view`,
  STORIES_DELETE: (id) => `/api/stories/${id}`,
};

export const SOCKET_EVENTS = {
  // Client → Server
  SEND_MESSAGE: "send_message",
  JOIN_CHAT: "join_chat",
  LEAVE_CHAT: "leave_chat",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  MESSAGE_DELIVERED: "message_delivered",
  NEW_POST: "new_post",
  CALL_INITIATE: "call_initiate",
  CALL_ACCEPT: "call_accept",
  CALL_REJECT: "call_reject",
  CALL_END: "call_end",

  // Server → Client
  RECEIVE_MESSAGE: "receive_message",
  USER_TYPING: "user_typing",
  USER_STOPPED_TYPING: "user_stopped_typing",
  MESSAGE_EDITED: "message_edited",
  MESSAGE_DELETED: "message_deleted",
  REACTION_UPDATED: "reaction_updated",
  DELIVERY_CONFIRMED: "delivery_confirmed",
  MESSAGES_READ: "messages_read",
  FEED_UPDATE: "feed_update",
  NOTIFICATION: "notification",
  NEW_POST_RECEIVED: "new_post",
  CALL_INVITE: "call_invite",
  CALL_INITIATED: "call_initiated",
  CALL_ACCEPTED: "call_accepted",
  CALL_ACCEPTED_ACK: "call_accepted_ack",
  CALL_REJECTED: "call_rejected",
  CALL_REJECTED_ACK: "call_rejected_ack",
  CALL_ENDED: "call_ended",
  CALL_ENDED_ACK: "call_ended_ack",
  CALL_MISSED: "call_missed",
  CALL_ERROR: "call_error",

  // Presence (Server → Client)
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  PRESENCE_SYNC: "presence_sync",

  // Call signaling (Client → Server)
  CALL_INITIATE: "call_initiate",
  CALL_ACCEPT: "call_accept",
  CALL_REJECT: "call_reject",
  CALL_END: "call_end",
  CALL_JOIN: "call_join",
  CALL_LEAVE: "call_leave",
  CALL_MUTE_TOGGLE: "call_mute_toggle",
  CALL_OFFER: "call_offer",
  CALL_ANSWER: "call_answer",
  ICE_CANDIDATE: "ice_candidate",
  CALL_RENEGOTIATE: "call_renegotiate",
  CALL_MUTE: "call_mute",
  CALL_VIDEO_TOGGLE: "call_video_toggle",
  CALL_SCREEN_SHARE_TOGGLE: "call_screen_share_toggle",
  CALL_JOIN_SESSION: "call_join_session",
  CALL_LEAVE_SESSION: "call_leave_session",
  CALL_QUALITY_REPORT: "call_quality_report",

  // Call signaling (Server → Client)
  CALL_INVITE: "call_invite",
  CALL_INITIATED: "call_initiated",
  CALL_ACCEPTED: "call_accepted",
  CALL_ACCEPTED_ACK: "call_accepted_ack",
  CALL_REJECTED: "call_rejected",
  CALL_REJECTED_ACK: "call_rejected_ack",
  CALL_ENDED: "call_ended",
  CALL_ENDED_ACK: "call_ended_ack",
  CALL_PARTICIPANT_JOINED: "call_participant_joined",
  CALL_PARTICIPANT_LEFT: "call_participant_left",
  CALL_JOINED_ACK: "call_joined_ack",
  CALL_LEFT_ACK: "call_left_ack",
  CALL_MUTE_UPDATED: "call_mute_updated",
  CALL_ERROR: "call_error",
  CALL_MEDIA_STATE: "call_media_state",
  CALL_PARTICIPANT_WEBCAM_JOINED: "call_participant_webcam_joined",
  CALL_PARTICIPANT_WEBCAM_LEFT: "call_participant_webcam_left",
};