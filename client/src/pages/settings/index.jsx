import React, { useEffect, useState, useRef } from "react";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { useSelector, useDispatch } from "react-redux";
import { setUser, updateUserAvatar } from "../../redux/usersSlice.js";
import { updateProfile, uploadAvatar, uploadCover } from "../../apiCalls/users.js";
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
  Loader2,
  ChevronRight,
  Globe,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Smartphone,
  Tablet,
  Globe2,
  MessageCircle,
  AtSign,
  Heart,
  UserPlus,
  Star,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../lib/constants.js";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Globe2 },
  { id: "password", label: "Password", icon: Lock },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Monitor },
  { id: "appearance", label: "Appearance", icon: Palette },
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
          <h1 className="font-display text-2xl font-black tracking-tight" style={{ color: "var(--ink)" }}>Settings</h1>
          <p className="font-mono text-[11px] uppercase tracking-widest mt-0.5" style={{ color: "var(--muted-2)" }}>Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          {/* Side nav */}
          <nav className="brutal-card p-2 h-fit sticky top-20 hidden sm:block">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold transition-all"
                style={section === s.id
                  ? { background: "var(--ink)", color: "var(--paper)", borderRadius: "var(--r-sm)", border: "2px solid var(--ink)" }
                  : { color: "var(--muted-2)" }
                }
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </nav>

          {/* Mobile dropdown */}
          <div className="sm:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="flex-shrink-0 font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 transition-all"
                style={{
                  background: section === s.id ? "var(--ink)" : "var(--paper-2)",
                  color: section === s.id ? "var(--paper)" : "var(--ink)",
                  border: "2px solid var(--ink)",
                  borderRadius: "var(--r-sm)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="space-y-4 animate-fade-in" key={section}>
            {section === "profile" && <ProfileSection user={user} dispatch={dispatch} />}
            {section === "account" && <AccountSection navigate={navigate} dispatch={dispatch} />}
            {section === "password" && <PasswordSection />}
            {section === "privacy" && <PrivacySection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "security" && <SecuritySection />}
            {section === "appearance" && <AppearanceSection user={user} dispatch={dispatch} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ─── Shared helpers ─────────────────────────────────────────────────── */

function Card({ title, desc, children, className = "" }) {
  return (
    <div className={`brutal-card p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="font-display text-base font-black" style={{ color: "var(--ink)" }}>{title}</h2>
        {desc && <p className="font-mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "var(--muted-2)" }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", multiline, className = "", error, hint }) {
  return (
    <label className={`block ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: "var(--muted-2)" }}>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`brutal-input ${error ? "" : ""}`} rows={3} style={{ resize: "none" }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="brutal-input" />
      )}
      {hint && !error && <p className="font-mono text-[10px] mt-1" style={{ color: "var(--muted-2)" }}>{hint}</p>}
      {error && <p className="font-mono text-[10px] mt-1 flex items-center gap-1" style={{ color: "var(--riso-red)" }}><AlertCircle className="w-3 h-3" />{error}</p>}
    </label>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--line-soft)" }}>
      <div className="pr-4">
        <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{label}</p>
        {desc && <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--muted-2)" }}>{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className="relative w-11 h-6 flex-shrink-0 transition-all"
        style={{
          background: checked ? "var(--ink)" : "var(--paper-2)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--r-pill)",
          cursor: "pointer",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 transition-all"
          style={{
            background: "var(--paper)",
            borderRadius: "50%",
            left: checked ? 22 : 2,
            border: "2px solid var(--ink)",
          }}
        />
      </button>
    </div>
  );
}

function StatusBadge({ success, message }) {
  if (!message) return null;
  return (
    <div className={`flex items-center gap-1.5 font-mono text-[10px] font-bold ${success ? "" : ""}`} style={success ? { color: "var(--acid)" } : { color: "var(--riso-red)" }}>
      {success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      {message}
    </div>
  );
}

/* ─── Profile section ───────────────────────────────────────────────── */

function ProfileSection({ user, dispatch }) {
  const fullName = `${user?.firstname || ""} ${user?.lastname || ""}`.trim();
  const [form, setForm] = useState({
    firstname: user?.firstname || "",
    lastname: user?.lastname || "",
    bio: user?.bio || "",
    location: user?.location || "",
    website: user?.website || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.profilepic || null);
  const [coverPreview, setCoverPreview] = useState(user?.coverImage || null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ success: false, message: "" });
  const avatarRef = useRef(null);
  const coverRef = useRef(null);

  // Update form when user loads
  useEffect(() => {
    setForm({
      firstname: user?.firstname || "",
      lastname: user?.lastname || "",
      bio: user?.bio || "",
      location: user?.location || "",
      website: user?.website || "",
    });
    setAvatarPreview(user?.profilepic || null);
    setCoverPreview(user?.coverImage || null);
  }, [user?._id]);

  const handleAvatarFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Avatar must be under 5MB"); return; }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleCoverFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Cover must be under 10MB"); return; }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true);
    setStatus({ success: false, message: "" });
    try {
      let avatarUrl;
      if (avatarFile) {
        const res = await uploadAvatar(avatarFile);
        if (res.success) avatarUrl = res.url;
        else {
          toast.error(res.message || "Avatar upload failed");
          setSaving(false);
          return;
        }
      }

      let coverUrl;
      if (coverFile) {
        const res = await uploadCover(coverFile);
        if (res.success) coverUrl = res.url;
      }

      const payload = {
        ...form,
        ...(avatarUrl ? { profilepic: avatarUrl } : {}),
        ...(coverUrl ? { coverImage: coverUrl } : {}),
      };

      const res = await updateProfile(payload);
      setSaving(false);
      if (res.success) {
        const updated = res.data;
        if (avatarUrl) dispatch(updateUserAvatar(avatarUrl));
        dispatch(setUser({ ...user, ...updated }));
        setStatus({ success: true, message: "Profile updated" });
        toast.success("Profile saved");
      } else {
        setStatus({ success: false, message: res.message || "Update failed" });
        toast.error(res.message || "Update failed");
      }
    } catch {
      setSaving(false);
      setStatus({ success: false, message: "Network error — please try again" });
      toast.error("Network error");
    }
  };

  const field = (key) => ({ value: form[key], onChange: (v) => setForm({ ...form, [key]: v }) });

  return (
    <>
      <Card title="Profile photo & cover">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <Avatar src={avatarPreview} name={fullName} size={88} ring />
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 grid place-items-center"
              style={{ background: "var(--acid)", color: "var(--ink)", border: "2px solid var(--ink)", borderRadius: "50%", cursor: "pointer" }}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>Profile picture</p>
            <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>PNG, JPG, WebP — max 5MB</p>
            {avatarFile && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-mono text-[10px]" style={{ color: "var(--acid)" }}>Selected: {avatarFile.name}</span>
                <button onClick={() => { setAvatarFile(null); setAvatarPreview(user?.profilepic || null); }} className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>×</button>
              </div>
            )}
          </div>
        </div>

        {/* Cover */}
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "var(--muted-2)" }}>Cover image</p>
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="w-full h-24 transition-all"
            style={{ border: "2px solid var(--line-soft)", background: "var(--paper-2)", borderRadius: "var(--r-md)", overflow: "hidden", cursor: "pointer" }}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                <Globe2 className="w-5 h-5" />
                <span>Add cover image</span>
              </div>
            )}
          </button>
          <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
          {coverFile && <p className="font-mono text-[10px] mt-1" style={{ color: "var(--acid)" }}>Selected: {coverFile.name}</p>}
        </div>

        <StatusBadge success={status.success} message={status.message} />
      </Card>

      <Card title="Personal information">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" {...field("firstname")} />
          <Field label="Last name" {...field("lastname")} />
        </div>
        <Field label="Bio" {...field("bio")} multiline className="mt-3" hint="160 characters max" />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Location" {...field("location")} />
          <Field label="Website" {...field("website")} hint="https://yoursite.com" />
        </div>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <div />
        <button onClick={save} disabled={saving} className="brutal-btn brutal-btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>
    </>
  );
}

