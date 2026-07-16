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
  Mic,
} from "lucide-react";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import AudioMessage from "../../components/chat/AudioMessage.jsx";
import RecordingPanel from "../../components/chat/RecordingPanel.jsx";
import ChatListItem from "../../components/chat/ChatListItem.jsx";
import useAudioRecorder from "../../hooks/useAudioRecorder.js";
import useChatTyping from "../../hooks/useChatTyping.js";
import { getAllChats, getMessages, sendMessage, markMessagesRead, uploadAudio, sendAudioMessage } from "../../apiCalls/message.js";
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
  const [sendingAudio, setSendingAudio] = useState(false);
  const scrollRef = useRef(null);
  const recorder = useAudioRecorder();

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

  const handleSendAudio = async () => {
    const blob = recorder.audioBlob;
    if (!blob || !activeChat?._id) return;
    setSendingAudio(true);
    const other = activeChat.members?.find((m) => m._id !== user?._id);
    const tempMsg = {
      _id: `temp-audio-${Date.now()}`,
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
      }
    }
    setSendingAudio(false);
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
          className={`${activeChat?._id ? "hidden md:flex" : "flex"} flex-col w-full md:w-[340px] flex-shrink-0 border-r z-10`}
          style={{ borderColor: "var(--line-soft)", background: "var(--paper-2)" }}
        >
          <div className="p-4" style={{ borderBottom: "1px solid var(--line-soft)" }}>
            <h1 className="font-display text-xl font-black tracking-tight mb-3" style={{ color: "var(--ink)" }}>Messages</h1>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-2)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="brutal-input pl-11 text-sm"
                style={{ paddingTop: 10, paddingBottom: 10 }}
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
                      className={`w-full flex items-center gap-3 p-2.5 text-left transition-all ${
                        active ? "bg-paper-2" : "hover:bg-paper-2"
                      }`}
                      style={active ? { boxShadow: "var(--sh-1)" } : {}}
                    >
                      <Avatar src={other?.profilepic} name={name} size={44} online={other?.isOnline} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{name || "Unknown"}</p>
                          {c.lastMessage?.createdAt && (
                            <span className="font-mono text-[10px] flex-shrink-0" style={{ color: "var(--muted-2)" }}>
                              {formatTime(c.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: "var(--muted-2)" }}>
                          {c.lastMessage?.text || "Say hi"}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0" style={{ background: "var(--riso-red)", color: "var(--paper)", border: "1px solid var(--ink)" }}>
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
                <div className="w-20 h-20 rounded-full mx-auto mb-4 grid place-items-center animate-float" style={{ background: "var(--acid)", boxShadow: "var(--sh-3)" }}>
                  <Send className="w-8 h-8" style={{ color: "var(--ink)" }} />
                </div>
                <h2 className="font-display text-xl font-black tracking-tight mb-1" style={{ color: "var(--ink)" }}>Your messages</h2>
                <p className="font-mono text-[11px]" style={{ color: "var(--muted-2)" }}>Pick a conversation to start chatting.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <header className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid var(--line-soft)", background: "var(--paper-2)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => navigate(ROUTES.CHAT)}
                    className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Avatar src={otherMember?.profilepic} name={`${otherMember?.firstname || ""} ${otherMember?.lastname || ""}`} size={40} online={otherMember?.isOnline} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>
                      {otherMember?.firstname} {otherMember?.lastname}
                    </p>
                    <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                      {otherMember?.isOnline ? "Active now" : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><Phone className="w-4 h-4" /></button>
                  <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><Video className="w-4 h-4" /></button>
                  <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </header>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--acid)" }} /></div>
                ) : (activeChat.messages || []).length === 0 ? (
                  <p className="text-center font-mono text-[11px] py-12" style={{ color: "var(--muted-2)" }}>No messages yet. Send the first one!</p>
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
                          className="max-w-[75%] sm:max-w-[60%] px-4 py-2 text-sm leading-relaxed animate-fade-in"
                          style={{
                            background: mine ? "var(--ink)" : "var(--paper-2)",
                            color: mine ? "var(--paper)" : "var(--ink)",
                            borderRadius: "var(--r-lg)",
                            opacity: m.pending ? 0.7 : 1,
                          }}
                        >
                          {m.audioUrl ? (
                            <AudioMessage
                              audioUrl={m.audioUrl}
                              duration={m.audioDuration}
                              isMine={mine}
                            />
                          ) : m.text}
                        </div>
                      </div>
                    );
                  })
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

              {/* Composer / Recording Panel */}
              {recorder.isRecording || sendingAudio ? (
                <RecordingPanel
                  duration={recorder.duration}
                  onCancel={recorder.cancelRecording}
                  onStop={handleSendAudio}
                  error={recorder.error}
                />
              ) : (
                <div className="p-3" style={{ borderTop: "1px solid var(--line-soft)", background: "var(--paper-2)" }}>
                  <div className="flex items-center gap-2">
                    <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><Paperclip className="w-4 h-4" /></button>
                    <button className="brutal-btn brutal-btn-ghost brutal-btn-icon"><Smile className="w-4 h-4" /></button>
                    <input
                      value={draft}
                      onChange={(e) => { setDraft(e.target.value); handleTyping(); }}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                      placeholder="Write a message…"
                      className="brutal-input rounded-full text-sm"
                      style={{ paddingTop: 10, paddingBottom: 10 }}
                    />
                    {draft.trim() ? (
                      <button
                        onClick={handleSend}
                        className="brutal-btn brutal-btn-primary brutal-btn-icon"
                      >
                        <Send className="w-4 h-4" />
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
              )}
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
