// OMNIVERSE persistence: one keyed document store. Each environment owns one
// document key (profile, settings, nexus, orbit, sonora, empire, casefile,
// aether, chronicles, sentinel, projects, notifications, achievements, omni)
// whose value is a JSON string the owning module validates on load. This keeps
// one typed contract for eight very different simulations.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const docs = sqliteTable("docs", {
  key: text("key").primaryKey(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
