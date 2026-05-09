import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
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

function App() {
  const { loader } = useSelector((state) => state.loaderReducer);
  const { user } = useSelector((state) => state.userReducer);
  const dispatch = useDispatch();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("julo_theme");
    // Default to "dusk" (cozy warm-dark). Migrate legacy "light"/"midnight"/"ink" labels.
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
        setAuthReady(true);
      } else {
        localStorage.removeItem("token");
        setAuthReady(true);
      }
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
          background: "var(--paper)",
          color: "var(--ink)",
          border: "2px solid var(--ink)",
          boxShadow: "4px 4px 0 0 var(--ink)",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
        },
      }} />
      {loader && <LoadingIndicator />}
      <SocketProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path={ROUTES.HOME} element={<ProtectedRoute authReady={authReady}><Home /></ProtectedRoute>} />
              <Route path={ROUTES.FEED} element={<ProtectedRoute authReady={authReady}><FeedPage /></ProtectedRoute>} />
              <Route path={ROUTES.CHAT} element={<ProtectedRoute authReady={authReady}><ChatPage /></ProtectedRoute>} />
              <Route path={ROUTES.CHAT_ID(":chatId")} element={<ProtectedRoute authReady={authReady}><ChatPage /></ProtectedRoute>} />
              <Route path={ROUTES.EXPLORE} element={<ProtectedRoute authReady={authReady}><ExplorePage /></ProtectedRoute>} />
              <Route path={ROUTES.NOTIFICATIONS} element={<ProtectedRoute authReady={authReady}><NotificationsPage /></ProtectedRoute>} />
              <Route path={ROUTES.PROFILE} element={<ProtectedRoute authReady={authReady}><ProfilePage /></ProtectedRoute>} />
              <Route path={ROUTES.PROFILE_USER(":userId")} element={<ProtectedRoute authReady={authReady}><ProfilePage /></ProtectedRoute>} />
              <Route path={ROUTES.SETTINGS} element={<ProtectedRoute authReady={authReady}><SettingsPage /></ProtectedRoute>} />
              <Route path={ROUTES.POST_DETAIL(":postId")} element={<ProtectedRoute authReady={authReady}><PostDetailPage /></ProtectedRoute>} />
              <Route path={ROUTES.SIGNUP} element={<SignUp />} />
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;