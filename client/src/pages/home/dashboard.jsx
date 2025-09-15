import { Button } from "../../components/ui/button.tsx";
import {
  User,
  Mail,
  Calendar,
  Plus,
  Search,
  Edit,
  UserCircle,
} from "lucide-react";

const UserDashboard = ({ userData }) => {
  const getJoinedDate = () => {
    if (!userData?.createdAt) return "Joined recently";

    const joined = new Date(userData.createdAt);
    const today = new Date();

    const isToday =
      joined.getDate() === today.getDate() &&
      joined.getMonth() === today.getMonth() &&
      joined.getFullYear() === today.getFullYear();

    if (isToday) {
      return "Joined today";
    }

    return `Joined ${joined.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  };

  return (
    <div className="w-full px-6 pb-12">
      <div className="mb-8 w-full">
        <div className="w-full backdrop-blur-xl bg-glass/10 border border-glass-border/20 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                {userData.profilepic ? (
                  <img
                    src={userData.profilepic}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-4 border-glass-border/30 object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-glass-border/30 bg-glass/20 flex items-center justify-center shadow-lg">
                    <UserCircle className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Welcome, {userData.firstname} {userData.lastname}! 👋
                </h1>
                <p className="text-muted-foreground text-lg mb-2">
                  Ready to start chatting and connecting with others?
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                  <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 px-3 py-1 rounded-full">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-foreground text-sm">
                        Online now
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
              <Button
                variant="outline"
                className="border-glass-border/50 text-foreground hover:bg-glass/50"
              >
                <Search className="h-4 w-4 mr-2" />
                Find People
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 w-full">
        <div className="backdrop-blur-xl bg-glass/10 border border-glass-border/20 rounded-2xl p-6 shadow-lg w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Personal Info
            </h3>
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm">
                First Name
              </label>
              <p className="text-foreground font-medium">
                {userData.firstname}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground text-sm">Last Name</label>
              <p className="text-foreground font-medium">{userData.lastname}</p>
            </div>
            <Button className="w-full mt-4 bg-glass/20 hover:bg-glass/30 text-foreground border border-glass-border/30">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-glass/10 border border-glass-border/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Contact</h3>
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm">
                Email Address
              </label>
              <p className="text-foreground font-medium break-all">
                {userData.email}
              </p>
            </div>
            <div className="pt-4">
              <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 p-3 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-foreground text-sm">
                    Email Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-glass/10 border border-glass-border/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Account</h3>
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm">
                Member Since
              </label>
              <p className="text-foreground font-medium">{getJoinedDate()}</p>
            </div>
            <div>
              <label className="text-muted-foreground text-sm p-2">
                Account Status
              </label>
              <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 px-3 py-1 rounded-full inline-block mt-1">
                <span className="text-primary text-sm font-medium">
                  Active Member
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
