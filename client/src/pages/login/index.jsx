import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import moonImg from "../../assets/images/futuristic-moon-background.jpg";
import { loginUser } from "../../apiCalls/auth";
import toast from "react-hot-toast";
import { hideLoader, showLoader } from "../../redux/loaderSlice";
import { useDispatch } from "react-redux";

function Login() {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let response = null;

    try {
      dispatch(showLoader());
      response = await loginUser(user);
      dispatch(hideLoader());
      if (response.success) {
        toast.success(response.message);
        localStorage.setItem("token", response.token);
        navigate("/");
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      dispatch(showLoader());
      toast.error(error);
      dispatch(hideLoader());
    }
  };
  return (
    <div
      className="w-screen h-screen flex justify-center items-center min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: `url(${moonImg})`,
      }}
    >
      <div className="w-[420px] bg-transparent border-2 border-dashed border-white/20 rounded-xl p-8 backdrop-blur-md shadow-xl">
        <form onSubmit={handleSubmit}>
          <h1 className="text-white text-3xl font-semibold text-center mb-6">
            Login
          </h1>

          <div className="relative w-full h-12 mb-6">
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={user.email}
              onChange={handleChange}
              className="w-full h-full px-5 pr-12 bg-transparent border-2 border-white/20 rounded-full text-white placeholder-white focus:outline-none focus:border-white text-base"
            />
            <i className="bx bxs-user absolute right-4 top-1/2 -translate-y-1/2 text-xl text-white"></i>
          </div>

          <div className="relative w-full h-12 mb-4">
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              value={user.password}
              onChange={handleChange}
              className="w-full h-full px-5 pr-12 bg-transparent border-2 border-white/20 rounded-full text-white placeholder-white focus:outline-none focus:border-white text-base"
            />
            <i className="bx bx-lock-alt absolute right-4 top-1/2 -translate-y-1/2 text-xl text-white"></i>
          </div>

          <div className="flex justify-between items-center text-white text-sm mb-5">
            <a href="#" className="hover:underline">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-white/10 border-2 border-white/20 rounded-full text-white text-lg font-semibold shadow-md hover:bg-white/20 transition duration-300"
          >
            Login
          </button>

          <div className="text-center text-white mt-5">
            <p>
              Don't have an account?{" "}
              <Link to="/signup" className="hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
