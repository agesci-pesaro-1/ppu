import type { Db } from '../db/index.ts';
import type { PREVIEW_CHANNELS } from '../db/schema.ts';
import type { User } from '../identity/index.ts';

/** Who is acting, from where, on which database. REST and MCP pass it to the services. */
export interface Context {
  db: Db;
  user: User;
  channel: (typeof PREVIEW_CHANNELS)[number];
  /** Configured Google Workspace domain. */
  domain: string;
  /** Current instant; replaceable in tests. */
  now?: () => Date;
}

export const now = (ctx: Context): Date => (ctx.now ? ctx.now() : new Date());
