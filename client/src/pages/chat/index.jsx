import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Send,
  Search,
  Loader2,
  ArrowLeft,
  Smile,
  Paperclip,
  MoreHorizontal,
  Phone,
  Video,
  Mic,
  RefreshCw,
  MessageSquare,
  BellOff,
  Bell,
} from "lucide-react";
import toast from "react-hot-toast";
import { muteChat, unmuteChat } from "../../apiCalls/message.js";
import { toggleMuteChat, selectMutedChats } from "../../redux/chatSlice.js";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import RecordingPanel from "../../components/chat/RecordingPanel.jsx";
import ChatListItem from "../../components/chat/ChatListItem.jsx";
import ChatFilterBar from "../../components/chat/ChatFilterBar.jsx";
import OfflineBanner from "../../components/chat/OfflineBanner.jsx";
import MessageListSkeleton from "../../components/chat/MessageListSkeleton.jsx";
import MessageBubble from "../../components/chat/MessageBubble.jsx";
import DateSeparator from "../../components/chat/DateSeparator.jsx";
import ScrollToBottom from "../../components/chat/ScrollToBottom.jsx";
import EmojiPicker from "../../components/chat/EmojiPicker.jsx";
import AttachmentsPreview from "../../components/chat/AttachmentsPreview.jsx";
import ReplyPreview from "../../components/chat/ReplyPreview.jsx";
import ThreadPanel from "../../components/chat/ThreadPanel.jsx";
import useAudioRecorder from "../../hooks/useAudioRecorder.js";
import useChatTyping from "../../hooks/useChatTyping.js";
import useOnlineStatus from "../../hooks/useOnlineStatus.js";
import useLinkPreview from "../../hooks/useLinkPreview.js";
import { getAllChats, getMessages, sendMessage, markMessagesRead, uploadAudio, sendAudioMessage, uploadChatFile, sendImageMessage, sendFileMessage, addReaction, deleteMessage, editMessage, sendReply } from "../../apiCalls/message.js";
import { setChats, setActiveChat, addMessage, markMessageFailed, markMessageSuccess, removeMessage, prependMessages, updateMessageDelivery, updateMessageReadBy } from "../../redux/chatSlice.js";
import { useSocket } from "../../context/SocketContext.jsx";
import { SOCKET_EVENTS, ROUTES } from "../../lib/constants.js";
import { ChatListSkeleton } from "../../components/Skeletons.jsx";
import { EmptyChatsState } from "../../components/EmptyStates.jsx";

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.userReducer);
  const { chats, activeChat } = useSelector((s) => s.chatReducer);
  const { socket } = useSocket();

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [msgError, setMsgError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const searchTimerRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [sendingAudio, setSendingAudio] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const recorder = useAudioRecorder();
  const typingChats = useChatTyping(chats, user?._id, socket);
  const { isOnline, wasOffline } = useOnlineStatus();
  const { preview: linkPreview, clear: clearLinkPreview } = useLinkPreview(draft);

  useEffect(() => {
    if (wasOffline) toast.success("You're back online");
  }, [wasOffline]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (activeFilter === "direct") params.type = "direct";
        if (activeFilter === "groups") params.type = "group";
        if (activeFilter === "archived") params.archived = true;
        const res = await getAllChats(params);
        if (cancelled) return;
        if (res.success) {
          dispatch(setChats(res.data || []));
          setChatError(null);
        } else {
          setChatError("Failed to load conversations");
        }
      } catch {
        if (!cancelled) setChatError("Could not connect to server");
      }
      if (!cancelled) setLoadingChats(false);
    })();
    return () => { cancelled = true; };
  }, [dispatch, search, activeFilter]);

  useEffect(() => {
    if (!chatId) {
      dispatch(setActiveChat(null));
      setReplyToMessage(null);
      setActiveThread(null);
      return;
    }
    setCurrentPage(1);
    setHasMore(true);
    setLoadingOlder(false);
    setReplyToMessage(null);
    setActiveThread(null);
    const found = chats.find((c) => c._id === chatId);
    if (found) dispatch(setActiveChat({ ...found, messages: [] }));
  }, [chatId, chats, dispatch]);

  useEffect(() => {
    if (!activeChat?._id || activeChat.messages?.length) return;
    let cancelled = false;
    setLoadingMsgs(true);
    setMsgError(null);
    (async () => {
      try {
        const res = await getMessages(activeChat._id, 1, 30);
        if (cancelled) return;
        if (res.success) {
          dispatch(setActiveChat({ ...activeChat, messages: (res.data || []).reverse() }));
          setHasMore(res.page < res.pages);
          setCurrentPage(1);
          setMsgError(null);
        } else {
          setMsgError("Failed to load messages");
        }
      } catch {
        if (!cancelled) setMsgError("Could not load messages");
      }
      if (!cancelled) setLoadingMsgs(false);
      markMessagesRead(activeChat._id);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?._id]);

  useEffect(() => {
    if (!socket) return;
    const onReceive = (m) => {
      dispatch(addMessage(m));
      if (m.sender?._id !== user?._id && m.sender !== user?._id && m._id && !m._id.startsWith("temp-")) {
        socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageId: m._id, chatId: m.chatId || activeChat?._id });
      }
    };
    const onTypingStart = ({ chatId: cId, userId }) => {
      if (cId === activeChat?._id && userId !== user?._id) {
        setTypingUsers((p) => ({ ...p, [userId]: true }));
      }
    };
    const onTypingStop = ({ chatId: cId, userId }) => {
      if (cId === activeChat?._id) {
        setTypingUsers((p) => { const n = { ...p }; delete n[userId]; return n; });
      }
    };
    const onMessageEdited = ({ messageId, text, edited, editedAt }) => {
      dispatch(addMessage({
        _id: messageId,
        chatId: activeChat?._id,
        text,
        edited,
        updatedAt: editedAt,
        _replace: messageId,
      }));
    };
    const onMessageDeleted = ({ messageId, chatId: cId }) => {
      if (cId === activeChat?._id) {
        dispatch(addMessage({ _id: messageId, chatId: cId, deleted: true, _replace: messageId }));
      }
    };
    const onReactionUpdated = ({ messageId, reactions, chatId: cId }) => {
      if (cId === activeChat?._id) {
        dispatch(addMessage({ _id: messageId, chatId: cId, reactions, _replace: messageId }));
      }
    };
    const onDeliveryConfirmed = ({ messageId, chatId: cId, deliveredTo, deliveredAt }) => {
      if (cId === activeChat?._id) {
        dispatch(updateMessageDelivery({ chatId: cId, messageId, userId: deliveredTo, deliveredAt }));
      }
    };
    const onMessagesRead = ({ chatId: cId, userId, readUpTo, readAt }) => {
      if (cId !== activeChat?._id) return;
      const msgs = activeChat.messages || [];
      const readMessages = [];
      for (const m of msgs) {
        const isMine = m.sender?._id === user?._id || m.sender === user?._id;
        if (!isMine) continue;
        if (m._id && m._id.startsWith("temp-")) continue;
        const alreadyRead = (m.readBy || []).some((r) => (r.userId?._id || r.userId) === userId);
        if (alreadyRead) continue;
        if (readUpTo && m._id > readUpTo) continue;
        readMessages.push({ messageId: m._id, userId, readAt });
      }
      if (readMessages.length > 0) {
        dispatch(updateMessageReadBy({ chatId: cId, messages: readMessages }));
      }
    };
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceive);
    socket.on(SOCKET_EVENTS.USER_TYPING, onTypingStart);
    socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, onTypingStop);
    socket.on(SOCKET_EVENTS.MESSAGE_EDITED, onMessageEdited);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, onMessageDeleted);
    socket.on(SOCKET_EVENTS.REACTION_UPDATED, onReactionUpdated);
    socket.on(SOCKET_EVENTS.DELIVERY_CONFIRMED, onDeliveryConfirmed);
    socket.on(SOCKET_EVENTS.MESSAGES_READ, onMessagesRead);
    if (activeChat?._id) socket.emit(SOCKET_EVENTS.JOIN_CHAT, activeChat._id);
    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceive);
      socket.off(SOCKET_EVENTS.USER_TYPING, onTypingStart);
      socket.off(SOCKET_EVENTS.USER_STOPPED_TYPING, onTypingStop);
      socket.off(SOCKET_EVENTS.MESSAGE_EDITED, onMessageEdited);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, onMessageDeleted);
      socket.off(SOCKET_EVENTS.REACTION_UPDATED, onReactionUpdated);
      socket.off(SOCKET_EVENTS.DELIVERY_CONFIRMED, onDeliveryConfirmed);
      socket.off(SOCKET_EVENTS.MESSAGES_READ, onMessagesRead);
      if (activeChat?._id) socket.emit(SOCKET_EVENTS.LEAVE_CHAT, activeChat._id);
    };
  }, [socket, activeChat?._id, user?._id, dispatch]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 50;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      setUnseenCount((c) => c + 1);
    }
  }, [activeChat?.messages?.length]);

  const handleRetrySend = async (messageId) => {
    if (!activeChat?._id) return;
    const msg = activeChat.messages?.find((m) => m._id === messageId);
    if (!msg) return;
    dispatch(markMessageSuccess({ tempId: messageId, realMessage: { ...msg, pending: true, failed: false } }));
    const other = activeChat.members?.find((m) => m._id !== user?._id);
    const res = await sendMessage(activeChat._id, msg.text, other?._id);
    if (res.success && socket) {
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, res.data);
      dispatch(markMessageSuccess({ tempId: messageId, realMessage: res.data }));
    } else {
      dispatch(markMessageFailed(messageId));
    }
  };

  const handleDeleteFailed = (messageId) => {
    dispatch(removeMessage(messageId));
  };

  const handleTyping = () => {
    if (!socket || !activeChat?._id) return;
    socket.emit(SOCKET_EVENTS.TYPING_START, { chatId: activeChat._id, userId: user?._id });
    clearTimeout(window.__typingTimer);
    window.__typingTimer = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { chatId: activeChat._id, userId: user?._id });
    }, 1500);
  };

  const loadOlderMessages = useCallback(async () => {
    if (!activeChat?._id || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight || 0;
    const nextPage = currentPage + 1;
    try {
      const res = await getMessages(activeChat._id, nextPage, 30);
      if (res.success && res.data?.length) {
        const older = (res.data || []).reverse();
        dispatch(prependMessages({ chatId: activeChat._id, messages: older }));
        setCurrentPage(nextPage);
        setHasMore(nextPage < res.pages);
      } else {
        setHasMore(false);
      }
    } catch {
      // silent
    }
    requestAnimationFrame(() => {
      if (el) {
        const newHeight = el.scrollHeight;
        el.scrollTop = el.scrollTop + (newHeight - prevHeight);
      }
      setLoadingOlder(false);
    });
  }, [activeChat?._id, currentPage, hasMore, loadingOlder, dispatch]);

  const loadOlderRef = useRef(loadOlderMessages);
  loadOlderRef.current = loadOlderMessages;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 50;
    setShowScrollBtn(distFromBottom > 200);
    if (atBottom) setUnseenCount(0);
    if (el.scrollTop < 80 && !loadingOlder && !loadingMsgs) {
      loadOlderRef.current();
    }
  }, [loadingOlder, loadingMsgs]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setUnseenCount(0);
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;
    messages.forEach((m) => {
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (key !== currentDate) {
        currentDate = key;
        groups.push({ date: m.createdAt, messages: [] });
      }
      groups[groups.length - 1].messages.push(m);
    });
    return groups;
  };

  const handleReact = async (messageId, emoji) => {
    const res = await addReaction(messageId, emoji);
    if (res.success && res.data) {
      dispatch(addMessage({ ...res.data, chatId: activeChat._id, _replace: messageId }));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const res = await deleteMessage(messageId);
    if (res.success) {
      dispatch(addMessage({ _id: messageId, deleted: true, chatId: activeChat._id, _replace: messageId }));
    }
  };

  const handleReplyTo = (message) => {
    setReplyToMessage(message);
    setActiveThread(null);
  };

  const handleCancelReply = () => setReplyToMessage(null);

  const handleSaveEdit = async (message, newText) => {
    const res = await editMessage(message._id, newText);
    if (res.success) {
      dispatch(addMessage({
        _id: message._id,
        chatId: activeChat._id,
        text: newText,
        edited: true,
        updatedAt: new Date().toISOString(),
        _replace: message._id,
      }));
      toast.success("Message edited");
    } else {
      toast.error("Failed to edit message");
    }
  };

  const handleOpenThread = (message) => {
    setActiveThread(message);
    setReplyToMessage(null);
  };

  const handleCloseThread = () => setActiveThread(null);

  const isImageFile = (file) => file.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map((file) => ({
      file,
      preview: isImageFile(file) ? URL.createObjectURL(file) : null,
      type: isImageFile(file) ? "image" : "file",
      uploading: false,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => {
      const next = [...prev];
      if (next[index]?.preview) URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleEmojiSelect = (emoji) => {
    setDraft((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSendWithAttachments = async () => {
    if (!activeChat?._id) return;
    const other = activeChat.members?.find((m) => m._id !== user?._id);
    const text = draft.trim();
    const hasAttachments = attachments.length > 0;
    const hasText = text.length > 0;

    if (!hasAttachments && !hasText) return;

    const currentReplyTo = replyToMessage?._id || null;

    if (hasAttachments) {
      setUploadingFiles(true);
      setDraft("");
      setReplyToMessage(null);
      for (const att of attachments) {
        const tempId = `temp-media-${Date.now()}-${Math.random()}`;
        const tempMsg = {
          _id: tempId,
          chatId: activeChat._id,
          sender: user,
          text: "",
          createdAt: new Date().toISOString(),
          pending: true,
          ...(currentReplyTo ? { replyTo: replyToMessage } : {}),
          ...(att.type === "image" ? { imageUrl: att.preview } : { fileUrl: att.preview, fileName: att.file.name, fileSize: att.file.size, mimeType: att.file.type }),
        };
        dispatch(addMessage(tempMsg));

        const uploadRes = await uploadChatFile(att.file);
        if (uploadRes.success) {
          let res;
          if (att.type === "image") {
            if (currentReplyTo) {
              const { sendReply: sendReplyFn } = await import("../../apiCalls/message.js");
              res = await sendReplyFn(activeChat._id, currentReplyTo, "", other?._id);
            } else {
              res = await sendImageMessage(activeChat._id, uploadRes.url, "", other?._id, linkPreview);
            }
          } else {
            res = await sendFileMessage(activeChat._id, uploadRes.url, uploadRes.fileName || att.file.name, uploadRes.fileSize || att.file.size, uploadRes.mimeType || att.file.type, "", other?._id);
          }
          if (res.success && socket) {
            socket.emit(SOCKET_EVENTS.SEND_MESSAGE, res.data);
            dispatch(markMessageSuccess({ tempId, realMessage: res.data }));
          } else {
            dispatch(markMessageFailed(tempId));
          }
        } else {
          dispatch(markMessageFailed(tempId));
        }
      }
      setAttachments([]);
      setUploadingFiles(false);
      clearLinkPreview();
    } else if (hasText) {
      setDraft("");
      setReplyToMessage(null);
      clearLinkPreview();
      const tempId = `temp-${Date.now()}`;
      const tempMsg = {
        _id: tempId,
        chatId: activeChat._id,
        sender: user,
        text,
        createdAt: new Date().toISOString(),
        pending: true,
        ...(currentReplyTo ? { replyTo: replyToMessage } : {}),
      };
      dispatch(addMessage(tempMsg));

      let res;
      if (currentReplyTo) {
        res = await sendReply(activeChat._id, currentReplyTo, text, other?._id);
      } else {
        const msgPayload = { chatId: activeChat._id, text, receiverId: other?._id };
        if (linkPreview) msgPayload.linkPreview = linkPreview;
        res = await sendMessage(activeChat._id, text, other?._id);
      }
      if (res.success && socket) {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, res.data);
        dispatch(markMessageSuccess({ tempId, realMessage: res.data }));
      } else {
        dispatch(markMessageFailed(tempId));
      }
    }
  };

  const handleSendAudio = async () => {
    const blob = recorder.audioBlob;
    if (!blob || !activeChat?._id) return;
    setSendingAudio(true);
    const other = activeChat.members?.find((m) => m._id !== user?._id);
    const tempId = `temp-audio-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      chatId: activeChat._id,
      sender: user,
      text: "",
      audioUrl: URL.createObjectURL(blob),
      audioDuration: recorder.duration,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    dispatch(addMessage(tempMsg));
    recorder.resetBlob();
    const uploadRes = await uploadAudio(blob);
    if (uploadRes.success) {
      const res = await sendAudioMessage(activeChat._id, uploadRes.url, uploadRes.duration || recorder.duration, other?._id);
      if (res.success && socket) {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, res.data);
        dispatch(markMessageSuccess({ tempId, realMessage: res.data }));
      } else {
        dispatch(markMessageFailed(tempId));
      }
    } else {
      dispatch(markMessageFailed(tempId));
    }
    setSendingAudio(false);
  };

  const filteredChats = chats.filter((c) => {
    if (activeFilter === "unread") return (c.unreadMessageCount || 0) > 0;
    return true;
  });

  const unreadCount = chats.filter((c) => (c.unreadMessageCount || 0) > 0).length;

  const handleSearchInput = (value) => {
    setSearchInput(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  };

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    setSearch("");
    setSearchInput("");
  };

  const otherMember = activeChat?.members?.find((m) => m._id !== user?._id);

  return (
    <AppLayout title="Messages" hideRightRail fullWidth>
      <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex">
        <aside
          className={`${activeChat?._id ? "hidden md:flex" : "flex"} flex-col w-full md:w-[340px] flex-shrink-0 border-r z-10`}
          style={{ borderColor: "var(--line-soft)", background: "var(--paper-2)" }}
        >
          <div className="p-4" style={{ borderBottom: "1px solid var(--line-soft)" }}>
            <h1 className="font-display text-xl font-black tracking-tight mb-3" style={{ color: "var(--ink)" }}>Messages</h1>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-2)" }} />
              <input
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search conversations…"
                className="brutal-input pl-11 text-sm"
                style={{ paddingTop: 10, paddingBottom: 10 }}
              />
            </div>
            <div className="mt-3">
              <ChatFilterBar
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                unreadCount={unreadCount}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingChats ? (
              <div className="p-2"><ChatListSkeleton /></div>
            ) : chatError ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-sm mb-3" style={{ color: "var(--riso-red)" }}>{chatError}</p>
                <button
                  onClick={() => { setLoadingChats(true); setChatError(null); window.location.reload(); }}
                  className="brutal-btn brutal-btn-sm"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </button>
              </div>
            ) : filteredChats.length === 0 && search.trim() ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="w-8 h-8 mb-3" style={{ color: "var(--muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>No results for "{searchInput}"</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>Try a different search</p>
              </div>
            ) : filteredChats.length === 0 && activeFilter === "unread" ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>All caught up</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>No unread conversations</p>
              </div>
            ) : filteredChats.length === 0 && activeFilter === "archived" ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>No archived conversations</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>Archive chats to see them here</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4"><EmptyChatsState /></div>
            ) : (
              <div className="space-y-1 stagger">
                {filteredChats.map((c) => (
                  <ChatListItem
                    key={c._id}
                    chat={c}
                    currentUserId={user?._id}
                    isActive={c._id === activeChat?._id}
                    isTyping={!!typingChats[c._id]}
                    onClick={() => navigate(ROUTES.CHAT_ID(c._id))}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className={`${activeChat?._id ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
          {!activeChat?._id ? (
            <div className="flex-1 grid place-items-center text-center p-8">
              <div className="animate-fade-in-up">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 grid place-items-center animate-float" style={{ background: "var(--acid)", boxShadow: "var(--sh-3)" }}>
                  <Send className="w-8 h-8" style={{ color: "var(--ink)" }} />
                </div>
                <h2 className="font-display text-xl font-black tracking-tight mb-1" style={{ color: "var(--ink)" }}>Your messages</h2>
                <p className="font-mono text-[11px]" style={{ color: "var(--muted-2)" }}>Pick a conversation to start chatting.</p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid var(--line-soft)", background: "var(--paper-2)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => navigate(ROUTES.CHAT)}
                    className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Avatar src={otherMember?.profilepic} name={`${otherMember?.firstname || ""} ${otherMember?.lastname || ""}`} size={40} online={otherMember?.isOnline && otherMember?.showOnlineStatus !== false} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>
                      {otherMember?.firstname} {otherMember?.lastname}
                    </p>
                    <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                      {otherMember?.isOnline && otherMember?.showOnlineStatus !== false ? "Active now" : otherMember?.lastSeen ? `Last seen ${new Date(otherMember.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><Phone className="w-4 h-4" /></button>
                  <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><Video className="w-4 h-4" /></button>
                  <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </header>

              <OfflineBanner isOnline={isOnline} />

              <div className="flex-1 flex overflow-hidden">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                  {loadingOlder && (
                    <div className="flex justify-center py-3">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
                    </div>
                  )}
                  {loadingMsgs ? (
                    <MessageListSkeleton />
                  ) : msgError ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <p className="text-sm mb-3" style={{ color: "var(--riso-red)" }}>{msgError}</p>
                      <button
                        onClick={() => { setMsgError(null); setLoadingMsgs(true); window.location.reload(); }}
                        className="brutal-btn brutal-btn-sm"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </button>
                    </div>
                  ) : (activeChat.messages || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div
                        className="w-14 h-14 mb-3 grid place-items-center rounded-full"
                        style={{ background: "var(--paper-3)", border: "1px solid var(--line-soft)" }}
                      >
                        <MessageSquare className="w-6 h-6" style={{ color: "var(--muted)" }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>No messages yet</p>
                      <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>Send the first one to start the conversation!</p>
                    </div>
                  ) : (
                    groupMessagesByDate(activeChat.messages || []).map((group) => (
                      <React.Fragment key={group.date}>
                        <DateSeparator date={group.date} />
                        {group.messages.map((m, i) => {
                          const mine = m.sender?._id === user?._id || m.sender === user?._id;
                          const msgs = group.messages;
                          const prevMsg = i > 0 ? msgs[i - 1] : null;
                          const nextMsg = i < msgs.length - 1 ? msgs[i + 1] : null;
                          const prevSameSender = prevMsg && (prevMsg.sender?._id === m.sender?._id || prevMsg.sender === m.sender);
                          const nextSameSender = nextMsg && (nextMsg.sender?._id === m.sender?._id || nextMsg.sender === m.sender);
                          const isGroupStart = !prevSameSender;
                          const isGroupEnd = !nextSameSender;
                          return (
                            <MessageBubble
                              key={m._id}
                              message={m}
                              isMine={mine}
                              isGroupStart={isGroupStart}
                              isGroupEnd={isGroupEnd}
                              otherMember={otherMember}
                              currentUserId={user?._id}
                              onRetry={handleRetrySend}
                              onDelete={(id) => {
                                if (m.pending || m.failed) handleDeleteFailed(id);
                                else handleDeleteMessage(id);
                              }}
                              onReact={handleReact}
                              onReply={handleReplyTo}
                              onEdit={handleSaveEdit}
                              onOpenThread={handleOpenThread}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                  {Object.keys(typingUsers).length > 0 && (
                    <div className="flex justify-start mt-2">
                      <span className="w-7 mr-2 flex-shrink-0" />
                      <div className="px-3 py-2 flex items-center gap-1" style={{ background: "var(--paper-2)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-md)" }}>
                        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                      </div>
                    </div>
                  )}
                </div>

                {activeThread && (
                  <ThreadPanel
                    rootMessage={activeThread}
                    currentUserId={user?._id}
                    onClose={handleCloseThread}
                    otherMember={otherMember}
                  />
                )}
              </div>

              <ScrollToBottom visible={showScrollBtn} onClick={scrollToBottom} unseenCount={unseenCount} />

              {recorder.isRecording || sendingAudio ? (
                <RecordingPanel
                  duration={recorder.duration}
                  onCancel={recorder.cancelRecording}
                  onStop={handleSendAudio}
                  error={recorder.error}
                />
              ) : (
                <div style={{ borderTop: "1px solid var(--line-soft)", background: "var(--paper-2)" }}>
                  <ReplyPreview message={replyToMessage} onCancel={handleCancelReply} />
                  <AttachmentsPreview attachments={attachments} onRemove={handleRemoveAttachment} />

                  {linkPreview && (
                    <div className="px-4 pt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Link preview</span>
                        <button
                          onClick={clearLinkPreview}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                          style={{ color: "var(--riso-red)", background: "rgba(217,122,108,0.1)" }}
                        >
                          Remove
                        </button>
                      </div>
                      {linkPreview.image && (
                        <div className="flex gap-2 p-2 rounded-lg" style={{ background: "var(--paper-3)", border: "1px solid var(--line-soft)" }}>
                          <img src={linkPreview.image} alt="" className="w-16 h-16 object-cover rounded flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: "var(--ink)" }}>{linkPreview.title}</p>
                            <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--muted)" }}>{linkPreview.siteName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 relative">
                    {showEmojiPicker && (
                      <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                        disabled={uploadingFiles}
                        aria-label="Attach file"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker((v) => !v)}
                        className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                        aria-label="Emoji picker"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      <input
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendWithAttachments())}
                        placeholder={replyToMessage ? `Reply to ${replyToMessage.sender?.firstname || "someone"}…` : "Write a message…"}
                        className="brutal-input rounded-full text-sm"
                        style={{ paddingTop: 10, paddingBottom: 10 }}
                      />
                      {(draft.trim() || attachments.length > 0) ? (
                        <button
                          onClick={handleSendWithAttachments}
                          disabled={uploadingFiles}
                          className="brutal-btn brutal-btn-primary brutal-btn-icon"
                        >
                          {uploadingFiles ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={recorder.startRecording}
                          className="brutal-btn brutal-btn-primary brutal-btn-icon"
                          aria-label="Record voice message"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
