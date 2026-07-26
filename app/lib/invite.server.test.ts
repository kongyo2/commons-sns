import { describe, expect, it } from "vitest";
import type { AppEnv } from "../cloudflare";
import { isInviteRequired, verifyInviteCode } from "./invite.server";

/** 招待コードだけを持つ最小の env。DB は触らないので省略できる。 */
function envWith(inviteCode?: string): AppEnv {
  return { INVITE_CODE: inviteCode } as unknown as AppEnv;
}

describe("isInviteRequired", () => {
  it("is off when the secret is unset, empty or blank", () => {
    expect(isInviteRequired(envWith())).toBe(false);
    expect(isInviteRequired(envWith(""))).toBe(false);
    expect(isInviteRequired(envWith("   "))).toBe(false);
  });

  it("is on when the secret holds a value", () => {
    expect(isInviteRequired(envWith("open-sesame"))).toBe(true);
  });
});

describe("verifyInviteCode", () => {
  it("accepts anything while the instance is open", () => {
    expect(verifyInviteCode(envWith(), "")).toBe(true);
    expect(verifyInviteCode(envWith("  "), "whatever")).toBe(true);
  });

  it("accepts the exact code and tolerates surrounding whitespace", () => {
    const env = envWith("open-sesame");
    expect(verifyInviteCode(env, "open-sesame")).toBe(true);
    expect(verifyInviteCode(env, "  open-sesame \n")).toBe(true);
  });

  it("rejects a wrong code, a differently-cased code and an empty input", () => {
    const env = envWith("open-sesame");
    expect(verifyInviteCode(env, "open-sesam")).toBe(false);
    expect(verifyInviteCode(env, "Open-Sesame")).toBe(false);
    expect(verifyInviteCode(env, "")).toBe(false);
  });

  it("compares against the trimmed secret", () => {
    expect(verifyInviteCode(envWith("  padded  "), "padded")).toBe(true);
  });
});
