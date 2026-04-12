import Link from "next/link";
import { posts } from "@/data/posts";

export const metadata = {
  title: "Research Blog — Aura Protocols",
  description: "In-depth guides, reviews, and research summaries on the most studied peptides.",
};

const categoryColors: Record<string, string> = {
  Recovery: "text-emerald-400 bg-emerald-400/10",
  "Weight Management": "text-rose-400 bg-rose-400/10",
  "Growth & Performance": "text-violet-400 bg-violet-400/10",
  Wellness: "text-cyan-400 bg-cyan-400/10",
  "Buyer's Guide": "text-amber-400 bg-amber-400/10",
};

export default function BlogPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Research Blog</p>
      <h1 className="text-4xl font-extrabold text-white mb-4">Latest Articles</h1>
      <p className="text-slate-400 mb-12 leading-relaxed">
        Evidence-based guides on research peptides, vendor reviews, and buyer education.
      </p>

      <div className="space-y-6">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="glass product-card p-6 block">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? "text-slate-400 bg-slate-400/10"}`}>
                {post.category}
              </span>
              <span className="text-xs text-slate-500">{post.date}</span>
              <span className="text-xs text-slate-500">{post.readTime}</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{post.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{post.excerpt}</p>
            <p className="mt-4 text-xs font-semibold text-cyan-400">Read article →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
