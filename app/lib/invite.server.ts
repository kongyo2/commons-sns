import type { AppEnv } from "../cloudflare";
import { constantTimeEquals } from "./constant-time";

/**
 * 招待コードが必要かどうか。
 *
 * `INVITE_CODE` が未設定・空文字なら従来どおり誰でも登録できる。
 * 公開インスタンスを限定公開で運用したいときにシークレットとして設定する
 * （`wrangler secret put INVITE_CODE`。`wrangler.jsonc` には書かない）。
 */
export function isInviteRequired(env: AppEnv): boolean {
  return (env.INVITE_CODE ?? "").trim().length > 0;
}

/**
 * 提示された招待コードを検証する。未設定時は常に true。
 * コードは秘密情報なので比較は定数時間で行う。
 */
export function verifyInviteCode(env: AppEnv, provided: string): boolean {
  const expected = (env.INVITE_CODE ?? "").trim();
  if (expected.length === 0) return true;
  return constantTimeEquals(provided.trim(), expected);
}