/* ─── Account section ────────────────────────────────────────────────── */

function AccountSection({ navigate, dispatch }) {
  const [deactivating, setDeactivating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: "" });
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    dispatch(logout());
    navigate(ROUTES.LOGIN);
    toast.success("Signed out");
  };

  const handleDeactivate = async () => {
    if (!confirm("Deactivating your account hides your profile and content. You can reactivate by logging in. Continue?")) return;
    setDeactivating(true);
    const res = await (await import("../../apiCalls/users.js")).deactivateAccount();
    setDeactivating(false);
    if (res.success) {
      toast.success("Account deactivated — you can log in anytime to reactivate");
      dispatch(logout());
      navigate(ROUTES.LOGIN);
    } else toast.error(res.message || "Could not deactivate");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { toast.error("Enter your password to delete"); return; }
    setDeleting(true);
    const { deleteAccount } = await import("../../apiCalls/users.js");
    const res = await deleteAccount(deletePassword);
    setDeleting(false);
    if (res.success) {
      toast.success("Account permanently deleted");
      dispatch(logout());
      localStorage.clear();
      navigate(ROUTES.SIGNUP);
    } else {
      toast.error(res.message || "Could not delete — check your password");
      setDeleteConfirm(false);
      setDeletePassword("");
    }
  };

  const handleEmailChange = async () => {
    if (!emailForm.email) return;
    setChangingEmail(true);
    const { updateProfile } = await import("../../apiCalls/users.js");
    const res = await updateProfile({ email: emailForm.email });
    setChangingEmail(false);
    if (res.success) {
      setEmailSuccess(true);
      toast.success("Email address updated");
      setEmailForm({ email: "" });
    } else toast.error(res.message || "Could not update email");
  };

  return (
    <>
      <Card title="Email address">
        <Field
          label="New email"
          value={emailForm.email}
          onChange={(v) => { setEmailForm({ email: v }); setEmailSuccess(false); }}
          type="email"
          hint="We'll send a verification link to the new address"
        />
        <button onClick={handleEmailChange} disabled={changingEmail || !emailForm.email} className="brutal-btn mt-3">
          {changingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Update email
        </button>
        {emailSuccess && <div className="flex items-center gap-1.5 font-mono text-[10px] mt-2" style={{ color: "var(--acid)" }}><CheckCircle2 className="w-3.5 h-3.5" />Email updated successfully</div>}
      </Card>

      <Card title="Language & region">
        <button className="w-full flex items-center justify-between py-3 px-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>
          <span className="flex items-center gap-2"><Globe className="w-4 h-4" style={{ color: "var(--muted-2)" }} /> English (US)</span>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--muted-2)" }} />
        </button>
      </Card>

      <Card title="Account actions">
        <div className="space-y-3">
          <button onClick={handleLogout} className="brutal-btn w-full justify-start">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
          <button onClick={handleDeactivate} disabled={deactivating} className="brutal-btn w-full justify-start" style={{ color: "var(--riso-yellow)" }}>
            <EyeOff className="w-4 h-4" /> {deactivating ? "Deactivating..." : "Deactivate account"}
          </button>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="brutal-btn w-full justify-start" style={{ color: "var(--riso-red)", background: "var(--paper-2)", borderColor: "var(--riso-red)" }}>
              <Trash2 className="w-4 h-4" /> Delete account
            </button>
          ) : (
            <div className="p-4 space-y-3" style={{ border: "2px solid var(--riso-red)", background: "var(--paper-2)", borderRadius: "var(--r-md)" }}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--riso-red)" }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--riso-red)" }}>This is permanent</p>
                  <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--muted-2)" }}>All your posts, messages, and data will be permanently deleted. This cannot be undone.</p>
                </div>
              </div>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="brutal-input"
              />
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} disabled={deleting} className="brutal-btn flex-1" style={{ background: "var(--riso-red)", color: "var(--paper)", borderColor: "var(--ink)" }}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete forever
                </button>
                <button onClick={() => { setDeleteConfirm(false); setDeletePassword(""); }} className="brutal-btn">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

