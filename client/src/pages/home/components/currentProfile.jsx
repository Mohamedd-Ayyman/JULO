import React from "react";
import { LogOut, UserCircle } from "lucide-react";

const CurrentUserProfile = ({ user }) => {
  return (
    <div className="border-t border-glass-border/20 p-4">
      <div className="flex items-center space-x-3">
        {user?.profilepic ? (
          <img
            src={user.profilepic}
            alt="Profile"
            className="w-9 h-9 rounded-full border-2 border-glass-border/30 object-cover flex-shrink-0"
          />
        ) : (
          <UserCircle className="h-9 w-9 text-muted-foreground flex-shrink-0" />
        )}
        <div className="overflow-hidden flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.firstname} {user?.lastname}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>
        <button className="text-muted-foreground hover:text-red-400 transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default CurrentUserProfile;
