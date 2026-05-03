import React, { useEffect, useState, useRef } from "react";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { useSelector, useDispatch } from "react-redux";
import { setUser, updateUserAvatar } from "../../redux/usersSlice.js";
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
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          {/* Side nav */}
          <nav className="card p-2 h-fit sticky top-20 hidden sm:block">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  section === s.id
                    ? "bg-glass-hover text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-glass-hover"
                }`}
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
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                  section === s.id
                    ? "bg-gradient-primary text-white"
                    : "bg-glass text-muted-foreground"
                }`}
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
    <div className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", multiline, className = "", error, hint }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`textarea ${error ? "border-error" : ""}`} rows={3} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={`input ${error ? "border-error" : ""}`} />
      )}
      {hint && !error && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {error && <p className="text-xs text-error mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </label>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${
          checked ? "bg-gradient-primary glow-primary-soft" : "bg-glass-hover border border-glass-border"
        }`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function StatusBadge({ success, message }) {
  if (!message) return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${success ? "text-success" : "text-error"}`}>
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
        const formData = new FormData();
        formData.append("image", avatarFile);
        const res = await fetch("/api/upload/avatar", {
          method: "POST",
          headers: { authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData,
        }).then((r) => r.json());
        if (res.success) avatarUrl = res.url;
        else { toast.error("Avatar upload failed"); setSaving(false); return; }
      }

      let coverUrl;
      if (coverFile) {
        const formData = new FormData();
        formData.append("image", coverFile);
        const res = await fetch("/api/upload/cover", {
          method: "POST",
          headers: { authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData,
        }).then((r) => r.json());
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
              className="absolute bottom-0 right-0 w-9 h-9 grid place-items-center rounded-full bg-gradient-primary glow-primary-soft border-2 border-background hover:scale-110 transition-transform"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Profile picture</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP — max 5MB</p>
            {avatarFile && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-accent">Selected: {avatarFile.name}</span>
                <button onClick={() => { setAvatarFile(null); setAvatarPreview(user?.profilepic || null); }} className="text-xs text-muted-foreground hover:text-error">×</button>
              </div>
            )}
          </div>
        </div>

        {/* Cover */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Cover image</p>
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="w-full h-24 rounded-lg border border-glass-border hover:border-glass-border-strong transition-all bg-glass-bg overflow-hidden relative group"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                <Globe2 className="w-5 h-5" />
                <span className="text-xs">Add cover image</span>
              </div>
            )}
          </button>
          <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
          {coverFile && <p className="text-xs text-accent mt-1">Selected: {coverFile.name}</p>}
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

      <div className="flex items-center justify-between">
        <div />
        <button onClick={save} disabled={saving} className="btn btn-primary">
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
        <button onClick={handleEmailChange} disabled={changingEmail || !emailForm.email} className="btn btn-glass mt-3">
          {changingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Update email
        </button>
        {emailSuccess && <div className="flex items-center gap-1.5 text-xs text-success mt-2"><CheckCircle2 className="w-3.5 h-3.5" />Email updated successfully</div>}
      </Card>

      <Card title="Language & region">
        <button className="w-full flex items-center justify-between py-3 px-1 text-sm">
          <span className="flex items-center gap-2 text-foreground"><Globe className="w-4 h-4 text-muted-foreground" /> English (US)</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </Card>

      <Card title="Account actions">
        <div className="space-y-3">
          <button onClick={handleLogout} className="btn btn-glass w-full justify-start">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
          <button onClick={handleDeactivate} disabled={deactivating} className="btn btn-glass w-full justify-start text-warning" style={{ color: "var(--color-warning)" }}>
            <EyeOff className="w-4 h-4" /> {deactivating ? "Deactivating..." : "Deactivate account"}
          </button>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="btn w-full justify-start text-error" style={{ color: "var(--color-error)", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <Trash2 className="w-4 h-4" /> Delete account
            </button>
          ) : (
            <div className="p-4 rounded-lg border border-error/30 bg-error/5 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-error">This is permanent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All your posts, messages, and data will be permanently deleted. This cannot be undone.</p>
                </div>
              </div>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="input"
              />
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} disabled={deleting} className="btn btn-danger flex-1">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete forever
                </button>
                <button onClick={() => { setDeleteConfirm(false); setDeletePassword(""); }} className="btn btn-glass">
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
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Current password</label>
          <input
            type={showCurrent ? "text" : "password"}
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            className="input pr-10"
          />
          <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-7 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">New password</label>
          <input
            type={showNew ? "text" : "password"}
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="input pr-10"
          />
          <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-7 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
      <button onClick={submit} disabled={loading} className="btn btn-primary mt-5">
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
      <div className="divide-y divide-glass-border">
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
        <p className="text-xs font-semibold text-muted-foreground mb-2">Who can see your stories</p>
        <div className="grid grid-cols-3 gap-2">
          {["everyone", "followers", "close_friends"].map((opt) => (
            <button
              key={opt}
              onClick={() => setPrefs((p) => ({ ...p, storyVisibility: opt }))}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                prefs.storyVisibility === opt
                  ? "border-glass-border-strong bg-glass-hover text-foreground"
                  : "border-glass-border text-muted-foreground hover:border-glass-border-strong"
              }`}
            >
              {opt.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn btn-primary mt-5">
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
      <div className="divide-y divide-glass-border">
        {Object.keys(prefs).map((k) => {
          const Icon = ICONS[k] || Bell;
          return (
            <div key={k} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k === "marketing" ? "bg-warning/10 text-warning" : "bg-glass-bg text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{k[0].toUpperCase() + k.slice(1)}</p>
                  <p className="text-xs text-muted-foreground">{NOTIF_DESCS[k]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
                role="switch"
                aria-checked={prefs[k]}
                className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${
                  prefs[k] ? "bg-gradient-primary glow-primary-soft" : "bg-glass-hover border border-glass-border"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${prefs[k] ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={save} disabled={saving} className="btn btn-primary mt-5">
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
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-glass-bg">
                <div className="w-10 h-10 rounded-lg skeleton" />
                <div className="flex-1"><div className="h-3 w-32 rounded skeleton mb-1.5" /><div className="h-2.5 w-48 rounded skeleton" /></div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No active sessions found</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((sess) => {
              const Icon = DeviceIcon(sess.deviceType);
              const isCurrent = sess.isCurrent || sess._id === sessions[0]?._id;
              return (
                <div key={sess._id} className={`flex items-center gap-3 p-3 rounded-lg bg-glass-bg ${isCurrent ? "border border-glass-border-strong" : ""}`}>
                  <div className="w-10 h-10 rounded-lg bg-glass flex items-center justify-center text-muted-foreground">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{sess.deviceType || "Unknown device"}</p>
                      {isCurrent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-primary text-white flex-shrink-0">This device</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {sess.ip || "Unknown location"} {sess.createdAt ? `· ${new Date(sess.createdAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => revokeSession(sess._id)}
                      disabled={revoking === sess._id}
                      className="text-xs text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
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
          <button onClick={revokeOthers} disabled={revokingAll} className="btn btn-glass w-full mt-4">
            {revokingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sign out all other devices
          </button>
        )}
      </Card>

      <Card title="Password & security">
        <p className="text-sm text-muted-foreground">To change your password, use the Password section in settings.</p>
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
    () => localStorage.getItem("julo_theme") || "dark",
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
      id: "dark",
      label: "Dark",
      colors: ["#07060f", "#1a1830", "#8b7cff"],
    },
    {
      id: "midnight",
      label: "Midnight",
      colors: ["#0d0b1f", "#1e1b4b", "#6c5ce7"],
    },
    {
      id: "aurora",
      label: "Aurora",
      colors: ["#0f1729", "#22d3ee", "#f472b6"],
    },
  ];

  return (
    <Card title="Appearance" desc="Customise how JULO looks for you">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Theme
      </p>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTheme(t.id)}
            className={`card p-3 text-center transition-all ${
              theme === t.id
                ? "border-glass-border-strong glow-primary-soft"
                : "hover-lift"
            }`}
            aria-pressed={theme === t.id}
          >
            <div className="flex gap-1 justify-center mb-2">
              {t.colors.map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-glass-border"
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-foreground">{t.label}</p>
            {theme === t.id && (
              <CheckCircle2 className="w-4 h-4 text-primary mx-auto mt-1" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-glass-border">
        <Toggle
          label="Reduced motion"
          desc="Minimise animations and transitions across JULO"
          checked={reducedMotion}
          onChange={applyMotion}
        />
        {storedMotion === null && systemReduced && (
          <p className="text-xs text-muted-foreground -mt-1">
            Following your system preference. Toggle to override.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Theme and motion preferences are saved to this browser and will persist across sessions.
      </p>
    </Card>
  );
}
