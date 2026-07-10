import { createContext } from "react-router";

export type CloudflareContextValue = {
  env: Env;
  ctx: ExecutionContext;
};

export const cloudflareContext = createContext<CloudflareContextValue>();
