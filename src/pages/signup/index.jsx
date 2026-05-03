import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../../apiCalls/auth.js";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/usersSlice.js";
import { useSocket } from "../../context/SocketContext.jsx";
import toast from "react-hot-toast";
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
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
    if (res.success) {
      dispatch(setUser(res.data.user));
      localStorage.setItem("token", res.data.token);
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
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={form.firstname} onChange={update("firstname")} placeholder="First name" className="input pl-11" required />
          </div>
          <div className="relative">
            <input value={form.lastname} onChange={update("lastname")} placeholder="Last name" className="input" required />
          </div>
        </div>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" className="input pl-11" required />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={update("password")}
            placeholder="Password (min 6 chars)"
            className="input pl-11 pr-10"
            minLength={6}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          By signing up, you agree to our{" "}
          <span className="text-primary story-link">Terms</span> and{" "}
          <span className="text-primary story-link">Privacy Policy</span>.
        </p>

        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>Create account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-semibold story-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
