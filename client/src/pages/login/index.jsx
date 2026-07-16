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
    if (res.success && res.user) {
      dispatch(setUser(res.user));
      localStorage.setItem("token", res.token);
      connectSocket();
      toast.success(`Welcome back, ${res.user.firstname}!`);
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
          <label className="flex items-center gap-2 font-mono text-[11px] cursor-pointer" style={{ color: "var(--muted-2)" }}>
            <input
              type="checkbox"
              className="accent-[var(--ink)]"
              style={{ accentColor: "var(--ink)" }}
            />
            Remember me
          </label>
          <button type="button" className="font-mono text-[11px] font-bold story-link" style={{ color: "var(--ink)" }}>
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={loading} className="brutal-btn brutal-btn-primary w-full py-3" style={{ fontSize: 15 }}>
          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              Sign in <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--line-soft)" }} />
        <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>OR</span>
        <div className="flex-1 h-px" style={{ background: "var(--line-soft)" }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="brutal-btn brutal-btn-outline" disabled>
          <span className="text-lg font-bold">G</span> Google
        </button>
        <button className="brutal-btn brutal-btn-outline" disabled>
          <span className="text-lg">✦</span> Apple
        </button>
      </div>

      <p className="text-center font-mono text-[11px] mt-8" style={{ color: "var(--muted-2)" }}>
        New to JULO?{" "}
        <Link to="/signup" className="font-bold story-link" style={{ color: "var(--ink)" }}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ icon: Icon, rightIcon: RightIcon, onRightClick, ...rest }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-2)" }} />}
      <input
        {...rest}
        onChange={(e) => rest.onChange(e.target.value)}
        className="brutal-input pl-11 pr-10"
        style={{ paddingTop: 11, paddingBottom: 11 }}
        required
      />
      {RightIcon && (
        <button
          type="button"
          onClick={onRightClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs"
          style={{ color: "var(--muted-2)" }}
        >
          <RightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}