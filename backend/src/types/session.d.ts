import "express-session";
import type { UserContext } from "../auth/types.js";

declare module "express-session" {
  interface SessionData {
    auth?: {
      user_id: number;
    };
    oidc?: {
      code_verifier: string;
      state: string;
      created_at: number;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      userContext?: UserContext;
    }
  }
}

export {};
