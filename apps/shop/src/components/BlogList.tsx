"use client";

import { useState } from "react";
import Link from "next/link";
import type { Post } from "@/data/posts";

const INITIAL_COUNT = 8;

export default function BlogList({ posts }: { posts: Post[] }) {
  const [expanded, setExpanded] = useState(false);

  if (posts.length === 0) {
    return <p className="text-[color:var(--ink-soft)] mb-12">No articles in this category yet.</p>;
  }

  const visiblePosts = expanded ? posts : posts.slice(0, INITIAL_COUNT);
  const remaining = posts.length - INITIAL_COUNT;

  return (
    <>
      <div className="space-y-6">
        {visiblePosts.map((post) => (
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

      {!expanded && remaining > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="p-btn-outline text-sm py-2.5 px-6"
          >
            More research articles ({remaining} more)
          </button>
        </div>
      )}
    </>
  );
}
