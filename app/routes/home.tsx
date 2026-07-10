import {
  Bell,
  Bookmark,
  CircleEllipsis,
  Code2,
  Feather,
  Heart,
  Home,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Search,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

export function meta() {
  return [
    { title: "Commons — みんなで育てるSNS" },
    { name: "description", content: "中央集権型の、コミュニティ開発OSS SNS" },
  ];
}

type Post = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  avatarClass: string;
  time: string;
  body: string;
  replies: number;
  reposts: number;
  likes: number;
  tags?: string[];
  liked?: boolean;
  reposted?: boolean;
  bookmarked?: boolean;
};

const initialPosts: Post[] = [
  {
    id: 1,
    name: "Commons 開発チーム",
    handle: "@commons_dev",
    avatar: "C",
    avatarClass: "avatar-blue",
    time: "18分",
    body: "Commonsの最初の公開開発が始まりました。使う人が、次の機能を提案し、議論し、ときには自分で実装できるSNSを目指します。最初のテーマは「タイムラインに何を足さないか」です。",
    replies: 14,
    reposts: 31,
    likes: 128,
    tags: ["開発ログ", "OSS"],
  },
  {
    id: 2,
    name: "あおい",
    handle: "@aoi_note",
    avatar: "あ",
    avatarClass: "avatar-violet",
    time: "42分",
    body: "新しいSNSなのに、最初から操作を覚え直さなくていいのがうれしい。見慣れた形のまま、空気だけ少し穏やかになった感じ。",
    replies: 5,
    reposts: 8,
    likes: 64,
  },
  {
    id: 3,
    name: "朝倉ユウ",
    handle: "@yuu_builds",
    avatar: "Y",
    avatarClass: "avatar-orange",
    time: "1時間",
    body: "提案 #12『投稿の公開範囲をあとから変更できるようにする』に仕様案を書きました。実装に参加したい人、特にアクセシビリティの観点からレビューしてくれる人を募集中です。",
    replies: 9,
    reposts: 17,
    likes: 92,
    tags: ["提案募集中"],
  },
  {
    id: 4,
    name: "みなと",
    handle: "@minato",
    avatar: "み",
    avatarClass: "avatar-green",
    time: "2時間",
    body: "小さいサービスだからできることって、機能の多さじゃなくて、運営と利用者の距離が近いことなのかもしれない。",
    replies: 3,
    reposts: 12,
    likes: 106,
  },
];

const navItems = [
  { label: "ホーム", icon: Home },
  { label: "見つける", icon: Search },
  { label: "通知", icon: Bell, badge: 3 },
  { label: "メッセージ", icon: Mail },
  { label: "ブックマーク", icon: Bookmark },
  { label: "コミュニティ", icon: UsersRound },
  { label: "プロフィール", icon: UserRound },
  { label: "設定", icon: Settings },
];

function Avatar({ post }: { post: Post }) {
  return <div className={`avatar ${post.avatarClass}`}>{post.avatar}</div>;
}

