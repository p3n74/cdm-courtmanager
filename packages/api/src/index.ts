import { db } from "@cdm-pickleball/db";
import { tennisReservationManagerAllowlist } from "@cdm-pickleball/db/schema/tennis";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const managerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const email = ctx.session.user.email?.trim().toLowerCase();
  if (!email) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Missing email on account" });
  }
  const [allowed] = await db
    .select({ id: tennisReservationManagerAllowlist.id })
    .from(tennisReservationManagerAllowlist)
    .where(eq(tennisReservationManagerAllowlist.email, email))
    .limit(1);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to manage reservations",
    });
  }
  return next({ ctx });
});
