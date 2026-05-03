import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useDispatch } from "react-redux";
import { addNotification } from "../redux/notificationSlice.js";
import { prependPost } from "../redux/postSlice.js";
import { SOCKET_EVENTS } from "../lib/constants.js";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const dispatch = useDispatch();

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
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    newSocket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    newSocket.on(SOCKET_EVENTS.NOTIFICATION, (notification) => {
      dispatch(addNotification(notification));
    });

    newSocket.on(SOCKET_EVENTS.NEW_POST_RECEIVED, (post) => {
      dispatch(prependPost(post));
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