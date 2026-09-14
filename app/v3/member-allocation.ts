import type { Member } from "./data";

export const canEditOwnQuota = (actor: Member | undefined, target: Member) =>
  actor?.role === "Owner" && target.role === "Owner" && actor.email === target.email && actor.status === "正常";
