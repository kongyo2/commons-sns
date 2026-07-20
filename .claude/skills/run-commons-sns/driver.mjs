#!/usr/bin/env node
// Headless driver for commons-sns.
//
// Drives the *running* dev server (react-router dev + workerd + local D1)
// with Playwright's pre-installed Chromium. It never touches the remote
// Cloudflare D1 — everything runs against the local Miniflare database, so
// it is safe against the deployed production instance.
//
// Prereqs (see SKILL.md): `npm run db:migrate:local` once, then
// `npm run dev` running in the background on http://localhost:5173.
//
// Usage:
//   node .claude/skills/run-commons-sns/driver.mjs smoke   # signup + post + screenshots (default)
//   node .claude/skills/run-commons-sns/driver.mjs shot /users/commons_dev out.png
//
// Env:
//   COMMONS_BASE_URL  base URL of the running dev server (default http://localhost:5173)
//   COMMONS_SHOTS     screenshot output dir (default /tmp/commons-shots)
// Sequential browser steps (nav → wait → click → screenshot) each depend on
// the previous, so awaiting inside loops is intended here — the same reason
// .oxlintrc.json turns this rule off for e2e/**.
/* eslint-disable no-await-in-loop */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = (process.env.COMMONS_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
const SHOTS = process.env.COMMONS_SHOTS ?? "/tmp/commons-shots";
// Symlink Playwright drops for the container's pre-installed browser; used as
// a fallback if the bundled build number doesn't match this playwright-core.
const CHROMIUM = "/opt/pw-browsers/chromium";

mkdirSync(SHOTS, { recursive: true });

// The dev-only timeline auto-reload polls every 2s and keeps the network from
// ever going idle. Disabling it per-nav makes waits deterministic and keeps
// screenshots from flickering mid-revalidation.
function url(path) {
  const u = new URL(path, BASE);
  if (!u.searchParams.has("autoReloadMs")) u.searchParams.set("autoReloadMs", "0");
  return u.toString();
}

async function launch() {
  const opts = { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] };
  try {
    return await chromium.launch(opts);
  } catch {
    return await chromium.launch({ ...opts, executablePath: CHROMIUM });
  }
}

function uniqueUser() {
  const handle = `drv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.slice(0, 20);
  return { handle, displayName: `Driver ${handle.slice(-4)}`, password: "driver-password-123" };
}

// The first click after a load can beat React hydration: the SSR button is
// visible before its handler is wired. Retry until the effect is observable.
async function clickExpecting(page, trigger, expected, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (!(await expected.isVisible().catch(() => false))) {
      await trigger.click({ timeout: 2_000 }).catch(() => {});
    }
    if (await expected.isVisible({ timeout: 1_500 }).catch(() => false)) return;
    if (Date.now() > deadline) throw new Error("clickExpecting: expected element never appeared");
  }
}

async function smoke(page) {
  const user = uniqueUser();

  // 1. Logged-out home.
  await page.goto(url("/"), { waitUntil: "networkidle" });
  await page.locator(".join-card").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/01-home-loggedout.png`, fullPage: true });
  console.log("shot: 01-home-loggedout.png");

  // 2. Sign up through the modal.
  const dialog = page.getByRole("dialog");
  await clickExpecting(page, page.locator(".join-card").getByRole("button", { name: "アカウントを作成" }), dialog);
  await dialog.getByLabel("表示名").fill(user.displayName);
  await dialog.getByLabel("ユーザーID").fill(user.handle);
  await dialog.getByLabel("パスワード").fill(user.password);
  await dialog.getByRole("button", { name: "アカウントを作成" }).click();
  await page.locator(".account-switcher").filter({ hasText: user.displayName }).waitFor({ timeout: 15_000 });
  console.log(`signed up: @${user.handle}`);

  // 3. Post to the timeline.
  const body = `driver smoke ${new Date().toISOString()}`;
  const composer = page.locator("form.composer");
  await composer.getByPlaceholder("いまどうしてる？").fill(body);
  await composer.getByRole("button", { name: "投稿する" }).click();
  await page.locator("article.post").filter({ hasText: body }).waitFor({ timeout: 15_000 });
  console.log(`posted: ${body}`);

  // 4. Logged-in timeline with the new post.
  await page.screenshot({ path: `${SHOTS}/02-timeline-loggedin.png`, fullPage: true });
  console.log("shot: 02-timeline-loggedin.png");
}

async function shot(page, path, out) {
  await page.goto(url(path), { waitUntil: "networkidle" });
  await page.screenshot({ path: out, fullPage: true });
  console.log(`shot: ${out}`);
}

async function main() {
  const cmd = process.argv[2] ?? "smoke";
  const browser = await launch();
  const context = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  let failed = false;
  try {
    if (cmd === "shot") {
      await shot(page, process.argv[3] ?? "/", process.argv[4] ?? `${SHOTS}/shot.png`);
    } else if (cmd === "smoke") {
      await smoke(page);
    } else {
      throw new Error(`unknown command: ${cmd} (use "smoke" or "shot")`);
    }
  } catch (err) {
    failed = true;
    console.error(`\nDRIVER FAILED: ${err.message}`);
    await page.screenshot({ path: `${SHOTS}/error.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }

  if (errors.length) {
    console.error(`\nconsole errors (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
  } else {
    console.log("\nconsole errors: none");
  }
  process.exit(failed ? 1 : 0);
}

await main();
