import { Button } from "../../../components/ui/button.tsx";
import { MessageCircle, Bell, Settings } from "lucide-react";

const Header = () => {
  return (
    <nav className="p-6 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold text-foreground">ChatFlow</span>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" className="text-foreground hover:bg-glass/50">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" className="text-foreground hover:bg-glass/50">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  );
};

export default Header;
