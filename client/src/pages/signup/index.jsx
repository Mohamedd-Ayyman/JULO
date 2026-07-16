import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../../apiCalls/auth.js";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/usersSlice.js";
import { useSocket } from "../../context/SocketContext.jsx";
import toast from "react-hot-toast";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import AuthShell from "../AuthShell.jsx";

export default function SignUp() {
  const [form, setForm] = useState({ firstname: "", lastname: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { connectSocket } = useSocket();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await signup(form);
    setLoading(false);
    if (res.success && res.user) {
      dispatch(setUser(res.user));
      localStorage.setItem("token", res.token);
      connectSocket();
      toast.success("Welcome to JULO!");
      navigate("/");
    } else toast.error(res.message || "Signup failed");
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title="Create your account" subtitle="Start sharing in seconds">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input value={form.firstname} onChange={update("firstname")} placeholder="First name" className="brutal-input" required />
          </div>
          <div className="relative">
            <input value={form.lastname} onChange={update("lastname")} placeholder="Last name" className="brutal-input" required />
          </div>
        </div>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40" />
          <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" className="brutal-input pl-11" required />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40" />
          <input
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={update("password")}
            placeholder="Password (min 8 chars)"
            className="brutal-input pl-11 pr-10"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs"
            style={{ color: "var(--muted-2)" }}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-2)" }}>
          By signing up, you agree to our{" "}
          <span className="font-bold story-link">Terms</span> and{" "}
          <span className="font-bold story-link">Privacy Policy</span>.
        </p>

        <button type="submit" disabled={loading} className="brutal-btn brutal-btn-primary w-full py-3" style={{ fontSize: 15 }}>
          {loading ? <div className="spinner" /> : (
            <>Create account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <p className="text-center text-xs mt-8" style={{ color: "var(--muted-2)" }}>
        Already have an account?{" "}
        <Link to="/login" className="font-bold story-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