export default function HomePage() {
  const [posts, setPosts] = useState(initialPosts);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("ホーム");
  const [activeTab, setActiveTab] = useState<"おすすめ" | "フォロー中">("おすすめ");

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts;
    return posts.filter((post) =>
      `${post.name} ${post.handle} ${post.body} ${(post.tags ?? []).join(" ")}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [posts, query]);

  function publish(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setPosts((current) => [
      {
        id: Date.now(),
        name: "あなた",
        handle: "@you",
        avatar: "私",
        avatarClass: "avatar-dark",
        time: "今",
        body,
        replies: 0,
        reposts: 0,
        likes: 0,
      },
      ...current,
    ]);
    setDraft("");
  }

  function togglePost(id: number, kind: "liked" | "reposted" | "bookmarked") {
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== id) return post;
        if (kind === "bookmarked") return { ...post, bookmarked: !post.bookmarked };
        const countKey = kind === "liked" ? "likes" : "reposts";
        return {
          ...post,
          [kind]: !post[kind],
          [countKey]: post[countKey] + (post[kind] ? -1 : 1),
        };
      }),
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <button className="brand" aria-label="Commons ホーム" onClick={() => setActiveNav("ホーム")}>
            <span className="brand-mark"><span /></span>
            <span className="brand-name">Commons</span>
            <span className="brand-beta">BETA</span>
          </button>

          <nav className="main-nav" aria-label="メインナビゲーション">
            {navItems.map(({ label, icon: Icon, badge }) => (
              <button
                key={label}
                className={activeNav === label ? "nav-item active" : "nav-item"}
                onClick={() => setActiveNav(label)}
              >
                <span className="nav-icon-wrap">
                  <Icon size={23} strokeWidth={activeNav === label ? 2.5 : 1.9} />
                  {badge && <span className="nav-badge">{badge}</span>}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <button className="post-button" onClick={() => document.querySelector<HTMLTextAreaElement>("#composer")?.focus()}>
            <Feather size={19} />
            <span>投稿する</span>
          </button>

          <button className="account-switcher">
            <div className="avatar avatar-dark small">私</div>
            <span className="account-copy"><strong>あなた</strong><small>@you</small></span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      <section className="feed-column">
        <header className="feed-header">
          <div className="mobile-brand"><span className="brand-mark"><span /></span></div>
          <div className="tabs" role="tablist">
            {(["おすすめ", "フォロー中"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={activeTab === tab ? "tab active" : "tab"}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <button className="mobile-avatar avatar avatar-dark">私</button>
        </header>

        <div className="topic-strip">
          <Sparkles size={15} />
          <span>いま話されていること</span>
          <strong>みんなで決める最初の機能</strong>
          <button>参加する</button>
        </div>

        <form className="composer" onSubmit={publish}>
          <div className="avatar avatar-dark">私</div>
          <div className="composer-main">
            <textarea
              id="composer"
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 280))}
              placeholder="いまどうしてる？"
              rows={2}
            />
            <div className="composer-footer">
              <div className="composer-tools">
                <button type="button" aria-label="画像を追加"><ImageIcon size={19} /></button>
                <button type="button" aria-label="公開範囲">全員に公開</button>
              </div>
              <div className="composer-submit">
                {draft.length > 0 && <span className={draft.length > 260 ? "limit near" : "limit"}>{280 - draft.length}</span>}
                <button type="submit" disabled={!draft.trim()}>投稿する</button>
              </div>
            </div>
          </div>
        </form>

        <div className="feed-status">
          <span>{activeTab}の投稿</span>
          <button>新しい順</button>
        </div>

        <div className="posts" aria-live="polite">
          {visiblePosts.length === 0 && (
            <div className="empty-state"><Search size={28} /><strong>投稿が見つかりません</strong><span>別の言葉で検索してみてください。</span></div>
          )}
          {visiblePosts.map((post) => (
            <article className="post" key={post.id}>
              <Avatar post={post} />
              <div className="post-content">
                <header>
                  <div className="post-identity">
                    <strong>{post.name}</strong>
                    {post.id === 1 && <span className="verified" aria-label="公式">✓</span>}
                    <span>{post.handle}</span><span>·</span><span>{post.time}</span>
                  </div>
                  <button aria-label="その他"><MoreHorizontal size={19} /></button>
                </header>
                <p>{post.body}</p>
                {post.tags && <div className="tags">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                <footer className="post-actions">
                  <button aria-label="返信"><span><MessageCircle size={18} /></span><small>{post.replies || ""}</small></button>
                  <button className={post.reposted ? "reposted" : ""} onClick={() => togglePost(post.id, "reposted")} aria-label="リポスト"><span><Repeat2 size={19} /></span><small>{post.reposts || ""}</small></button>
                  <button className={post.liked ? "liked" : ""} onClick={() => togglePost(post.id, "liked")} aria-label="いいね"><span><Heart size={18} fill={post.liked ? "currentColor" : "none"} /></span><small>{post.likes || ""}</small></button>
                  <button className={post.bookmarked ? "bookmarked" : ""} onClick={() => togglePost(post.id, "bookmarked")} aria-label="ブックマーク"><span><Bookmark size={18} fill={post.bookmarked ? "currentColor" : "none"} /></span></button>
                </footer>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="rightbar">
        <div className="rightbar-inner">
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Commonsを検索" />
            {query && <button onClick={() => setQuery("")} aria-label="検索を消す">×</button>}
          </label>

          <section className="side-card project-card">
            <div className="eyebrow"><Code2 size={15} /> OPEN SOURCE</div>
            <h2>このSNSを、一緒につくる。</h2>
            <p>機能提案、デザイン、翻訳、コード。得意な方法で開発に参加できます。</p>
            <button>開発に参加する <span>→</span></button>
            <div className="project-stats"><span><strong>24</strong> 提案</span><span><strong>8</strong> 開発中</span><span><strong>16</strong> 貢献者</span></div>
          </section>

          <section className="side-card trends-card">
            <div className="card-title"><h2>いまの話題</h2><button><CircleEllipsis size={19} /></button></div>
            {[
              ["コミュニティ", "最初にほしい機能", "286件の投稿"],
              ["開発", "#CommonsDev", "142件の投稿"],
              ["日本のトレンド", "小さなSNS", "89件の投稿"],
            ].map(([kind, title, count]) => (
              <button className="trend" key={title}>
                <small>{kind}</small><strong>{title}</strong><span>{count}</span>
              </button>
            ))}
            <button className="show-more">さらに表示</button>
          </section>

          <footer className="legal-links">
            <a href="#">利用規約</a><a href="#">プライバシー</a><a href="#">OSS</a><a href="#">運営について</a><span>© 2026 Commons</span>
          </footer>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="モバイルナビゲーション">
        {[Home, Search, Feather, Bell, UserRound].map((Icon, index) => (
          <button key={index} className={index === 0 ? "active" : ""}><Icon size={23} /></button>
        ))}
      </nav>
    </main>
  );
}
