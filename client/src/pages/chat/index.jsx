import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Send,
  Loader2,
  ArrowLeft,
  Phone,
  Video,
  RefreshCw,
  MessageSquare,
  BellOff,
  Bell,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Users,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { muteChat, pinChat, archiveChat } from "../../apiCalls/message.js";
import {
  toggleMuteChat,
  togglePinChat,
  archiveChatInList,
  selectMutedChats,
  selectPinnedChats,
  setChats,
  setActiveChat,
  addMessage,
  markMessageFailed,
  markMessageSuccess,
  removeMessage,
  prependMessages,
  updateMessageDelivery,
  updateMessageReadBy,
  updateActiveChatInfo,
} from "../../redux/chatSlice.js";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import RecordingPanel from "../../components/chat/RecordingPanel.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import OfflineBanner from "../../components/chat/OfflineBanner.jsx";
import MessageListSkeleton from "../../components/chat/MessageListSkeleton.jsx";
import MessageBubble from "../../components/chat/MessageBubble.jsx";
import DateSeparator from "../../components/chat/DateSeparator.jsx";
import ScrollToBottom from "../../components/chat/ScrollToBottom.jsx";
import ChatComposer from "../../components/chat/ChatComposer.jsx";
import ThreadPanel from "../../components/chat/ThreadPanel.jsx";
import CreateGroupModal from "../../components/chat/CreateGroupModal.jsx";
import NewMessageModal from "../../components/chat/NewMessageModal.jsx";
import GroupDetailsPanel from "../../components/chat/GroupDetailsPanel.jsx";
import CallHistoryPanel from "../../components/chat/CallHistoryPanel.jsx";
import IncomingCallModal from "../../components/chat/IncomingCallModal.jsx";
import ActiveCallOverlay from "../../components/chat/ActiveCallOverlay.jsx";
import useAudioRecorder from "../../hooks/useAudioRecorder.js";
import useChatTyping from "../../hooks/useChatTyping.js";
import useOnlineStatus from "../../hooks/useOnlineStatus.js";
import useLinkPreview from "../../hooks/useLinkPreview.js";
import useCall from "../../hooks/useCall.js";
import { useScreenSize } from "../../hooks/use-mobile.jsx";
import {
  getAllChats,
  getMessages,
  sendMessage,
  markMessagesRead,
  uploadAudio,
  sendAudioMessage,
  uploadChatFile,
  sendImageMessage,
  sendFileMessage,
  addReaction,
  deleteMessage,
  editMessage,
  sendReply,
} from "../../apiCalls/message.js";
import { getUserById } from "../../apiCalls/users.js";
import { useSocket } from "../../context/SocketContext.jsx";
import { SOCKET_EVENTS, ROUTES } from "../../lib/constants.js";


