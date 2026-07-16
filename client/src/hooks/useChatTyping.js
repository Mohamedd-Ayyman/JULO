import { useState, useEffect, useRef, useCallback } from "react";
import { SOCKET_EVENTS } from "../lib/constants.js";

const TYPING_TIMEOUT = 4000;

export default function useChatTyping(chats, currentUserId, socket) {
  const [typingChats, setTypingChats] = useState({});
  const timersRef = useRef({});
  const joinedRoomsRef = useRef(new Set());

  const clearTyping = useCallback((chatId) => {
    setTypingChats((prev) => {
      if (!prev[chatId]) return prev;
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket || !chats?.length) return;

    const chatIds = chats.map((c) => c._id);

    chatIds.forEach((cId) => {
      if (!joinedRoomsRef.current.has(cId)) {
        socket.emit(SOCKET_EVENTS.JOIN_CHAT, cId);
        joinedRoomsRef.current.add(cId);
      }
    });

    const onTypingStart = ({ chatId: cId, userId }) => {
      if (userId === currentUserId) return;
      if (!chatIds.includes(cId)) return;

      if (timersRef.current[cId]) clearTimeout(timersRef.current[cId]);

      setTypingChats((prev) => ({ ...prev, [cId]: true }));

      timersRef.current[cId] = setTimeout(() => {
        clearTyping(cId);
        delete timersRef.current[cId];
      }, TYPING_TIMEOUT);
    };

    const onTypingStop = ({ chatId: cId, userId }) => {
      if (userId === currentUserId) return;
      if (timersRef.current[cId]) {
        clearTimeout(timersRef.current[cId]);
        delete timersRef.current[cId];
      }
      clearTyping(cId);
    };

    socket.on(SOCKET_EVENTS.USER_TYPING, onTypingStart);
    socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, onTypingStop);

    return () => {
      socket.off(SOCKET_EVENTS.USER_TYPING, onTypingStart);
      socket.off(SOCKET_EVENTS.USER_STOPPED_TYPING, onTypingStop);

      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};

      joinedRoomsRef.current.forEach((cId) => {
        socket.emit(SOCKET_EVENTS.LEAVE_CHAT, cId);
      });
      joinedRoomsRef.current.clear();
      setTypingChats({});
    };
  }, [socket, chats, currentUserId, clearTyping]);

  return typingChats;
}
