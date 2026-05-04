import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import getLoggedUser from "../../apiCalls/users.js";
import heroBackground from "../../assets/images/futuristic-moon-background.jpg";
import Header from "./components/header.jsx";
import Sidebar from "./components/sidebar.jsx";
import UserDashboard from "./components/dashboard.jsx";
import QuickActions from "./components/actions.jsx";
import Timer from "../../components/timer.jsx";
import { setUser } from "../../redux/usersSlice.js";
import { hideLoader, showLoader } from "../../redux/loaderSlice.js";
import toast from "react-hot-toast";

const Home = () => {
  const { user } = useSelector((state) => state.userReducer);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        dispatch(showLoader());
        const response = await getLoggedUser();
        dispatch(hideLoader());
        const fetchedUser =
          response.data?.user || response.user || response.data;

        if (fetchedUser) {
          dispatch(setUser(fetchedUser));
        }
      } catch {
        toast.error("Failed to fetch user data");
        dispatch(hideLoader());
      }
    };

    fetchUserData();
  }, [dispatch]);

  if (!user) {
    return (
      <div className="min-h-screen w-screen bg-background relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBackground})` }}
        />
        <div className="absolute inset-0 bg-background/40" />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="backdrop-blur-xl bg-glass/10 border border-glass-border/20 rounded-3xl p-8 text-center">
            <p className="text-foreground">Failed to load user data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat w-full"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />
      <div className="absolute inset-0 bg-background/40" />

      <div className="relative z-10 min-h-screen w-full overflow-x-hidden">
        <Sidebar />

        <div className="ml-80 transition-all duration-300">
          <Header />

          <main className="w-full">
            <Timer />
            <UserDashboard userData={user} />
            <QuickActions />
          </main>

          <footer className="p-6 text-center flex-shrink-0">
            <p className="text-muted-foreground">
              © 2026 Quick-chat. Experience the future of communication.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Home;