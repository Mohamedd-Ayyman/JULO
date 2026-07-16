import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "./components/protectedRoute.jsx";
import LoadingIndicator from "./components/loaderIndicator.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { useDispatch, useSelector } from "react-redux";
import { ROUTES } from "./lib/constants.js";
import { getLoggedUser } from "./apiCalls/users.js";
import { setUser } from "./redux/usersSlice.js";

const Home = lazy(() => import("./pages/home/index.jsx"));
const FeedPage = lazy(() => import("./pages/feed/index.jsx"));
const ChatPage = lazy(() => import("./pages/chat/index.jsx"));
const ExplorePage = lazy(() => import("./pages/explore/index.jsx"));
const NotificationsPage = lazy(() => import("./pages/notifications/index.jsx"));
const ProfilePage = lazy(() => import("./pages/profile/index.jsx"));
const SettingsPage = lazy(() => import("./pages/settings/index.jsx"));
const SignUp = lazy(() => import("./pages/signup/index.jsx"));
const Login = lazy(() => import("./pages/login/index.jsx"));
const NotFoundPage = lazy(() => import("./pages/notFound/index.jsx"));
const PostDetailPage = lazy(() => import("./pages/postDetail/PostDetailPage.jsx"));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="spinner" />
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function AnimatedPage({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function AnimatedRoutes({ authReady }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path={ROUTES.HOME} element={<ProtectedRoute authReady={authReady}><AnimatedPage><Home /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.FEED} element={<ProtectedRoute authReady={authReady}><AnimatedPage><FeedPage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.CHAT} element={<ProtectedRoute authReady={authReady}><AnimatedPage><ChatPage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.CHAT_ID(":chatId")} element={<ProtectedRoute authReady={authReady}><AnimatedPage><ChatPage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.EXPLORE} element={<ProtectedRoute authReady={authReady}><AnimatedPage><ExplorePage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.NOTIFICATIONS} element={<ProtectedRoute authReady={authReady}><AnimatedPage><NotificationsPage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.PROFILE} element={<ProtectedRoute authReady={authReady}><AnimatedPage><ProfilePage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.PROFILE_USER(":userId")} element={<ProtectedRoute authReady={authReady}><AnimatedPage><ProfilePage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.SETTINGS} element={<ProtectedRoute authReady={authReady}><AnimatedPage><SettingsPage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.POST_DETAIL(":postId")} element={<ProtectedRoute authReady={authReady}><AnimatedPage><PostDetailPage /></AnimatedPage></ProtectedRoute>} />
        <Route path={ROUTES.SIGNUP} element={<AnimatedPage><SignUp /></AnimatedPage>} />
        <Route path={ROUTES.LOGIN} element={<AnimatedPage><Login /></AnimatedPage>} />
        <Route path="*" element={<AnimatedPage><NotFoundPage /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { loader } = useSelector((state) => state.loaderReducer);
  const { user } = useSelector((state) => state.userReducer);
  const dispatch = useDispatch();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("julo_theme");
    const theme = storedTheme === "paper" || storedTheme === "light" ? "paper" : "dusk";
    document.documentElement.setAttribute("data-theme", theme);
    if (storedTheme !== theme) localStorage.setItem("julo_theme", theme);

    const storedMotion = localStorage.getItem("julo_reduced_motion");
    const systemPref =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const reduced = storedMotion === null ? systemPref : storedMotion === "true";
    document.documentElement.classList.toggle("reduced-motion", !!reduced);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAuthReady(true);
      return;
    }

    if (user) {
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    const hydrateUser = async () => {
      const res = await getLoggedUser();
      if (cancelled) return;
      if (res.success) {
        dispatch(setUser(res.data));
      } else {
        localStorage.removeItem("token");
      }
      setAuthReady(true);
    };

    hydrateUser();

    return () => {
      cancelled = true;
    };
  }, [dispatch, user]);

  return (
    <ErrorBoundary>
      <Toaster position="top-center" reverseOrder={false} toastOptions={{
        style: {
          background: "var(--paper-2)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--sh-2)",
          backdropFilter: "blur(12px)",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          fontWeight: 500,
        },
      }} />
      {loader && <LoadingIndicator />}
      <SocketProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            {authReady && <AnimatedRoutes authReady={authReady} />}
          </Suspense>
        </BrowserRouter>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;
