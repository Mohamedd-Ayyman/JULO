import React, { useEffect, useState, useRef } from "react";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { useSelector, useDispatch } from "react-redux";
import { setUser, logout } from "../../redux/usersSlice.js";
import { updateProfile, uploadAvatar } from "../../apiCalls/users.js";
import { changePassword, logoutUser } from "../../apiCalls/auth.js";
import toast from "react-hot-toast";
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  LogOut,
  Camera,
  Save,
  ChevronRight,
  Globe,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../lib/constants.js";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "password", label: "Password", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "account", label: "Account", icon: LogOut },
];

export default function SettingsPage() {
  const { user } = useSelector((s) => s.userReducer);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [section, setSection] = useState("profile");

  return (
    <AppLayout title="Settings">
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        <div className="hidden lg:block mb-5 animate-fade-in-down">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-2)" }}>Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          {/* Side nav */}
          <nav className="brutal-card p-2 h-fit sticky top-20 hidden sm:block">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={section === s.id
                  ? { background: "var(--paper-3)", color: "var(--ink)" }
                  : { color: "var(--muted-2)" }
                }
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </nav>

          {/* Mobile dropdown selector */}
          <div className="sm:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition"
                style={section === s.id
                  ? { background: "var(--acid)", color: "var(--ink)" }
                  : { background: "var(--paper-2)", color: "var(--muted-2)", border: "1px solid var(--line-soft)" }
                }
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="space-y-4 animate-fade-in" key={section}>
            {section === "profile" && <ProfileSection user={user} dispatch={dispatch} />}
            {section === "password" && <PasswordSection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "appearance" && <AppearanceSection />}
            {section === "privacy" && <PrivacySection />}
            {section === "account" && <AccountSection navigate={navigate} dispatch={dispatch} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ─── Sections ─────────────────────────────────────────────────────────── */

function Card({ title, desc, children }) {
  return (
    <div className="brutal-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold" style={{ color: "var(--ink)" }}>{title}</h2>
        {desc && <p className="text-xs mt-0.5" style={{ color: "var(--muted-2)" }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function ProfileSection({ user, dispatch }) {
  const [profile, setProfile] = useState({
    firstname: user?.firstname || "",
    lastname: user?.lastname || "",
    bio: user?.bio || "",
    location: user?.location || "",
    website: user?.website || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profilepic || null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true);
    let avatarUrl = null;
    if (avatarFile) {
      const up = await uploadAvatar(avatarFile);
      if (up.success) avatarUrl = up.data?.url || up.data;
      else toast.error("Avatar upload failed");
    }
    const res = await updateProfile({ ...profile, ...(avatarUrl ? { profilepic: avatarUrl } : {}) });
    setSaving(false);
    if (res.success) {
      dispatch(setUser({ ...user, ...profile, ...(avatarUrl ? { profilepic: avatarUrl } : {}) }));
      toast.success("Profile updated");
    } else toast.error(res.message || "Update failed");
  };

  return (
    <Card title="Profile" desc="Your public information">
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <Avatar src={previewUrl} name={`${profile.firstname} ${profile.lastname}`} size={88} ring />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 grid place-items-center rounded-full hover:scale-110 transition-transform"
            style={{ background: "var(--acid)", border: "2px solid var(--ink)", boxShadow: "var(--sh-1)" }}
          >
            <Camera className="w-4 h-4" style={{ color: "var(--ink)" }} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>Profile picture</p>
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>PNG, JPG up to 5MB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" value={profile.firstname} onChange={(v) => setProfile({ ...profile, firstname: v })} />
        <Field label="Last name" value={profile.lastname} onChange={(v) => setProfile({ ...profile, lastname: v })} />
      </div>
      <Field label="Bio" value={profile.bio} onChange={(v) => setProfile({ ...profile, bio: v })} multiline className="mt-3" />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="Location" value={profile.location} onChange={(v) => setProfile({ ...profile, location: v })} />
        <Field label="Website" value={profile.website} onChange={(v) => setProfile({ ...profile, website: v })} />
      </div>

      <button onClick={save} disabled={saving} className="brutal-btn brutal-btn-primary mt-5">
        {saving ? <div className="spinner" /> : <Save className="w-4 h-4" />}
        Save changes
      </button>
    </Card>
  );
}

function PasswordSection() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (form.newPassword !== form.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const res = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    setLoading(false);
    if (res.success) {
      toast.success("Password updated");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } else toast.error(res.message || "Failed");
  };

  return (
    <Card title="Password" desc="Choose a strong password unique to JULO">
      <div className="space-y-3">
        <Field type="password" label="Current password" value={form.currentPassword} onChange={(v) => setForm({ ...form, currentPassword: v })} />
        <Field type="password" label="New password" value={form.newPassword} onChange={(v) => setForm({ ...form, newPassword: v })} />
        <Field type="password" label="Confirm new password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} />
      </div>
      <button onClick={submit} disabled={loading} className="brutal-btn brutal-btn-primary mt-5">
        {loading ? <div className="spinner" /> : <Lock className="w-4 h-4" />}
        Update password
      </button>
    </Card>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    messages: true,
    comments: true,
    likes: true,
    follows: true,
    mentions: true,
    marketing: false,
  });

  return (
    <Card title="Notifications" desc="Choose what you want to be notified about">
      <div className="divide-y" style={{ borderColor: "var(--line-soft)" }}>
        {Object.keys(prefs).map((k) => (
          <Toggle
            key={k}
            label={k[0].toUpperCase() + k.slice(1)}
            desc={DESCS[k]}
            checked={prefs[k]}
            onChange={(v) => setPrefs((p) => ({ ...p, [k]: v }))}
          />
        ))}
      </div>
    </Card>
  );
}

const DESCS = {
  messages: "Direct messages from other users",
  comments: "When someone comments on your posts",
  likes: "When someone likes your content",
  follows: "When someone starts following you",
  mentions: "When someone @mentions you",
  marketing: "Tips, product updates and offers",
};

function AppearanceSection() {
  return (
    <Card title="Appearance" desc="Customize how JULO looks for you">
      <div className="grid grid-cols-3 gap-3">
        {["Dark", "Midnight", "Aurora"].map((t, i) => (
          <button
            key={t}
            className="brutal-card p-4 text-center transition-all"
            style={i === 0 ? { borderColor: "var(--ink)" } : undefined}
          >
            <div
              className="h-16 rounded-lg mb-2"
              style={{
                background: i === 0
                  ? "linear-gradient(135deg, #07060f, #1a1830)"
                  : i === 1
                  ? "linear-gradient(135deg, #0d0b1f, #6c5ce7)"
                  : "linear-gradient(135deg, #22d3ee, #f472b6)",
              }}
            />
            <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{t}</p>
          </button>
        ))}
      </div>
      <Toggle label="Reduced motion" desc="Minimize animations across the app" checked={false} onChange={() => {}} className="mt-5" />
    </Card>
  );
}

function PrivacySection() {
  return (
    <Card title="Privacy" desc="Control who can see and contact you">
      <div className="divide-y" style={{ borderColor: "var(--line-soft)" }}>
        <Toggle label="Private account" desc="Only approved followers can see your posts" checked={false} onChange={() => {}} />
        <Toggle label="Show online status" desc="Let others see when you're active" checked={true} onChange={() => {}} />
        <Toggle label="Allow message requests" desc="Receive messages from users you don't follow" checked={true} onChange={() => {}} />
      </div>
    </Card>
  );
}

function AccountSection({ navigate, dispatch }) {
  const handleLogout = async () => {
    await logoutUser();
    dispatch(logout());
    navigate(ROUTES.LOGIN);
    toast.success("Signed out");
  };

  return (
    <>
      <Card title="Language & region">
        <button className="w-full flex items-center justify-between py-3 px-1 text-sm">
          <span className="flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <Globe className="w-4 h-4" style={{ color: "var(--muted-2)" }} /> English (US)
          </span>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--muted-2)" }} />
        </button>
      </Card>

      <Card title="Account actions" desc="Sign out or delete your account">
        <div className="space-y-3">
          <button onClick={handleLogout} className="brutal-btn brutal-btn-ghost w-full justify-start">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
          <button
            className="brutal-btn w-full justify-start"
            style={{
              color: "var(--paper)",
              background: "var(--riso-red)",
              border: "2px solid var(--ink)",
              boxShadow: "3px 3px 0 0 var(--ink)",
            }}
          >
            <Trash2 className="w-4 h-4" /> Delete account
          </button>
        </div>
      </Card>
    </>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function Field({ label, value, onChange, type = "text", multiline, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted-2)" }}>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className="brutal-input" rows={3} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="brutal-input" />
      )}
    </label>
  );
}

function Toggle({ label, desc, checked, onChange, className = "" }) {
  return (
    <div className={`flex items-center justify-between py-3 ${className}`}>
      <div className="pr-4">
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: "var(--muted-2)" }}>{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
        style={checked
          ? { background: "var(--acid)", boxShadow: "var(--sh-1)", border: "2px solid var(--ink)" }
          : { background: "var(--paper-2)", border: "2px solid var(--line)" }
        }
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
          style={{ background: "var(--paper)", border: "2px solid var(--ink)" }}
        />
      </button>
    </div>
  );
}
