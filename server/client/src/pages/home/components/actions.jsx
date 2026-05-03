import { useNavigate } from "react-router-dom";
import { MessageCircle, Users, Search, Settings } from "lucide-react";

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="px-6">
      <div className="backdrop-blur-xl bg-glass/10 border border-glass-border/20 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Get Started with ChatFlow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/chat")}
            className="backdrop-blur-lg bg-glass/5 border border-glass-border/10 rounded-xl p-4 text-center hover:bg-glass/10 transition-all cursor-pointer"
          >
            <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
            <h4 className="text-foreground font-medium text-sm mb-2">
              Start Chatting
            </h4>
            <p className="text-muted-foreground text-xs">
              Begin conversations with friends and family
            </p>
          </button>

          <button
            className="backdrop-blur-lg bg-glass/5 border border-glass-border/10 rounded-xl p-4 text-center hover:bg-glass/10 transition-all cursor-pointer"
          >
            <Users className="h-8 w-8 text-primary mx-auto mb-3" />
            <h4 className="text-foreground font-medium text-sm mb-2">
              Join Groups
            </h4>
            <p className="text-muted-foreground text-xs">
              Connect with communities and teams
            </p>
          </button>

          <button className="backdrop-blur-lg bg-glass/5 border border-glass-border/10 rounded-xl p-4 text-center hover:bg-glass/10 transition-all cursor-pointer">
            <Search className="h-8 w-8 text-primary mx-auto mb-3" />
            <h4 className="text-foreground font-medium text-sm mb-2">
              Find Friends
            </h4>
            <p className="text-muted-foreground text-xs">
              Discover and connect with new people
            </p>
          </button>

          <button className="backdrop-blur-lg bg-glass/5 border border-glass-border/10 rounded-xl p-4 text-center hover:bg-glass/10 transition-all cursor-pointer">
            <Settings className="h-8 w-8 text-primary mx-auto mb-3" />
            <h4 className="text-foreground font-medium text-sm mb-2">
              Customize
            </h4>
            <p className="text-muted-foreground text-xs">
              Personalize your chat experience
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;