/* ─── Password section ───────────────────────────────────────────────── */

function PasswordSection() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ success: false, message: "" });

  const submit = async () => {
    if (!form.currentPassword) { setStatus({ success: false, message: "Enter your current password" }); return; }
    if (!form.newPassword) { setStatus({ success: false, message: "Enter a new password" }); return; }
    if (form.newPassword.length < 8) { setStatus({ success: false, message: "Password must be at least 8 characters" }); return; }
    if (form.newPassword !== form.confirm) { setStatus({ success: false, message: "Passwords don't match" }); return; }
    if (form.newPassword === form.currentPassword) { setStatus({ success: false, message: "New password must be different" }); return; }

    setLoading(true);
    setStatus({ success: false, message: "" });
    const res = await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
    setLoading(false);
    if (res.success) {
      setStatus({ success: true, message: "Password updated — all other sessions were ended" });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password updated");
    } else {
      setStatus({ success: false, message: res.message || "Failed to change password" });
      toast.error(res.message || "Failed to change password");
    }
  };

  return (
    <Card title="Password" desc="Choose a strong password unique to JULO">
      <div className="space-y-3">
        <div className="relative">
          <label className="font-mono text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: "var(--muted-2)" }}>Current password</label>
          <input
            type={showCurrent ? "text" : "password"}
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            className="brutal-input pr-10"
          />
          <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3" style={{ top: 32, color: "var(--muted-2)" }}>
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <label className="font-mono text-[10px] uppercase tracking-widest font-bold mb-1.5 block" style={{ color: "var(--muted-2)" }}>New password</label>
          <input
            type={showNew ? "text" : "password"}
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="brutal-input pr-10"
          />
          <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3" style={{ top: 32, color: "var(--muted-2)" }}>
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Field
          label="Confirm new password"
          value={form.confirm}
          onChange={(v) => setForm({ ...form, confirm: v })}
          type="password"
        />
      </div>
      <StatusBadge success={status.success} message={status.message} />
      <button onClick={submit} disabled={loading} className="brutal-btn brutal-btn-primary mt-5">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        Update password
      </button>
    </Card>
  );
}

