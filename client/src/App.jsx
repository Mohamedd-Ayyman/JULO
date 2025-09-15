import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home/index.jsx";
import SignUp from "./pages/signup/index.jsx";
import Login from "./pages/login/index.jsx";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/protectedRoute.jsx";
import LoadingIndicator from "./components/loaderIndicator.jsx";
import { useSelector } from "react-redux";
function App() {
  const { loader } = useSelector((state) => state.loaderReducer);
  return (
    <div>
      <Toaster position="top-center" reverseOrder={false} />
      {loader && <LoadingIndicator />}
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          ></Route>
          <Route path="/signup" element={<SignUp />}></Route>
          <Route path="/login" element={<Login />}></Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
