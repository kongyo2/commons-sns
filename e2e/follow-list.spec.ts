import { expect, test, type Browser, type Page } from "@playwright/test";
import { gotoApp, signUp, type E2EUser } from "./helpers";

/** プロフィールのフォロー数（`フォロー中` / `フォロワー`）のリンク。 */
function followStat(page: Page, label: "フォロー中" | "フォロワー") {
  return page.locator(".profile-follow-stats a").filter({ hasText: label });
}

/** 一覧のうち、そのハンドルの行。 */
function followEntry(page: Page, handle: string) {
  return page.locator("article.follow-entry").filter({ has: page.locator(`a[href="/users/${handle}"]`) });
}

/**
 * プロフィールのフォローボタンを目的の状態にして、リロード後も維持されることを確かめる。
 * 最初のクリックがハイドレーション前だと空振りするので、収束するまで繰り返す。
 */
async function ensureProfileFollowState(page: Page, handle: string, following: boolean) {
  const label = following ? "フォロー中" : "フォローする";
  await expect(async () => {
    await gotoApp(page, `/users/${handle}`);
    const button = page.locator(".follow-control button");
    if ((await button.innerText()) !== label) {
      await button.click();
      await expect(button).toHaveText(label, { timeout: 3_000 });
    }
    await page.reload();
    await expect(page.locator(".follow-control button")).toHaveText(label, { timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
}

/**
 * 一覧の行のフォローボタンを目的の状態にして、リロード後も維持されることを確かめる。
 */
async function ensureEntryFollowState(page: Page, url: string, handle: string, following: boolean) {
  const label = following ? "フォロー中" : "フォローする";
  await expect(async () => {
    await gotoApp(page, url);
    const button = followEntry(page, handle).locator(".follow-control button");
    if ((await button.innerText()) !== label) {
      await button.click();
      await expect(button).toHaveText(label, { timeout: 3_000 });
    }
    await page.reload();
    await expect(followEntry(page, handle).locator(".follow-control button")).toHaveText(label, { timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
}

/**
 * 別のブラウザ文脈でアカウントを作り、シードユーザー aoi_note をフォローしておく。
 * シードデータはフォロー関係を持たないので、一覧に並ぶ相手はテストが自前で用意する。
 */
async function createFollowerOfAoi(browser: Browser): Promise<E2EUser> {
  const context = await browser.newContext();
  const other = await context.newPage();
  try {
    const user = await signUp(other);
    await ensureProfileFollowState(other, "aoi_note", true);
    return user;
  } finally {
    await context.close();
  }
}

test.describe("フォロー一覧", () => {
  test("プロフィールの数字から一覧へ入り、その場でフォローできる", async ({ page, browser }) => {
    const follower = await createFollowerOfAoi(browser);
    const viewer = await signUp(page);

    // プロフィールのフォロワー数のリンクから一覧へ入る。
    await gotoApp(page, "/users/aoi_note");
    await followStat(page, "フォロワー").click();
    await expect(page).toHaveURL(/\/users\/aoi_note\/followers$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("@aoi_note のフォロワー");
    await expect(followEntry(page, follower.handle)).toBeVisible();
    // 自分はまだ誰もフォローしていないので、行のボタンは「フォローする」で始まる。
    await expect(followEntry(page, follower.handle).locator(".follow-control button")).toHaveText("フォローする");

    // タブでフォロー中一覧へ切り替えられる（aoi_note は誰もフォローしていない）。
    await page.getByRole("tab", { name: "フォロー中" }).click();
    await expect(page).toHaveURL(/\/users\/aoi_note\/following$/);
    await expect(page.getByText("まだ誰もフォローしていません")).toBeVisible();

    // 一覧の行からフォローする。
    await ensureEntryFollowState(page, "/users/aoi_note/followers", follower.handle, true);

    // 自分のプロフィールのフォロー数が追随し、そこから自分のフォロー中一覧へ入れる。
    await gotoApp(page, `/users/${viewer.handle}`);
    await expect(followStat(page, "フォロー中").locator("strong")).toHaveText("1");
    await followStat(page, "フォロー中").click();
    await expect(page).toHaveURL(new RegExp(`/users/${viewer.handle}/following$`));
    await expect(followEntry(page, follower.handle)).toBeVisible();

    // 解除も一覧の行からでき、数字も戻る。
    // 解除は aoi_note のフォロワー一覧で行う。自分のフォロー中一覧は「解除した相手が
    // 次の読み込みで一覧から消える」のが正しい挙動なので、ボタンの状態を読む場所にできない。
    await ensureEntryFollowState(page, "/users/aoi_note/followers", follower.handle, false);
    await gotoApp(page, `/users/${viewer.handle}`);
    await expect(followStat(page, "フォロー中").locator("strong")).toHaveText("0");
    // 解除した相手は自分のフォロー中一覧から消える。
    await gotoApp(page, `/users/${viewer.handle}/following`);
    await expect(page.getByText("まだ誰もフォローしていません")).toBeVisible();
  });

  test("未ログインでも一覧は読めるが、フォローボタンは出ない", async ({ page, browser }) => {
    const follower = await createFollowerOfAoi(browser);

    await gotoApp(page, "/users/aoi_note/followers");
    await expect(followEntry(page, follower.handle)).toBeVisible();
    await expect(page.locator("article.follow-entry .follow-control")).toHaveCount(0);
  });

  test("存在しないハンドルの一覧は404になる", async ({ page }) => {
    const response = await page.goto("/users/no_such_user_at_all/followers");
    expect(response?.status()).toBe(404);
  });
});