/* ─── Privacy section ────────────────────────────────────────────────── */

function PrivacySection() {
  const [prefs, setPrefs] = useState({
    isPrivate: false,
    showOnlineStatus: true,
    allowMessageRequests: true,
    storyVisibility: "everyone",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { updatePrivacySettings } = await import("../../apiCalls/users.js");
    const res = await updatePrivacySettings(prefs);
    setSaving(false);
    if (res.success) toast.success("Privacy settings saved");
    else toast.error(res.message || "Failed to save");
  };

  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <Card title="Privacy" desc="Control who can see and interact with your content">
      <div className="divide-y" style={{ borderTop: "2px solid var(--line-soft)" }}>
        <Toggle
          label="Private account"
          desc="Only approved followers can see your posts and story"
          checked={prefs.isPrivate}
          onChange={() => toggle("isPrivate")}
        />
        <Toggle
          label="Show online status"
          desc="Let others see when you're active on JULO"
          checked={prefs.showOnlineStatus}
          onChange={() => toggle("showOnlineStatus")}
        />
        <Toggle
          label="Allow message requests"
          desc="Receive DMs from people you don't follow"
          checked={prefs.allowMessageRequests}
          onChange={() => toggle("allowMessageRequests")}
        />
      </div>

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "var(--muted-2)" }}>Who can see your stories</p>
        <div className="grid grid-cols-3 gap-2">
          {["everyone", "followers", "close_friends"].map((opt) => (
            <button
              key={opt}
              onClick={() => setPrefs((p) => ({ ...p, storyVisibility: opt }))}
              className="py-2 px-3 font-mono text-[10px] uppercase tracking-widest font-bold transition-all"
              style={{
                background: prefs.storyVisibility === opt ? "var(--ink)" : "var(--paper-2)",
                color: prefs.storyVisibility === opt ? "var(--paper)" : "var(--ink)",
                border: "2px solid var(--ink)",
                borderRadius: "var(--r-sm)",
              }}
            >
              {opt.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="brutal-btn brutal-btn-primary mt-5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save privacy settings
      </button>
    </Card>
  );
}

/* ─── Notifications section ──────────────────────────────────────────── */

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    messages: true,
    comments: true,
    likes: true,
    follows: true,
    mentions: true,
    marketing: false,
  });
  const [saving, setSaving] = useState(false);

  const NOTIF_DESCS = {
    messages: "Direct messages from other users",
    comments: "When someone comments on your posts",
    likes: "When someone reacts to your content",
    follows: "When someone starts following you",
    mentions: "When someone @mentions you in a post or comment",
    marketing: "Product updates, tips, and special offers from JULO",
  };

  const ICONS = { messages: MessageCircle, comments: AtSign, likes: Heart, follows: UserPlus, mentions: AtSign, marketing: Star };

  const save = async () => {
    setSaving(true);
    const { updateNotificationPrefs } = await import("../../apiCalls/users.js");
    const res = await updateNotificationPrefs(prefs);
    setSaving(false);
    if (res.success) toast.success("Notification preferences saved");
    else toast.error(res.message || "Failed to save");
  };

  return (
    <Card title="Notifications" desc="Choose what you want to be notified about">
      <div className="space-y-0">
        {Object.keys(prefs).map((k) => {
          const Icon = ICONS[k] || Bell;
          return (
            <div key={k} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--line-soft)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 grid place-items-center" style={{ background: "var(--paper-2)", border: "2px solid var(--line-soft)", borderRadius: "var(--r-sm)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--muted-2)" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{k[0].toUpperCase() + k.slice(1)}</p>
                  <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>{NOTIF_DESCS[k]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
                role="switch"
                aria-checked={prefs[k]}
                className="relative w-11 h-6 flex-shrink-0 transition-all"
                style={{
                  background: prefs[k] ? "var(--ink)" : "var(--paper-2)",
                  border: "2px solid var(--ink)",
                  borderRadius: "var(--r-pill)",
                  cursor: "pointer",
                }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 transition-all"
                  style={{
                    background: "var(--paper)",
                    borderRadius: "50%",
                    left: prefs[k] ? 22 : 2,
                    border: "2px solid var(--ink)",
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={save} disabled={saving} className="brutal-btn brutal-btn-primary mt-5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        Save preferences
      </button>
    </Card>
  );
}

/* ─── Security section ────────────────────────────────────────────────── */

function SecuritySection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    (async () => {
      const { getActiveSessions } = await import("../../apiCalls/users.js");
      const res = await getActiveSessions();
      if (res.success) setSessions(res.data || []);
      setLoading(false);
    })();
  }, []);

  const revokeSession = async (sessionId) => {
    setRevoking(sessionId);
    const { revokeSession: revoke } = await import("../../apiCalls/users.js");
    const res = await revoke(sessionId);
    setRevoking(null);
    if (res.success) {
      setSessions((s) => s.filter((sess) => sess._id !== sessionId));
      toast.success("Session ended");
    } else toast.error("Could not end session");
  };

  const revokeOthers = async () => {
    if (!confirm("Sign out all other devices? You'll stay logged in on this one.")) return;
    setRevokingAll(true);
    const { revokeOtherSessions } = await import("../../apiCalls/users.js");
    const res = await revokeOtherSessions();
    setRevokingAll(false);
    if (res.success) setSessions((s) => s.filter((sess) => sess.isCurrent));
    toast.success("All other sessions ended");
  };

  const DeviceIcon = (type) => {
    switch (type) {
      case "mobile": return Smartphone;
      case "tablet": return Tablet;
      case "desktop": return Monitor;
      default: return Monitor;
    }
  };

  return (
    <>
      <Card title="Active sessions" desc="Devices currently signed into your JULO account">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3" style={{ background: "var(--paper-2)", border: "2px solid var(--line-soft)", borderRadius: "var(--r-md)" }}>
                <div className="w-10 h-10 skeleton" style={{ background: "var(--line-soft)", borderRadius: "var(--r-sm)" }} />
                <div className="flex-1"><div className="h-3 w-32 rounded mb-1.5" style={{ background: "var(--line-soft)", borderRadius: 4 }} /><div className="h-2.5 w-48 rounded" style={{ background: "var(--line-soft)", borderRadius: 4 }} /></div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="font-mono text-[11px] text-center py-4" style={{ color: "var(--muted-2)" }}>No active sessions found</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((sess) => {
              const Icon = DeviceIcon(sess.deviceType);
              const isCurrent = sess.isCurrent || sess._id === sessions[0]?._id;
              return (
                <div key={sess._id} className="flex items-center gap-3 p-3" style={{ background: "var(--paper-2)", border: isCurrent ? "2px solid var(--acid)" : "2px solid var(--line-soft)", borderRadius: "var(--r-md)" }}>
                  <div className="w-10 h-10 grid place-items-center" style={{ background: "var(--paper)", border: "2px solid var(--line-soft)", borderRadius: "var(--r-sm)" }}>
                    <Icon className="w-5 h-5" style={{ color: "var(--muted-2)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{sess.deviceType || "Unknown device"}</p>
                      {isCurrent && <span className="font-mono text-[10px] font-bold px-2 py-0.5 flex-shrink-0" style={{ background: "var(--acid)", color: "var(--ink)", border: "2px solid var(--ink)" }}>This device</span>}
                    </div>
                    <p className="font-mono text-[10px] truncate" style={{ color: "var(--muted-2)" }}>
                      {sess.ip || "Unknown location"} {sess.createdAt ? `· ${new Date(sess.createdAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => revokeSession(sess._id)}
                      disabled={revoking === sess._id}
                      className="font-mono text-[10px] font-bold px-3 py-1.5 transition-colors flex-shrink-0"
                      style={{ background: "var(--paper-2)", color: "var(--riso-red)", border: "2px solid var(--riso-red)", borderRadius: "var(--r-sm)" }}
                    >
                      {revoking === sess._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign out"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {sessions.length > 1 && (
          <button onClick={revokeOthers} disabled={revokingAll} className="brutal-btn w-full mt-4">
            {revokingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sign out all other devices
          </button>
        )}
      </Card>

      <Card title="Password & security">
        <p className="font-mono text-[11px]" style={{ color: "var(--muted-2)" }}>To change your password, use the Password section in settings.</p>
      </Card>
    </>
  );
}

/* ─── Appearance section ──────────────────────────────────────────────── */

function AppearanceSection() {
  const systemReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const storedMotion = localStorage.getItem("julo_reduced_motion");

  const [theme, setTheme] = useState(
    () => localStorage.getItem("julo_theme") || "light",
  );
  const [reducedMotion, setReducedMotion] = useState(
    () => (storedMotion === null ? !!systemReduced : storedMotion === "true"),
  );

  // Ensure DOM reflects current state on mount (in case settings page is opened first)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduced-motion", reducedMotion);
  }, [reducedMotion]);

  const applyTheme = (t) => {
    setTheme(t);
    localStorage.setItem("julo_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    toast.success(`Theme set to ${t.charAt(0).toUpperCase() + t.slice(1)}`);
  };

  const applyMotion = (val) => {
    setReducedMotion(val);
    localStorage.setItem("julo_reduced_motion", String(val));
    document.documentElement.classList.toggle("reduced-motion", val);
  };

  const themes = [
    {
      id: "light",
      label: "Light",
      colors: ["var(--paper)", "var(--paper-2)", "var(--ink)"],
    },
    {
      id: "midnight",
      label: "Midnight",
      colors: ["#0d0b1f", "#1e1b4b", "var(--acid)"],
    },
    {
      id: "ink",
      label: "Ink",
      colors: ["#14110f", "#2a2520", "var(--acid)"],
    },
  ];

  return (
    <Card title="Appearance" desc="Customise how JULO looks for you">
      <p className="font-mono text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "var(--muted-2)" }}>
        Theme
      </p>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTheme(t.id)}
            className="brutal-card p-3 text-center transition-all"
            style={theme === t.id ? { boxShadow: "var(--sh-2)", borderColor: "var(--acid)" } : {}}
            aria-pressed={theme === t.id}
          >
            <div className="flex gap-1 justify-center mb-2">
              {t.colors.map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full"
                  style={{ background: c, border: "2px solid var(--line-soft)" }}
                />
              ))}
            </div>
            <p className="text-xs font-bold" style={{ color: "var(--ink)" }}>{t.label}</p>
            {theme === t.id && (
              <CheckCircle2 className="w-4 h-4 mx-auto mt-1" style={{ color: "var(--acid)" }} />
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--line-soft)" }}>
        <Toggle
          label="Reduced motion"
          desc="Minimise animations and transitions across JULO"
          checked={reducedMotion}
          onChange={applyMotion}
        />
        {storedMotion === null && systemReduced && (
          <p className="font-mono text-[10px] -mt-1" style={{ color: "var(--muted-2)" }}>
            Following your system preference. Toggle to override.
          </p>
        )}
      </div>

      <p className="font-mono text-[10px] mt-3" style={{ color: "var(--muted-2)" }}>
        Theme and motion preferences are saved to this browser and will persist across sessions.
      </p>
    </Card>
  );
}