export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.userReducer);
  const { chats, activeChat } = useSelector((s) => s.chatReducer);
  const mutedChats = useSelector(selectMutedChats);
  const pinnedChats = useSelector(selectPinnedChats);
  const { socket } = useSocket();
  const { callStatus, initiate } = useCall();

  const screenSize = useScreenSize();
  const isMobileView = screenSize === "mobile";
  const isTabletView = screenSize === "tablet";

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
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const recorder = useAudioRecorder();
  const typingChats = useChatTyping(chats, user?._id, socket);
  const { isOnline, wasOffline } = useOnlineStatus();
  const { preview: linkPreview, clear: clearLinkPreview } = useLinkPreview(draft);

  const [mobileView, setMobileView] = useState(chatId ? "chat" : "list");
  const [mobileAnim, setMobileAnim] = useState(null);
  const prevChatIdRef = useRef(chatId);
  const mobileAnimTimerRef = useRef(null);

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
      if (isMobileView && mobileAnim === "leaving") return;
      dispatch(setActiveChat(null));
      setReplyToMessage(null);
      setActiveThread(null);
      return;
    }
    setHasMore(true);
    setNextCursor(null);
    setLoadingOlder(false);
    setReplyToMessage(null);
    setActiveThread(null);
    const found = chats.find((c) => c._id === chatId);
    if (found) dispatch(setActiveChat({ ...found, messages: [] }));
  }, [chatId, chats, dispatch, isMobileView, mobileAnim]);

  useEffect(() => {
    if (!chatId && !mobileAnim && mobileView === "list") {
      dispatch(setActiveChat(null));
      setReplyToMessage(null);
      setActiveThread(null);
    }
  }, [chatId, mobileAnim, mobileView, dispatch]);

  useEffect(() => {
    if (!activeChat?._id || activeChat.type !== "direct" || activeChat.otherUser) return;
    if (!activeChat.members || activeChat.members.length === 0) return;
    const partnerId = activeChat.members.find((m) => (m?._id || m) !== user?._id);
    if (!partnerId || typeof partnerId !== "string") return;
    const chatId = activeChat._id;
    let cancelled = false;
    (async () => {
      try {
        const res = await getUserById(partnerId);
        if (cancelled) return;
        if (res.success && res.data) {
          const u = res.data;
          dispatch(updateActiveChatInfo({ chatId, updates: { otherUser: { _id: u._id, firstname: u.firstname, lastname: u.lastname, profilepic: u.profilepic, isOnline: u.isOnline, lastSeen: u.lastSeen } } }));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [activeChat?._id, activeChat?.type, activeChat?.otherUser, activeChat?.members, dispatch, user?._id]);

  useEffect(() => {
    if (!activeChat?._id || activeChat.messages?.length) return;
    let cancelled = false;
    setLoadingMsgs(true);
    setMsgError(null);
    (async () => {
      try {
        const res = await getMessages(activeChat._id, { limit: 30 });
        if (cancelled) return;
        if (res.success) {
          dispatch(setActiveChat({ ...activeChat, messages: (res.data?.messages || []).reverse() }));
          setHasMore(res.data?.hasMore || false);
          setNextCursor(res.data?.nextCursor || null);
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

    const onChatUpdated = ({ chatId, changes, updatedBy }) => {
      dispatch(updateActiveChatInfo({ chatId, updates: changes }));
    };
    const onParticipantAdded = ({ chatId }) => {
      if (chatId === activeChat?._id) {
        dispatch(updateActiveChatInfo({ chatId, updates: { memberCount: (activeChat.memberCount || activeChat.members?.length || 0) + 1 } }));
      }
    };
    const onParticipantRemoved = ({ chatId, userId }) => {
      if (chatId === activeChat?._id && userId === user?._id) {
        dispatch(setActiveChat(null));
        navigate(ROUTES.CHAT);
        toast.info("You were removed from the group");
      } else if (chatId === activeChat?._id) {
        dispatch(updateActiveChatInfo({ chatId, updates: { memberCount: Math.max(0, (activeChat.memberCount || activeChat.members?.length || 1) - 1) } }));
      }
    };

    socket.on("chat_updated", onChatUpdated);
    socket.on("participant_added", onParticipantAdded);
    socket.on("participant_removed", onParticipantRemoved);

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
      socket.off("chat_updated", onChatUpdated);
      socket.off("participant_added", onParticipantAdded);
      socket.off("participant_removed", onParticipantRemoved);
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
    const receiverId = activeChat.type === "group" ? null : (otherMember?._id || activeChat.otherUser?._id);
    let res;
    if (msg.audioUrl) {
      res = await sendAudioMessage(activeChat._id, msg.audioUrl, msg.audioDuration, receiverId);
    } else if (msg.imageUrl) {
      res = await sendImageMessage(activeChat._id, msg.imageUrl, msg.text || "", receiverId);
    } else if (msg.fileUrl) {
      res = await sendFileMessage(activeChat._id, msg.fileUrl, msg.fileName, msg.fileSize, msg.mimeType, msg.text || "", receiverId);
    } else {
      res = await sendMessage(activeChat._id, msg.text, receiverId);
    }
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
    if (!activeChat?._id || loadingOlder || !hasMore || !nextCursor) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const res = await getMessages(activeChat._id, { cursor: nextCursor, limit: 30 });
      if (res.success && res.data?.messages?.length) {
        const older = res.data.messages.reverse();
        dispatch(prependMessages({ chatId: activeChat._id, messages: older }));
        setHasMore(res.data.hasMore || false);
        setNextCursor(res.data.nextCursor || null);
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
  }, [activeChat?._id, nextCursor, hasMore, loadingOlder, dispatch]);

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

  useEffect(() => {
    if (!isMobileView) {
      setMobileView(chatId ? "chat" : "list");
      setMobileAnim(null);
      if (mobileAnimTimerRef.current) clearTimeout(mobileAnimTimerRef.current);
      return;
    }
    const prev = prevChatIdRef.current;
    prevChatIdRef.current = chatId;
    if (chatId && !prev) {
      setMobileAnim("entering");
      if (mobileAnimTimerRef.current) clearTimeout(mobileAnimTimerRef.current);
      mobileAnimTimerRef.current = setTimeout(() => {
        setMobileView("chat");
        setMobileAnim(null);
      }, 350);
    } else if (!chatId && prev) {
      setMobileAnim("leaving");
      if (mobileAnimTimerRef.current) clearTimeout(mobileAnimTimerRef.current);
      mobileAnimTimerRef.current = setTimeout(() => {
        setMobileView("list");
        setMobileAnim(null);
      }, 350);
    }
    return () => {
      if (mobileAnimTimerRef.current) clearTimeout(mobileAnimTimerRef.current);
    };
  }, [chatId, isMobileView]);

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
    const res = await addReaction(activeChat._id, messageId, emoji);
    if (res.success && res.data) {
      dispatch(addMessage({ ...res.data, chatId: activeChat._id, _replace: messageId }));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;
    const res = await deleteMessage(activeChat._id, messageId);
    if (res.success) {
      dispatch(addMessage({ _id: messageId, deleted: true, chatId: activeChat._id, _replace: messageId }));
      toast.success("Message deleted");
    } else {
      toast.error("Failed to delete message");
    }
  };

  const handleReplyTo = (message) => {
    setReplyToMessage(message);
    setActiveThread(null);
  };

  const handleCancelReply = () => setReplyToMessage(null);

  const handleSaveEdit = async (message, newText) => {
    const res = await editMessage(activeChat._id, message._id, newText);
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

  const isMuted = activeChat?._id ? mutedChats.includes(activeChat._id) : false;

  const handleMuteToggle = async () => {
    if (!activeChat?._id) return;
    const wasMuted = mutedChats.includes(activeChat._id);
    dispatch(toggleMuteChat(activeChat._id));
    setShowChatMenu(false);
    try {
      await muteChat(activeChat._id, !wasMuted);
    } catch {
      dispatch(toggleMuteChat(activeChat._id));
      toast.error("Failed to update mute setting");
    }
  };

  const handleMuteToggleById = async (cId) => {
    const wasMuted = mutedChats.includes(cId);
    dispatch(toggleMuteChat(cId));
    try {
      await muteChat(cId, !wasMuted);
    } catch {
      dispatch(toggleMuteChat(cId));
      toast.error("Failed to update mute setting");
    }
  };

  const handlePinToggleById = async (cId) => {
    const wasPinned = pinnedChats.includes(cId);
    dispatch(togglePinChat(cId));
    try {
      await pinChat(cId, !wasPinned);
      toast.success(wasPinned ? "Chat unpinned" : "Chat pinned");
    } catch {
      dispatch(togglePinChat(cId));
      toast.error("Failed to update pin");
    }
  };

  const handleArchiveById = async (cId) => {
    const chat = chats.find((c) => c._id === cId);
    const wasArchived = chat?.archived;
    if (!wasArchived && !confirm("Archive this chat?")) return;
    try {
      await archiveChat(cId, !wasArchived);
      if (!wasArchived) {
        dispatch(archiveChatInList(cId));
        toast.success("Chat archived");
      } else {
        dispatch(updateActiveChatInfo({ chatId: cId, updates: { archived: false } }));
        toast.success("Chat unarchived");
      }
    } catch {
      toast.error("Failed to update archive");
    }
  };

  const handleOpenGroupInfoFromList = (cId) => {
    navigate(ROUTES.CHAT_ID(cId));
  };

  const handleMobileBack = useCallback(() => {
    setMobileAnim("leaving");
    if (mobileAnimTimerRef.current) clearTimeout(mobileAnimTimerRef.current);
    mobileAnimTimerRef.current = setTimeout(() => {
      navigate(ROUTES.CHAT);
      setMobileView("list");
      setMobileAnim(null);
    }, 350);
  }, [navigate]);

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
    const receiverId = activeChat.type === "group" ? null : (activeChat.otherUser?._id || activeChat.members?.find((m) => m?._id !== user?._id)?._id);
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
              res = await sendReply(activeChat._id, currentReplyTo, text || "", receiverId, { imageUrl: uploadRes.url });
            } else {
              res = await sendImageMessage(activeChat._id, uploadRes.url, text || "", receiverId, linkPreview);
            }
          } else {
            res = await sendFileMessage(activeChat._id, uploadRes.url, uploadRes.fileName || att.file.name, uploadRes.fileSize || att.file.size, uploadRes.mimeType || att.file.type, "", receiverId);
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
        res = await sendReply(activeChat._id, currentReplyTo, text, receiverId);
      } else {
        res = await sendMessage(activeChat._id, text, receiverId);
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
    const receiverId = activeChat.type === "group" ? null : (activeChat.otherUser?._id || activeChat.members?.find((m) => m?._id !== user?._id)?._id);
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
      const res = await sendAudioMessage(activeChat._id, uploadRes.url, uploadRes.duration || recorder.duration, receiverId);
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

  const otherMemberBase = activeChat?.type === "group" ? null : (activeChat?.otherUser || activeChat?.members?.find((m) => m?._id !== user?._id));
  const otherMemberLive = activeChat?.type === "group" ? null : activeChat?.members?.find((m) => (m?._id || m) === otherMemberBase?._id);
  const otherMember = otherMemberBase ? { ...otherMemberBase, isOnline: otherMemberLive?.isOnline ?? otherMemberBase.isOnline, lastSeen: otherMemberLive?.lastSeen ?? otherMemberBase.lastSeen } : null;
  const isGroupChat = activeChat?.type === "group";

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

  const handleSelectChat = (cId) => navigate(ROUTES.CHAT_ID(cId));

  const showSidebar = isMobileView
    ? mobileView === "list" || (mobileAnim === "leaving")
    : true;

  const showConversation = isMobileView
    ? activeChat?._id && (mobileView === "chat" || mobileAnim === "entering")
    : true;

  const sidebarVisible = isMobileView
    ? mobileView === "list" && mobileAnim !== "leaving"
    : true;

  const conversationVisible = isMobileView
    ? mobileView === "chat" && mobileAnim !== "leaving"
    : true;

  const sidebarClassName = isMobileView
    ? mobileAnim === "leaving"
      ? "w-full animate-slide-in-left"
      : "w-full animate-fade-in"
    : isTabletView
      ? "w-[280px]"
      : activeChat?._id
        ? "hidden lg:flex w-[340px]"
        : "flex w-[340px]";

  const conversationClassName = isMobileView
    ? mobileAnim === "leaving"
      ? "hidden"
      : mobileAnim === "entering"
        ? "flex animate-slide-in-right"
        : mobileView === "chat"
          ? "flex"
          : "hidden"
    : isTabletView
      ? "flex-1"
      : activeChat?._id
        ? "flex-1"
        : "hidden lg:flex lg:flex-1";

  return (
    <>
      <AppLayout title="Messages" hideRightRail fullWidth>
        <div className="chat-container">
          {sidebarVisible && (
            <ChatSidebar
              chats={chats}
              activeChat={activeChat}
              currentUserId={user?._id}
              loadingChats={loadingChats}
              chatError={chatError}
              searchInput={searchInput}
              search={search}
              activeFilter={activeFilter}
              typingChats={typingChats}
              mutedChats={mutedChats}
              pinnedChats={pinnedChats}
              onSearchInput={handleSearchInput}
              onFilterChange={handleFilterChange}
              onSelectChat={handleSelectChat}
              onCreateGroup={() => setShowCreateGroup(true)}
              onRetryLoad={() => { setLoadingChats(true); setChatError(null); window.location.reload(); }}
              onNewMessage={() => setShowNewMessage(true)}
              onToggleMute={handleMuteToggleById}
              onTogglePin={handlePinToggleById}
              onArchive={handleArchiveById}
              onOpenGroupInfo={handleOpenGroupInfoFromList}
              className={sidebarClassName}
            />
          )}

          {showConversation && (
            <section className={`flex-col min-w-0 ${conversationClassName}`}>
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
                  <header className="chat-header">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => isMobileView ? handleMobileBack() : isTabletView ? navigate(ROUTES.CHAT) : undefined}
                        className="brutal-btn brutal-btn-ghost brutal-btn-icon lg:hidden"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      {isGroupChat ? (
                        <>
                          <Avatar src={activeChat.icon} name={activeChat.name || "Group"} size={40} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>
                              {activeChat.name || "Unnamed Group"}
                            </p>
                            <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                              {activeChat.memberCount || activeChat.members?.length || 0} members
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Avatar src={otherMember?.profilepic} name={`${otherMember?.firstname || ""} ${otherMember?.lastname || ""}`} size={40} online={otherMember?.isOnline && otherMember?.showOnlineStatus !== false} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>
                              {otherMember?.firstname} {otherMember?.lastname}
                            </p>
                            <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                              {otherMember?.isOnline && otherMember?.showOnlineStatus !== false ? "Active now" : otherMember?.lastSeen ? `Last seen ${new Date(otherMember.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Offline"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isGroupChat && (
                        <>
                          <button
                            onClick={() => {
                              if (callStatus !== "idle") return toast.error("You're already in a call");
                              initiate(activeChat._id, "audio");
                            }}
                            disabled={callStatus !== "idle"}
                            className="brutal-btn brutal-btn-ghost brutal-btn-icon hidden sm:inline-flex"
                            style={{ opacity: callStatus !== "idle" ? 0.4 : 1 }}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (callStatus !== "idle") return toast.error("You're already in a call");
                              initiate(activeChat._id, "video");
                            }}
                            disabled={callStatus !== "idle"}
                            className="brutal-btn brutal-btn-ghost brutal-btn-icon hidden sm:inline-flex"
                            style={{ opacity: callStatus !== "idle" ? 0.4 : 1 }}
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => setShowChatMenu((v) => !v)}
                          className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                        >
                          {isGroupChat ? <Users className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
                        </button>
                        {showChatMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                            <div
                              className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1 anim-fade-in"
                              style={{
                                background: "var(--paper)",
                                border: "1px solid var(--line-soft)",
                                borderRadius: "var(--r-md)",
                                boxShadow: "var(--sh-3)",
                              }}
                            >
                              {isGroupChat && (
                                <button
                                  onClick={() => { setShowGroupDetails(true); setShowChatMenu(false); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                                  style={{ color: "var(--ink)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <Users className="w-4 h-4" />
                                  Group Info
                                </button>
                              )}
                              {!isGroupChat && (
                                <button
                                  onClick={() => { setShowCallHistory(true); setShowChatMenu(false); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                                  style={{ color: "var(--ink)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <Clock className="w-4 h-4" />
                                  Call History
                                </button>
                              )}
                              <button
                                onClick={handleMuteToggle}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                                style={{ color: "var(--ink)" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                {isMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                {isMuted ? "Unmute" : "Mute"}
                              </button>
                              <button
                                onClick={async () => {
                                  const wasPinned = pinnedChats.includes(activeChat._id);
                                  dispatch(togglePinChat(activeChat._id));
                                  setShowChatMenu(false);
                                  try { await pinChat(activeChat._id, !wasPinned); toast.success(wasPinned ? "Chat unpinned" : "Chat pinned"); }
                                  catch { dispatch(togglePinChat(activeChat._id)); toast.error("Failed to update pin"); }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                                style={{ color: "var(--ink)" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                {pinnedChats.includes(activeChat._id) ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                {pinnedChats.includes(activeChat._id) ? "Unpin" : "Pin"}
                              </button>
                              <button
                                onClick={async () => {
                                  setShowChatMenu(false);
                                  const wasArchived = activeChat.archived;
                                  if (!wasArchived && !confirm("Archive this chat?")) return;
                                  try {
                                    await archiveChat(activeChat._id, !wasArchived);
                                    if (!wasArchived) { dispatch(archiveChatInList(activeChat._id)); toast.success("Chat archived"); }
                                    else { dispatch(updateActiveChatInfo({ chatId: activeChat._id, updates: { archived: false } })); toast.success("Chat unarchived"); }
                                  } catch { toast.error("Failed to update archive"); }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                                style={{ color: "var(--ink)" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                {activeChat.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                {activeChat.archived ? "Unarchive" : "Archive"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
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
                                  isGroupChat={isGroupChat}
                                  otherMember={otherMember}
                                  members={activeChat.members}
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
                    <ChatComposer
                      draft={draft}
                      onDraftChange={setDraft}
                      onSend={handleSendWithAttachments}
                      onTyping={handleTyping}
                      attachments={attachments}
                      onRemoveAttachment={handleRemoveAttachment}
                      replyToMessage={replyToMessage}
                      onCancelReply={handleCancelReply}
                      showEmojiPicker={showEmojiPicker}
                      onToggleEmoji={() => setShowEmojiPicker((v) => !v)}
                      onEmojiSelect={handleEmojiSelect}
                      onCloseEmoji={() => setShowEmojiPicker(false)}
                      linkPreview={linkPreview}
                      clearLinkPreview={clearLinkPreview}
                      uploadingFiles={uploadingFiles}
                      isRecording={recorder.isRecording}
                      sendingAudio={sendingAudio}
                      onStartRecording={recorder.startRecording}
                      fileInputRef={fileInputRef}
                      onFileSelect={handleFileSelect}
                    />
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </AppLayout>
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(cId) => {
            setShowCreateGroup(false);
            if (cId) navigate(ROUTES.CHAT_ID(cId));
            else navigate("/chat");
          }}
        />
      )}
      {showNewMessage && (
        <NewMessageModal
          onClose={() => setShowNewMessage(false)}
          onChatCreated={(chatData) => {
            setShowNewMessage(false);
            if (chatData?._id) {
              dispatch(setActiveChat({ ...chatData, messages: [] }));
              navigate(ROUTES.CHAT_ID(chatData._id));
            } else {
              navigate("/chat");
            }
          }}
        />
      )}
      {showCallHistory && activeChat && (
      <CallHistoryPanel
        chatId={activeChat._id}
        currentUserId={user?._id}
        onClose={() => setShowCallHistory(false)}
      />
    )}
      {showGroupDetails && activeChat && isGroupChat && (
        <GroupDetailsPanel
          chat={activeChat}
          currentUserId={user?._id}
          onClose={() => setShowGroupDetails(false)}
          onChatUpdated={(updatedChat) => {
            dispatch(setActiveChat({ ...activeChat, ...updatedChat }));
          }}
        />
      )}
      <IncomingCallModal />
      <ActiveCallOverlay />
    </>
  );
}
