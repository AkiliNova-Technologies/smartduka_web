"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roles = ["ADMIN", "MANAGER", "STAFF", "ACCOUNTANT"];

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  vendorRole: string;
};

export function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = () =>
    fetch("/api/vendor/team")
      .then((r) => r.json())
      .then((v) =>
        v.success
          ? setMembers(v.data.members)
          : setError(v.error || "Unable to load shop team."),
      )
      .catch(() => setError("Unable to load shop team."));
  useEffect(() => {
    void load();
  }, []);
  const mutate = async (body: object) => {
    setSaving(true);
    setError("");
    const response = await fetch("/api/vendor/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    setSaving(false);
    if (!response.ok)
      return setError(json.error || "Unable to update shop team.");
    setEmail("");
    void load();
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Shop team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Owners can delegate day-to-day operations to existing SmartDuka users.
          Ownership and payouts remain protected.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <section className="rounded-2xl border bg-card p-5">
        <h3 className="font-medium">Add team member</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="member@example.com"
            className="h-10 rounded-full border bg-background px-3 text-sm"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger aria-label="Role" className="min-h-10 w-full rounded-full text-sm pl-4">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="p-2">
              {roles.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={saving || !email}
            onClick={() => void mutate({ email, role })}
            className="rounded-full px-4 h-10">
            Add member
          </Button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h3 className="font-medium">Current team</h3>
        </div>
        {members.length ? (
          members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 border-b p-4 last:border-0">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.email}
                  {member.phone
                    ? " · " + member.phone
                    : " · No phone number"} · {member.status}
                </p>
              </div>
              {member.vendorRole === "OWNER" ? (
                <span className="text-sm font-medium">Owner</span>
              ) : (
                <>
                  <select
                    value={member.vendorRole}
                    onChange={(event) =>
                      void mutate({
                        action: "change-role",
                        memberId: member.id,
                        role: event.target.value,
                      })
                    }
                    className="h-9 rounded-md border bg-background px-2 text-sm">
                    {roles.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void mutate({ action: "remove", memberId: member.id })
                    }>
                    Remove
                  </Button>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No team members yet.
          </p>
        )}
      </section>
    </div>
  );
}
