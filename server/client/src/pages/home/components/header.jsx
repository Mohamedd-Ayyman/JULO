import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button.tsx";
import { MessageCircle, Bell, Settings } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();
  const [notifCount] = useState(0); // Replace with actual notification count from Redux/API

  return (
    <nav className="p-6 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold text-foreground">ChatFlow</span>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate("/chat")}
          className="p-2 rounded-lg hover:bg-glass/30 transition-colors"
          title="Messages"
        >
          <MessageCircle className="h-5 w-5 text-foreground" />
        </button>
        <button
          className="relative p-2 rounded-lg hover:bg-glass/30 transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>
        <button
          className="p-2 rounded-lg hover:bg-glass/30 transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5 text-foreground" />
        </button>
      </div>
    </nav>
  );
};

export default Header;