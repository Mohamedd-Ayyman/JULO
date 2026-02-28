import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { getAllUsers } from "../../../apiCalls/users.js";
import { MessageCircle, Search,  UserCircle } from "lucide-react";
import CurrentUserProfile from "./currentprofile.jsx";

const Sidebar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const { user } = useSelector((state) => state.userReducer);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers();
        if (response.success) {
          setAllUsers(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const query = searchQuery.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.firstname?.toLowerCase().includes(query) ||
        u.lastname?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [searchQuery, allUsers]);

  return (
    <aside className="fixed top-0 left-0 h-screen z-20 w-80 flex flex-col backdrop-blur-xl bg-glass/10 border-r border-glass-border/20 shadow-lg">
      {/* Logo */}
      <div className="p-4 flex items-center space-x-2 border-b border-glass-border/20">
        <MessageCircle className="h-8 w-8 text-primary flex-shrink-0" />
        <span className="text-xl font-bold text-foreground">ChatFlow</span>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-glass/20 border border-glass-border/30 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            {searchQuery ? "No users found" : "No users yet"}
          </p>
        ) : (
          filteredUsers.map((u) => (
            <button
              key={u._id}
              className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-glass/20 transition-colors text-left"
            >
              {u.profilepic ? (
                <img
                  src={u.profilepic}
                  alt={u.firstname}
                  className="w-10 h-10 rounded-full border-2 border-glass-border/30 object-cover flex-shrink-0"
                />
              ) : (
                <UserCircle className="h-10 w-10 text-muted-foreground flex-shrink-0" />
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {u.firstname} {u.lastname}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.email}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <CurrentUserProfile user={user}></CurrentUserProfile>
    </aside>
  );
};

export default Sidebar;
