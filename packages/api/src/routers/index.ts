import { protectedProcedure, publicProcedure, router } from "../index";
import { pickleballRouter } from "./pickleball";
import { tennisRouter } from "./tennis";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  tennis: tennisRouter,
  pickleball: pickleballRouter,
});
export type AppRouter = typeof appRouter;
