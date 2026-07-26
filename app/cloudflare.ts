import { createContext } from "react-router";

export type AppEnv = Env & {
  DB: D1Database;
  /** ローカル開発時のタイムライン自動更新間隔（ミリ秒）。`.dev.vars` で設定（dev 限定・暫定）。 */
  COMMONS_LOCAL_AUTO_RELOAD_MS?: string;
  /**
   * 招待コード。設定されている間だけ新規登録に入力が必要になる。
   * シークレット（`wrangler secret put INVITE_CODE`）なので `wrangler.jsonc` には書かない。
   */
  INVITE_CODE?: string;
};

export type CloudflareContextValue = {
  env: AppEnv;
  ctx: ExecutionContext;
};

export const cloudflareContext = createContext<CloudflareContextValue>();
