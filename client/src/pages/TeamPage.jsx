import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Loader2,
  X,
  Check,
  Trash,
  UserMinus,
} from "lucide-react";
import { teamsAPI, usersAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import clsx from "clsx";

const ROLE_CONFIG = {
  owner: { Icon: Crown, color: "text-amber-500", label: "Owner" },
  admin: { Icon: Shield, color: "text-purple-500", label: "Admin" },
  member: { Icon: Users, color: "text-brand-500", label: "Member" },
  viewer: {
    Icon: Users,
    color: "text-[var(--color-text-muted)]",
    label: "Viewer",
  },
};

export default function TeamPage() {
  const { teamId } = useParams();
  const { user } = useAuthStore();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [removing, setRemoving] = useState(null);

  const safeTeamId = teamId && teamId !== "undefined" ? teamId : null;

  // Load team
  useEffect(() => {
    if (!safeTeamId) {
      setLoading(false);
      return;
    }
    teamsAPI
      .get(safeTeamId)
      .then((r) => setTeam(r.data.team))
      .catch(() => toast.error("Failed to load team"))
      .finally(() => setLoading(false));
  }, [safeTeamId]);

  // Live user search
  useEffect(() => {
    if (!inviteEmail.trim() || inviteEmail.length < 2) {
      setSearchRes([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await usersAPI.search(inviteEmail, safeTeamId);
        const memberIds = (team?.members || []).map((m) => m.user?._id);
        setSearchRes(data.users.filter((u) => !memberIds.includes(u._id)));
      } catch {
        setSearchRes([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [inviteEmail, safeTeamId, team]);

  const refreshTeam = async () => {
    const r = await teamsAPI.get(safeTeamId);
    setTeam(r.data.team);
  };

  const handleInvite = async (emailOverride) => {
    const email = (emailOverride || inviteEmail).trim();
    if (!email) return;
    setInviting(true);
    try {
      await teamsAPI.invite(safeTeamId, { email, role: inviteRole });
      await refreshTeam();
      setInviteEmail("");
      setSearchRes([]);
      setShowInvite(false);
      toast.success(`${email} added to team!`);
    } catch (err) {
      const msg = err.response?.data?.error || "Invite failed";
      if (msg.includes("not found") || msg.includes("No account")) {
        toast.error(`No account for "${email}". Ask them to register first.`);
      } else if (msg.includes("Already")) {
        toast.error("This person is already a member.");
      } else {
        toast.error(msg);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    setRemoving(memberId);
    try {
      await teamsAPI.removeMember(safeTeamId, memberId);
      await refreshTeam();
      toast.success(`${memberName} removed`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove");
    } finally {
      setRemoving(null);
    }
  };

  // ── Render guards ─────────────────────────────────────────
  if (!safeTeamId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)]">
        <Users size={32} className="opacity-40" />
        <p className="text-sm">No team selected.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        Team not found
      </div>
    );
  }

  const myRole = team.members?.find((m) => m.user?._id === user?._id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  const SEEDED = ["sarah@taskflow.ai", "john@taskflow.ai", "maria@taskflow.ai"];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
            <Users size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{team.name}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {team.members?.length} member
              {team.members?.length !== 1 ? "s" : ""}
              {myRole && (
                <span className="ml-2 text-xs text-brand-500 font-medium capitalize">
                  · You are {myRole}
                </span>
              )}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite((v) => !v)}
            className="btn-primary text-sm"
          >
            <UserPlus size={14} />
            {showInvite ? "Cancel" : "Invite Member"}
          </button>
        )}
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-medium">Invite by email</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            The person must already have a TaskFlow account.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
              />
              <input
                autoFocus
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                placeholder="email@example.com"
                className="input pl-9 text-sm"
              />
              {searching && (
                <Loader2
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-subtle)]"
                />
              )}
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="input text-sm w-28"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => handleInvite()}
              disabled={!inviteEmail.trim() || inviting}
              className="btn-primary text-sm"
            >
              {inviting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Invite"
              )}
            </button>
          </div>

          {/* Search suggestions */}
          {searchRes.length > 0 && (
            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
              {searchRes.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleInvite(u.email)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-hover)] transition-colors text-left border-b border-[var(--color-border)] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {u.email}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-brand-500 text-xs">
                    <Check size={13} /> Add
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Quick add seeded accounts */}
          <div>
            <p className="text-xs text-[var(--color-text-subtle)] mb-2">
              Quick add (seeded accounts):
            </p>
            <div className="flex flex-wrap gap-2">
              {SEEDED.map((email) => {
                const already = team.members?.some(
                  (m) => m.user?.email === email,
                );
                return (
                  <button
                    key={email}
                    disabled={already || inviting}
                    onClick={() => handleInvite(email)}
                    className={clsx(
                      "text-xs px-3 py-1.5 rounded-lg border transition-all",
                      already
                        ? "border-[var(--color-border)] text-[var(--color-text-subtle)] opacity-50 cursor-not-allowed"
                        : "border-brand-500/30 text-brand-500 hover:bg-brand-500/10 cursor-pointer",
                    )}
                  >
                    {already ? "✓ " : "+ "}
                    {email.split("@")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="card divide-y divide-[var(--color-border)]">
        <div className="px-5 py-3 bg-[var(--color-bg)] rounded-t-xl">
          <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
            Members ({team.members?.length})
          </p>
        </div>

        {team.members?.map((m) => {
          const cfg = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
          const RoleIcon = cfg.Icon;
          const isMe = m.user?._id === user?._id;
          const isOwner = m.role === "owner";

          return (
            <div
              key={m.user?._id}
              className="flex items-center gap-4 px-5 py-3.5 group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {m.user?.name?.[0]?.toUpperCase() || "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">
                    {m.user?.name}
                  </p>
                  {isMe && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-500 font-medium">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {m.user?.email}
                </p>
              </div>

              {/* Role badge */}
              <div
                className={clsx(
                  "flex items-center gap-1.5 text-xs font-medium",
                  cfg.color,
                )}
              >
                <RoleIcon size={12} />
                {cfg.label}
              </div>

              {/* Joined date */}
              <p className="text-xs text-[var(--color-text-subtle)] hidden sm:block w-24 text-right">
                {m.joinedAt ? format(new Date(m.joinedAt), "MMM d, yyyy") : "—"}
              </p>

              {/* Remove */}
              {canManage && !isMe && !isOwner && (
                <button
                  onClick={() => handleRemove(m.user?._id, m.user?.name)}
                  disabled={removing === m.user?._id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-subtle)] hover:text-red-500 transition-all"
                  title="Remove member"
                >
                  {removing === m.user?._id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <UserMinus size={13} />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
