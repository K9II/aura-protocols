import Link from "next/link";
import { posts } from "@/data/posts";
import BlogList from "@/components/BlogList";

export const metadata = {
  title: "Research Blog — Aura Protocols",
  description: "In-depth guides, reviews, and research summaries on the most studied peptides.",
};

// post.date is a "Month YYYY" string (e.g. "July 2026") — parse to sort newest-first.
function parseDate(date: string): number {
  return new Date(`1 ${date}`).getTime();
}

// Curated filter set — narrower than the full list of category values on
// individual posts. "Longevity & Wellness" maps to the existing "Wellness"
// category value; posts tagged Weight Management or Buyer's Guide keep
// their own category (still shown under "All") but have no dedicated pill.
const BLOG_FILTERS: { label: string; value: string }[] = [
  { label: "Recovery", value: "Recovery" },
  { label: "Body Composition", value: "Body Composition" },
  { label: "Growth & Performance", value: "Growth & Performance" },
  { label: "Longevity & Wellness", value: "Wellness" },
  { label: "Stacks", value: "Stacks" },
];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const sortedPosts = [...posts]
    .filter((post) => !category || post.category === category)
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      // Only relevant within a filtered category view — categoryLead has no
      // effect on the unfiltered "All" order, which pinned already governs.
      if (category && !!a.categoryLead !== !!b.categoryLead) return a.categoryLead ? -1 : 1;
      return parseDate(b.date) - parseDate(a.date);
    });

  return (
    <div className="pharmacopoeia">
    <div className="max-w-4xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Research Blog</p>
      <h1 className="p-serif text-4xl mb-4 text-[color:var(--ink)]">Latest Articles</h1>
      <p className="text-[color:var(--ink-soft)] mb-8 leading-relaxed">
        Evidence-based guides on research peptides, vendor reviews, and buyer education.
      </p>

      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/blog"
          className={`p-chip ${!category ? "border-[color:var(--specimen)] text-[color:var(--specimen)]" : ""}`}
        >
          All
        </Link>
        {BLOG_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/blog?category=${encodeURIComponent(f.value)}`}
            className={`p-chip ${category === f.value ? "border-[color:var(--specimen)] text-[color:var(--specimen)]" : ""}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <BlogList posts={sortedPosts} />
    </div>
    </div>
  );
}
