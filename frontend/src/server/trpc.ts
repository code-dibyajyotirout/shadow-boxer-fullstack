import { initTRPC } from "@trpc/server";

export interface Context {
  // Can be extended with auth session / user
  req?: Request;
}

export const createContext = async (opts: { req: Request }): Promise<Context> => {
  return {
    req: opts.req,
  };
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
