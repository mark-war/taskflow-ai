import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Users, UserPlus, Mail, Shield, Crown, Loader2 } from "lucide-react";
import { teamsAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import toast from "react-hot-toast";

const ROLE_CONFIG = {
  owner: { icon: Crown, color: "text-amber-500", label: "Owner" },
  admin: { icon: Shield, color: "text-purple-500", label: "Admin" },
  member: { icon: Users, color: "text-brand-500", label: "Member" },
  viewer: {
    icon: Users,
    color: "text-[var(--color-text-muted)]",
    label: "Viewer",
  },
};

export default function TeamPage() {
  const { teamId } = useParams();
  const { user } = useAuthStore();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!teamId || teamId === "undefined") return;
    teamsAPI
      .get(teamId)
      .then((r) => setTeam(r.data.team))
      .catch(() => toast.error("Failed to load team"))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data } = await teamsAPI.invite(teamId, {
        email: inviteEmail,
        role: "member",
      });
      setTeam(data.team);
      setInviteEmail("");
      setShowInvite(false);
      toast.success("Member added!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );

  if (!team)
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        Team not found
      </div>
    );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
            <Users size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{team.name}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {team.members?.length} member
              {team.members?.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="btn-primary text-sm"
        >
          <UserPlus size={14} /> Invite Member
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card p-4 flex gap-3">
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
              placeholder="colleague@company.com"
              className="input pl-9 text-sm"
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="btn-primary text-sm"
          >
            {inviting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Invite"
            )}
          </button>
          <button
            onClick={() => setShowInvite(false)}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Members list */}
      <div className="card divide-y divide-[var(--color-border)]">
        {team.members?.map((m) => {
          const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
          const RoleIcon = roleConfig.icon;
          const isMe = m.user?._id === user?._id;

          return (
            <div
              key={m.user?._id}
              className="flex items-center gap-4 px-5 py-4"
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

              {/* Role */}
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${roleConfig.color}`}
              >
                <RoleIcon size={12} />
                {roleConfig.label}
              </div>

              {/* Joined */}
              <p className="text-xs text-[var(--color-text-subtle)] hidden sm:block">
                {m.joinedAt ? format(new Date(m.joinedAt), "MMM d, yyyy") : "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
