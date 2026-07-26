import { expect, test, type Page } from "@playwright/test";
import { createPost, logOut, postCard, signUp, uniqueHandle } from "./helpers";

/** サイドナビからブックマークへ（クライアント遷移）。 */
async function goToBookmarks(page: Page) {
  await page.locator("nav.main-nav").getByRole("link", { name: "ブックマーク" }).click();
  await expect(page.getByRole("heading", { name: "ブックマーク", level: 1 })).toBeVisible();
}

/** サブページからタイムラインへ（クライアント遷移）。 */
async function backToTimeline(page: Page) {
  await page.getByRole("link", { name: "タイムラインへ戻る" }).click();
  await expect(page.locator("form.composer, .account-switcher.logged-out").first()).toBeVisible();
}

/** ローダーデータ取得（単一フェッチ）のリクエストだけを数える。 */
function countDataRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith(".data")) urls.push(request.url());
  });
  return urls;
}

test.describe("クライアントキャッシュ", () => {
  test("クライアント遷移で戻ってもタイムラインの内容が保たれる", async ({ page }) => {
    await signUp(page);
    const marker = `キャッシュ確認 ${uniqueHandle()}`;
    await createPost(page, marker);

    await goToBookmarks(page);
    await backToTimeline(page);

    await expect(postCard(page, marker)).toBeVisible();
  });

  test("投稿直後に戻ると新しい投稿が必ず見える", async ({ page }) => {
    await signUp(page);
    const first = `1つ目 ${uniqueHandle()}`;
    await createPost(page, first);
    // ここでタイムラインがキャッシュに載る。
    await goToBookmarks(page);
    await backToTimeline(page);

    const second = `2つ目 ${uniqueHandle()}`;
    await createPost(page, second);

    // 投稿を検知してキャッシュが無効化されるので、鮮度ウィンドウ内でも最新が出る。
    await goToBookmarks(page);
    await backToTimeline(page);

    await expect(postCard(page, second)).toBeVisible();
    await expect(postCard(page, first)).toBeVisible();
  });

  test("鮮度ウィンドウ内の再訪はサーバーへ行かない", async ({ page }) => {
    await signUp(page);
    // 1往復目でタイムラインとブックマークの両方をキャッシュに載せる。
    await goToBookmarks(page);
    await backToTimeline(page);

    const dataRequests = countDataRequests(page);
    await goToBookmarks(page);
    await backToTimeline(page);

    // Worker 呼び出しも D1 読み取りも発生しない。
    expect(dataRequests).toEqual([]);
  });

  test("ログアウトするとログイン中の状態がキャッシュから復活しない", async ({ page }) => {
    await signUp(page);
    const marker = `ログアウト確認 ${uniqueHandle()}`;
    await createPost(page, marker);

    const likeButton = postCard(page, marker).getByRole("button", { name: "いいね" });
    await likeButton.click();
    await expect(likeButton).toHaveAttribute("aria-pressed", "true");

    // ログイン中のタイムラインをキャッシュに載せてからログアウトする。
    await goToBookmarks(page);
    await backToTimeline(page);
    await logOut(page);

    await expect(page.locator(".account-switcher.logged-out")).toBeVisible();
    await expect(postCard(page, marker).locator("button.liked")).toHaveCount(0);

    // クライアント遷移で戻ってもログイン中の状態は復活しない。
    await postCard(page, marker).locator(".post-identity-link").click();
    await expect(page.getByRole("link", { name: "タイムラインへ戻る" })).toBeVisible();
    await backToTimeline(page);

    await expect(page.locator(".account-switcher.logged-out")).toBeVisible();
    await expect(postCard(page, marker).locator("button.liked")).toHaveCount(0);
  });
});
