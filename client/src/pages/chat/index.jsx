import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { getAllChats, getMessages, sendMessage, markMessagesRead } from "../../apiCalls/message.js";
import { setChats, setActiveChat, addMessage } from "../../redux/chatSlice.js";
import { useSocket } from "../../context/SocketContext.jsx";
import { SOCKET_EVENTS, ROUTES } from "../../lib/constants.js";
import { ChatListSkeleton } from "../../components/Skeletons.jsx";
import { EmptyChatsState } from "../../components/EmptyStates.jsx";
import { formatTime } from "../../components/CommonUI.jsx";

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.userReducer);
  const { chats, activeChat } = useSelector((s) => s.chatReducer);
  const { socket } = useSocket();

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const scrollRef = useRef(null);

  /* Load chats once */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getAllChats();
      if (cancelled) return;
      if (res.success) dispatch(setChats(res.data || []));
      setLoadingChats(false);
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

  /* Pick active chat from URL */
  useEffect(() => {
    if (!chatId) {
      dispatch(setActiveChat(null));
      return;
    }
    const found = chats.find((c) => c._id === chatId);
    if (found) dispatch(setActiveChat({ ...found, messages: [] }));
  }, [chatId, chats, dispatch]);

  /* Load messages for active chat */
  useEffect(() => {
    if (!activeChat?._id || activeChat.messages?.length) return;
    let cancelled = false;
    setLoadingMsgs(true);
    (async () => {
      const res = await getMessages(activeChat._id);
      if (cancelled) return;
      if (res.success) {
        dispatch(setActiveChat({ ...activeChat, messages: (res.data || []).reverse() }));
      }
      setLoadingMsgs(false);
      markMessagesRead(activeChat._id);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?._id]);

  /* Socket listeners */
  useEffect(() => {
    if (!socket) return;
    const onReceive = (m) => dispatch(addMessage(m));
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
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceive);
    socket.on(SOCKET_EVENTS.USER_TYPING, onTypingStart);
    socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, onTypingStop);
    if (activeChat?._id) socket.emit(SOCKET_EVENTS.JOIN_CHAT, activeChat._id);
    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceive);
      socket.off(SOCKET_EVENTS.USER_TYPING, onTypingStart);
      socket.off(SOCKET_EVENTS.USER_STOPPED_TYPING, onTypingStop);
      if (activeChat?._id) socket.emit(SOCKET_EVENTS.LEAVE_CHAT, activeChat._id);
    };
  }, [socket, activeChat?._id, user?._id, dispatch]);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages?.length, typingUsers]);

  const handleSend = async () => {
    if (!draft.trim() || !activeChat?._id) return;
    const text = draft.trim();
    setDraft("");
    const other = activeChat.members?.find((m) => m._id !== user?._id);
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      chatId: activeChat._id,
      sender: user,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    dispatch(addMessage(tempMsg));
    const res = await sendMessage(activeChat._id, text, other?._id);
    if (res.success && socket) {
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, res.data);
    }
  };

  const handleTyping = () => {
    if (!socket || !activeChat?._id) return;
    socket.emit(SOCKET_EVENTS.TYPING_START, { chatId: activeChat._id, userId: user?._id });
    clearTimeout(window.__typingTimer);
    window.__typingTimer = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { chatId: activeChat._id, userId: user?._id });
    }, 1500);
  };

  const filteredChats = chats.filter((c) => {
    if (!search.trim()) return true;
    const other = c.members?.find((m) => m._id !== user?._id);
    const name = `${other?.firstname || ""} ${other?.lastname || ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const otherMember = activeChat?.members?.find((m) => m._id !== user?._id);

  return (
    <AppLayout title="Messages" hideRightRail fullWidth>
      <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex">
        {/* Chat list */}
        <aside
          className={`${activeChat?._id ? "hidden md:flex" : "flex"} flex-col w-full md:w-[340px] flex-shrink-0 border-r border-glass-border bg-glass`}
        >
          <div className="p-4 border-b border-glass-border">
            <h1 className="text-xl font-extrabold text-foreground mb-3">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="input pl-11 rounded-full text-sm py-2"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingChats ? (
              <div className="p-2"><ChatListSkeleton /></div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4"><EmptyChatsState /></div>
            ) : (
              <div className="space-y-1 stagger">
                {filteredChats.map((c) => {
                  const other = c.members?.find((m) => m._id !== user?._id);
                  const name = `${other?.firstname || ""} ${other?.lastname || ""}`.trim();
                  const active = c._id === activeChat?._id;
                  return (
                    <button
                      key={c._id}
                      onClick={() => navigate(ROUTES.CHAT_ID(c._id))}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        active ? "bg-glass-hover border border-glass-border-strong" : "hover:bg-glass-hover"
                      }`}
                    >
                      <Avatar src={other?.profilepic} name={name} size={44} online={other?.isOnline} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground truncate">{name || "Unknown"}</p>
                          {c.lastMessage?.createdAt && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {formatTime(c.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.lastMessage?.text || "Say hi 👋"}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-primary text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={`${activeChat?._id ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
          {!activeChat?._id ? (
            <div className="flex-1 grid place-items-center text-center p-8">
              <div className="animate-fade-in-up">
                <div className="w-20 h-20 rounded-full bg-gradient-primary glow-primary mx-auto mb-4 grid place-items-center animate-float">
                  <Send className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">Your messages</h2>
                <p className="text-sm text-muted-foreground">Pick a conversation to start chatting.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <header className="flex items-center justify-between p-3 border-b border-glass-border bg-glass">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => navigate(ROUTES.CHAT)}
                    className="md:hidden btn btn-ghost btn-icon"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Avatar src={otherMember?.profilepic} name={`${otherMember?.firstname || ""} ${otherMember?.lastname || ""}`} size={40} online={otherMember?.isOnline} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {otherMember?.firstname} {otherMember?.lastname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {otherMember?.isOnline ? "Active now" : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn btn-ghost btn-icon"><Phone className="w-4 h-4" /></button>
                  <button className="btn btn-ghost btn-icon"><Video className="w-4 h-4" /></button>
                  <button className="btn btn-ghost btn-icon"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </header>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (activeChat.messages || []).length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-12">No messages yet. Send the first one!</p>
                ) : (
                  (activeChat.messages || []).map((m, i) => {
                    const mine = m.sender?._id === user?._id || m.sender === user?._id;
                    const prev = activeChat.messages[i - 1];
                    const sameAsPrev = prev && (prev.sender?._id === m.sender?._id || prev.sender === m.sender);
                    return (
                      <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"} ${sameAsPrev ? "mt-0.5" : "mt-3"}`}>
                        {!mine && !sameAsPrev && (
                          <Avatar src={otherMember?.profilepic} name={otherMember?.firstname || ""} size={28} className="mr-2 self-end" />
                        )}
                        {!mine && sameAsPrev && <span className="w-7 mr-2 flex-shrink-0" />}
                        <div
                          className={`max-w-[75%] sm:max-w-[60%] px-4 py-2 rounded-2xl text-sm leading-relaxed animate-fade-in ${
                            mine
                              ? `bg-gradient-primary text-white rounded-br-sm ${m.pending ? "opacity-70" : ""} glow-primary-soft`
                              : "bg-glass-strong text-foreground rounded-bl-sm border border-glass-border"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="flex justify-start mt-2">
                    <span className="w-7 mr-2 flex-shrink-0" />
                    <div className="bg-glass-strong border border-glass-border rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="p-3 border-t border-glass-border bg-glass">
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost btn-icon"><Paperclip className="w-4 h-4" /></button>
                  <button className="btn btn-ghost btn-icon"><Smile className="w-4 h-4" /></button>
                  <input
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); handleTyping(); }}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="Write a message…"
                    className="input rounded-full flex-1 text-sm py-2.5"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="btn btn-primary btn-icon"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
