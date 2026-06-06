import { notFound } from "next/navigation";
import Link from "next/link";
import { posts } from "@/data/posts";
import { renderSection } from "@/components/PostBody";
import EngineCTAInline from "@/components/EngineCTAInline";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} — Aura Protocols`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} — Aura Protocols`,
      description: post.excerpt,
      url: `https://shop.auraprotocols.com/blog/${post.slug}`,
      images: [{ url: `/blog/${post.slug}/opengraph-image`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} — Aura Protocols`,
      description: post.excerpt,
      images: [`/blog/${post.slug}/opengraph-image`],
    },
  };
}

const categoryColors: Record<string, string> = {
  Recovery: "text-emerald-400 bg-emerald-400/10",
  "Weight Management": "text-rose-400 bg-rose-400/10",
  "Growth & Performance": "text-violet-400 bg-violet-400/10",
  Wellness: "text-cyan-400 bg-cyan-400/10",
  "Buyer's Guide": "text-amber-400 bg-amber-400/10",
};

const BASE_URL = "https://shop.auraprotocols.com";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 2);
  const colorClass = categoryColors[post.category] ?? "text-slate-400 bg-slate-400/10";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: "Aura Protocols", url: BASE_URL },
    publisher: { "@type": "Organization", name: "Aura Protocols", url: BASE_URL },
    url: `${BASE_URL}/blog/${post.slug}`,
    datePublished: post.date,
    articleSection: post.category,
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-10">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
        <span>/</span>
        <span className="text-slate-300 line-clamp-1">{post.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
            {post.category}
          </span>
          <span className="text-xs text-slate-500">{post.date}</span>
          <span className="text-xs text-slate-500">{post.readTime}</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">{post.title}</h1>
        <p className="text-slate-400 text-lg leading-relaxed">{post.excerpt}</p>
      </div>

      {/* Article body */}
      <article>
        {post.content.map((section, i) => renderSection(section, i))}
        <EngineCTAInline />
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-xl font-bold text-white mb-6">More Research</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="glass product-card p-5 block">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[r.category] ?? "text-slate-400 bg-slate-400/10"}`}>
                  {r.category}
                </span>
                <p className="font-bold text-white mt-2 mb-1">{r.title}</p>
                <p className="text-xs text-slate-400">{r.readTime}</p>
                <p className="text-xs text-cyan-400 font-semibold mt-3">Read article →</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
