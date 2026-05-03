import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Search,
  MoreVertical,
  Image,
  Smile,
  Phone,
  Video,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext.jsx";
import { setMessages, addMessage, setActiveChat, setChats, addChat } from "../../redux/chatSlice.js";
import { getMessages, sendMessage, markMessagesRead } from "../../apiCalls/message.js";
import { createOrFindChat, getAllChats } from "../../apiCalls/chat.js";
import { getAllUsers } from "../../apiCalls/users.js";
import { showLoader, hideLoader } from "../../redux/loaderSlice.js";
import heroBackground from "../../assets/images/futuristic-moon-background.jpg";
import toast from "react-hot-toast";

const MessageBubble = ({ message, currentUserId }) => {
  const isMine = String(message.sender) === String(currentUserId);

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-glass/30 border border-glass-border/30 text-foreground rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div
          className={`text-[10px] mt-1 ${
            isMine ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {formatTime(message.createdAt)}
          {isMine && message.read && " · Read"}
        </div>
      </div>
    </div>
  );
};

const ChatList = ({ onSelectChat, activeChatId }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.userReducer);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await getAllUsers();
      if (res.success) setAllUsers(res.data);
    };
    fetchUsers();
  }, []);

  const filteredUsers = allUsers.filter(
    (u) =>
      !searchQuery ||
      u.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = async (otherUser) => {
    dispatch(showLoader());
    try {
      const res = await createOrFindChat(otherUser._id);
      dispatch(hideLoader());
      if (res.success) {
        dispatch(addChat(res.data));
        onSelectChat(res.data, otherUser);
      } else {
        toast.error(res.message || "Failed to start chat");
      }
    } catch {
      dispatch(hideLoader());
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-glass-border/20">
        <h2 className="text-lg font-bold text-foreground mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search or start new chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-glass/20 border border-glass-border/30 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.map((u) => (
          <button
            key={u._id}
            onClick={() => handleStartChat(u)}
            className={`w-full flex items-center space-x-3 p-3 hover:bg-glass/20 transition-colors text-left ${
              activeChatId === u._id ? "bg-glass/20" : ""
            }`}
          >
            <div className="relative flex-shrink-0">
              {u.profilepic ? (
                <img
                  src={u.profilepic}
                  alt={u.firstname}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-glass/30 flex items-center justify-center text-foreground text-sm font-bold">
                  {u.firstname?.[0]}
                </div>
              )}
              {u.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {u.firstname} {u.lastname}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {u.email}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatView = ({ chat, otherUser, onBack, currentUserId }) => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socket = useSocket();
  const dispatch = useDispatch();
  const { messages } = useSelector((s) => s.chatReducer);

  // Load messages when chat changes
  useEffect(() => {
    if (!chat?._id) return;
    const load = async () => {
      dispatch(showLoader());
      const res = await getMessages(chat._id);
      dispatch(hideLoader());
      if (res.success) {
        dispatch(setMessages(res.data));
        await markMessagesRead(chat._id);
      }
    };
    load();
    socket?.emit("join_chat", chat._id);

    return () => {
      socket?.emit("leave_chat", chat._id);
    };
  }, [chat?._id, socket, dispatch]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for incoming real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg) => {
      if (msg.chatId === chat?._id) {
        dispatch(addMessage({
          ...msg,
          _id: `temp-${Date.now()}`,
          createdAt: msg.createdAt || new Date(),
        }));
      }
    };

    socket.on("receive_message", handleReceive);
    return () => socket.off("receive_message", handleReceive);
  }, [socket, chat?._id, dispatch]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInput = (e) => {
    setInput(e.target.value);

    // Typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit("typing_start", {
        chatId: chat._id,
        receiverId: otherUser?._id,
      });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit("typing_stop", {
        chatId: chat._id,
        receiverId: otherUser?._id,
      });
    }, 2000);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !chat?._id) return;

    setInput("");
    setIsTyping(false);
    clearTimeout(typingTimeoutRef.current);
    socket?.emit("typing_stop", { chatId: chat._id, receiverId: otherUser?._id });

    // Optimistically add to UI
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      chatId: chat._id,
      sender: currentUserId,
      text,
      createdAt: new Date().toISOString(),
      read: false,
    };
    dispatch(addMessage(tempMsg));
    scrollToBottom();

    const res = await sendMessage(chat._id, text);
    if (!res.success) {
      toast.error("Failed to send message");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherUserName = otherUser
    ? `${otherUser.firstname} ${otherUser.lastname}`
    : "Chat";

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border/20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-glass/30 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="relative">
            {otherUser?.profilepic ? (
              <img
                src={otherUser.profilepic}
                alt={otherUserName}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-glass/30 flex items-center justify-center text-foreground text-sm font-bold">
                {otherUser?.firstname?.[0] || "?"}
              </div>
            )}
            {otherUser?.isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{otherUserName}</p>
            <p className="text-xs text-muted-foreground">
              {otherUser?.isOnline ? "Online" : otherUser?.lastSeen
                ? `Last seen ${new Date(otherUser.lastSeen).toLocaleString()}`
                : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button className="p-2 rounded-lg hover:bg-glass/30 transition-colors">
            <Phone className="h-4 w-4 text-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-glass/30 transition-colors">
            <Video className="h-4 w-4 text-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-glass/30 transition-colors">
            <MoreVertical className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              No messages yet. Say hi!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              currentUserId={currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-glass-border/20">
        <div className="flex items-end space-x-2">
          <button className="p-2 rounded-lg hover:bg-glass/30 transition-colors flex-shrink-0">
            <Image className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 rounded-2xl bg-glass/20 border border-glass-border/30 text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
              style={{ minHeight: "42px", maxHeight: "120px" }}
            />
          </div>
          <button className="p-2.5 rounded-2xl bg-primary hover:bg-primary/90 transition-colors flex-shrink-0">
            <Send className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.userReducer);
  const { activeChat } = useSelector((s) => s.chatReducer);
  const [chatView, setChatView] = useState(null); // { chat, otherUser }
  const [isMobileList, setIsMobileList] = useState(!chatId);

  useEffect(() => {
    setIsMobileList(!chatView);
  }, [chatView]);

  const handleSelectChat = (chat, otherUser) => {
    dispatch(setActiveChat(chat));
    setChatView({ chat, otherUser });
    navigate(`/chat/${chat._id}`);
    setIsMobileList(false);
  };

  const handleBack = () => {
    setChatView(null);
    dispatch(setActiveChat(null));
    navigate("/chat");
    setIsMobileList(true);
  };

  // Mobile: show list OR chat view, not both
  const showChatList = isMobileList || !chatView;
  const showChatView = !isMobileList && chatView;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />
      <div className="absolute inset-0 bg-background/50" />
      <div className="relative z-10 flex h-full w-full">
        {/* Chat List Sidebar */}
        <div
          className={`h-full transition-all duration-300 ${
            showChatList ? "flex-1 max-w-sm" : "hidden md:flex md:flex-1 md:max-w-sm"
          }`}
        >
          <ChatList onSelectChat={handleSelectChat} activeChatId={activeChat?._id} />
        </div>

        {/* Chat View */}
        {showChatView ? (
          <div className="flex-1 flex flex-col min-w-0">
            <ChatView
              chat={chatView.chat}
              otherUser={chatView.otherUser}
              onBack={handleBack}
              currentUserId={user?._id}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-glass/20 border border-glass-border/30 flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                JULO
              </h2>
              <p className="text-muted-foreground text-sm">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;