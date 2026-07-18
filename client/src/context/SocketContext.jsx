import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { addNotification } from "../redux/notificationSlice.js";
import { prependPost } from "../redux/postSlice.js";
import { setOnlineStatus, selectMutedChats } from "../redux/chatSlice.js";
import { setIncomingCall, setActiveCall, endCall, reset } from "../redux/callSlice.js";
import { SOCKET_EVENTS } from "../lib/constants.js";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const dispatch = useDispatch();
  const mutedChats = useSelector(selectMutedChats);
  const mutedChatsRef = useRef(mutedChats);
  mutedChatsRef.current = mutedChats;

  const connectSocket = useCallback(() => {
    if (socket) return; // already connected

    const token = localStorage.getItem("token");
    if (!token) return;

    const baseUrl = (import.meta.env.VITE_BASE_URL || "http://localhost:5000").replace("/api", "");
    const newSocket = io(baseUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Connected:", newSocket.id);
      newSocket.emit(SOCKET_EVENTS.PRESENCE_SYNC);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    newSocket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    newSocket.on(SOCKET_EVENTS.NOTIFICATION, (notification) => {
      if (notification.type === "message" && notification.chatId && mutedChatsRef.current.includes(notification.chatId)) {
        return;
      }
      dispatch(addNotification(notification));
    });

    newSocket.on(SOCKET_EVENTS.NEW_POST_RECEIVED, (post) => {
      dispatch(prependPost(post));
    });

    newSocket.on(SOCKET_EVENTS.USER_ONLINE, ({ userId }) => {
      dispatch(setOnlineStatus({ userId, isOnline: true, lastSeen: null }));
    });

    newSocket.on(SOCKET_EVENTS.USER_OFFLINE, ({ userId, lastSeen }) => {
      dispatch(setOnlineStatus({ userId, isOnline: false, lastSeen }));
    });

    newSocket.on(SOCKET_EVENTS.CALL_INVITE, (data) => {
      dispatch(setIncomingCall(data));
    });

    newSocket.on(SOCKET_EVENTS.CALL_INITIATED, (data) => {
      dispatch(setActiveCall(data));
    });

    newSocket.on(SOCKET_EVENTS.CALL_ACCEPTED, (data) => {
      dispatch(setActiveCall(data));
    });

    newSocket.on(SOCKET_EVENTS.CALL_ACCEPTED_ACK, (data) => {
      dispatch(setActiveCall(data));
    });

    newSocket.on(SOCKET_EVENTS.CALL_REJECTED, () => {
      dispatch(reset());
    });

    newSocket.on(SOCKET_EVENTS.CALL_REJECTED_ACK, () => {
      dispatch(reset());
    });

    newSocket.on(SOCKET_EVENTS.CALL_ENDED, () => {
      dispatch(endCall());
      setTimeout(() => dispatch(reset()), 2000);
    });

    newSocket.on(SOCKET_EVENTS.CALL_ENDED_ACK, () => {
      dispatch(endCall());
      setTimeout(() => dispatch(reset()), 2000);
    });

    newSocket.on(SOCKET_EVENTS.CALL_MISSED, () => {
      dispatch(endCall());
      setTimeout(() => dispatch(reset()), 2000);
    });

    newSocket.on(SOCKET_EVENTS.CALL_ERROR, (data) => {
      console.error("[Socket] Call error:", data.message);
    });

    setSocket(newSocket);
  }, [socket, dispatch]);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  useEffect(() => {
    // Connect if already logged in (page refresh)
    const token = localStorage.getItem("token");
    if (token && !socket) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connectSocket, disconnectSocket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
