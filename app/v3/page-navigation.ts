import type { View } from "./data";

export const isRetiredMonitoringView = (view: string) => /^(logs|quality)[2-7]?$/.test(view);
export const retiredViewAliases: Record<string, View> = {
  overview: "keys", models: "keys", modelDetail: "keys", experience: "keys", solutions: "keys",
  playground: "keys", docs: "keys", projects: "keys", projectDetail: "keys", accounts: "keys", accountDetail: "keys",
  keyDetail: "keys", notifications: "keys", dedicated: "keys",
  keys2: "keys",
  security: "enterprise", security2: "enterprise",
  memberDetail: "enterprise", permissions: "enterprise", quota: "enterprise",
  enterprise2: "enterprise", enterprise3: "enterprise", enterprise4: "enterprise", enterprise2Detail: "enterprise",
  audit: "enterprise", audit2: "enterprise", audit3: "enterprise", keys3: "keys", keys4: "keys", keys5: "keys", keys6: "keys", keys7: "keys", keys8: "keys",
  voices: "keys", voices2: "keys", voices3: "keys", voices4: "keys", voices5: "keys", voices6: "keys",
  billing: "billing3", billing2: "billing3", billing4: "billing3", billing5: "billing3", billing6: "billing3", orders: "billing3", orderDetail: "billing3",
  usage: "usage3", usage2: "usage3", usage4: "usage3", usage5: "usage3", usage6: "usage3", usage7: "usage3", usage8: "usage3", usage9: "usage3", usageDetail: "usage3",
  ...Object.fromEntries(["", "2", "3", "4", "5", "6", "7"].flatMap(suffix => [[`logs${suffix}`, "keys"], [`quality${suffix}`, "keys"]])) as Record<string, View>,
};
