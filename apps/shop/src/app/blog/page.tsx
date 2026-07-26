import Link from "next/link";
import { posts } from "@/data/posts";

export const metadata = {
  title: "Research Blog — Aura Protocols",
  description: "In-depth guides, reviews, and research summaries on the most studied peptides.",
};

export default function BlogPage() {
  return (
    <div className="pharmacopoeia">
    <div className="max-w-4xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Research Blog</p>
      <h1 className="p-serif text-4xl mb-4 text-[color:var(--ink)]">Latest Articles</h1>
      <p className="text-[color:var(--ink-soft)] mb-12 leading-relaxed">
        Evidence-based guides on research peptides, vendor reviews, and buyer education.
      </p>

      <div className="space-y-6">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="p-card block p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="p-cat-label">{post.category}</span>
              <span className="text-xs text-[color:var(--ink-soft)]">{post.date}</span>
              <span className="text-xs text-[color:var(--ink-soft)]">{post.readTime}</span>
            </div>
            <h2 className="p-serif-italic text-lg mb-2 text-[color:var(--ink)]">{post.title}</h2>
            <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">{post.excerpt}</p>
            <p className="mt-4 text-xs font-semibold text-[color:var(--specimen)]">Read article →</p>
          </Link>
        ))}
      </div>
    </div>
    </div>
  );
}
