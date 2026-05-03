import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../apiCalls/auth.js";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/usersSlice.js";
import { useSocket } from "../../context/SocketContext.jsx";
import toast from "react-hot-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import AuthShell from "../AuthShell.jsx";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { connectSocket } = useSocket();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(form);
    setLoading(false);
    if (res.success) {
      dispatch(setUser(res.data.user));
      localStorage.setItem("token", res.data.token);
      connectSocket();
      toast.success(`Welcome back, ${res.data.user.firstname}!`);
      navigate("/");
    } else toast.error(res.message || "Login failed");
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to JULO">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field
          icon={Mail}
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
        />
        <Field
          icon={Lock}
          type={showPw ? "text" : "password"}
          placeholder="Password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          rightIcon={showPw ? EyeOff : Eye}
          onRightClick={() => setShowPw((v) => !v)}
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
            <input type="checkbox" className="accent-[var(--color-primary)]" />
            Remember me
          </label>
          <button type="button" className="text-primary font-semibold story-link">
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              Sign in <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-glass-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="flex-1 h-px bg-glass-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-glass" disabled>
          <span className="text-base">G</span> Google
        </button>
        <button className="btn btn-glass" disabled>
          <span className="text-base"></span> Apple
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        New to JULO?{" "}
        <Link to="/signup" className="text-primary font-semibold story-link">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ icon: Icon, rightIcon: RightIcon, onRightClick, ...rest }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
      <input {...rest} onChange={(e) => rest.onChange(e.target.value)} className="input pl-11 pr-10" required />
      {RightIcon && (
        <button
          type="button"
          onClick={onRightClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <RightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
