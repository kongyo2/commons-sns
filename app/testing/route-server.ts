import { createRequestHandler, type ServerBuild } from "react-router";
import type { AppEnv } from "../cloudflare";
import { routerContext } from "./requests";

/**
 * ルートモジュール。`ServerRouteModule` ではなく緩い型にしてある。ルートの
 * `default` は typegen が付けた props を要求する一方、`ServerRouteModule` の
 * `default` は props 無しで呼べる形なので、そのままでは代入できない
 * （本番のビルドでは React Router 側がラップして辻褄を合わせている）。
 */
type RouteModule = Record<string, unknown>;

type RouteUnderTest = {
  /** `import * as home from "../routes/home"` をそのまま渡す。 */
  module: RouteModule;
  /** `app/routes.ts` と同じ指定。インデックスルートは `index: true` で path を省く。 */
  path?: string;
  index?: boolean;
};

/**
 * ルートを React Router のリクエストハンドラ越しに叩き、**本物の `Response`** を返す。
 *
 * loader / action を直接呼ぶテスト（`routeArgs` を使うもの）は戻り値しか見られない。
 * `data(payload, init)` の `init` が応答へどう反映されるかはリクエストハンドラの仕事で、
 * ステータスは通るのにヘッダは落ちる、といったズレはそこにしか現れない。
 *
 * ルート1枚だけを `root` の下にぶら下げた最小のビルドを組む。応答ヘッダの組み立ては
 * 「各ルートの `headers` エクスポート＋親子のマージ」で、ルートの枚数には依らないため、
 * これで本番と同じ経路を通せる。
 *
 * 文書リクエスト（`POST /?index`）とシングルフェッチ（`POST /_.data?index`）の
 * どちらも通せる。前者では HTML を組み立てる `entry.server.tsx` の代わりに、
 * ヘッダとステータスだけを載せた空応答を返すスタブを使う（描画は E2E の担当で、
 * ここで見たいのはヘッダだけ）。
 */
export function createRouteFetch(route: RouteUnderTest) {
  const build = {
    ssr: true,
    basename: undefined,
    future: {},
    prerender: [],
    publicPath: "/",
    assetsBuildDirectory: "build/client",
    routeDiscovery: { mode: "initial", manifestPath: "/__manifest" },
    assets: { entry: { module: "", imports: [] }, routes: {}, url: "", version: "test" },
    entry: {
      module: {
        default: (_request: Request, status: number, headers: Headers) => new Response(null, { status, headers }),
      },
    },
    routes: {
      root: { id: "root", path: "", module: { default: () => null } },
      target: {
        id: "target",
        parentId: "root",
        path: route.path,
        index: route.index,
        module: route.module,
      },
    },
  } as unknown as ServerBuild;

  const handler = createRequestHandler(build, "test");
  return (request: Request, env: AppEnv) => handler(request, routerContext(env));
}
