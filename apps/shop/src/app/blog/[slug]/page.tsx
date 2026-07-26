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

const BASE_URL = "https://shop.auraprotocols.com";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 2);

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
    <div className="pharmacopoeia max-w-3xl mx-auto px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[color:var(--ink-soft)] mb-10">
        <Link href="/" className="hover:text-[color:var(--ink)] transition-colors">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-[color:var(--ink)] transition-colors">Blog</Link>
        <span>/</span>
        <span className="text-[color:var(--ink)] line-clamp-1">{post.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="p-chip">{post.category}</span>
          <span className="text-xs text-[color:var(--ink-soft)]">{post.date}</span>
          <span className="text-xs text-[color:var(--ink-soft)]">{post.readTime}</span>
        </div>
        <h1 className="p-serif text-4xl leading-tight mb-4 text-[color:var(--ink)]">{post.title}</h1>
        <p className="text-[color:var(--ink-soft)] text-lg leading-relaxed">{post.excerpt}</p>
      </div>

      {/* Article body */}
      <article>
        {post.content.map((section, i) => renderSection(section, i))}
        <EngineCTAInline />
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="p-serif text-xl mb-6 text-[color:var(--ink)]">More Research</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="p-card block p-5">
                <span className="p-cat-label">{r.category}</span>
                <p className="font-semibold text-[color:var(--ink)] mt-2 mb-1">{r.title}</p>
                <p className="text-xs text-[color:var(--ink-soft)]">{r.readTime}</p>
                <p className="text-xs text-[color:var(--specimen)] font-semibold mt-3">Read article →</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
