export const metadata = {
  title: "Research Blog — Aura Protocols",
  description: "In-depth guides, reviews, and research summaries on the most studied peptides.",
};

const posts = [
  {
    slug: "bpc-157-complete-guide",
    title: "BPC-157: The Complete Research Guide",
    excerpt: "A deep dive into Body Protection Compound-157 — mechanisms, studied benefits, and what the current literature says.",
    category: "Recovery",
    date: "April 2026",
  },
  {
    slug: "semaglutide-vs-tirzepatide",
    title: "Semaglutide vs. Tirzepatide: What the Research Shows",
    excerpt: "Comparing two of the most researched GLP-1 receptor agonists for body composition and metabolic health.",
    category: "Weight Management",
    date: "March 2026",
  },
  {
    slug: "cjc-1295-ipamorelin-stack",
    title: "CJC-1295 / Ipamorelin Stack: Growth Hormone Optimization",
    excerpt: "Why this combo has become the gold standard for GH-axis support in research settings.",
    category: "Growth & Performance",
    date: "March 2026",
  },
  {
    slug: "how-to-read-a-peptide-coa",
    title: "How to Read a Peptide Certificate of Analysis",
    excerpt: "A plain-English breakdown of what's in a COA, what to look for, and red flags to avoid.",
    category: "Buyer's Guide",
    date: "February 2026",
  },
];

const categoryColors: Record<string, string> = {
  Recovery: "text-emerald-400 bg-emerald-400/10",
  "Weight Management": "text-rose-400 bg-rose-400/10",
  "Growth & Performance": "text-violet-400 bg-violet-400/10",
  "Buyer's Guide": "text-cyan-400 bg-cyan-400/10",
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
          <article key={post.slug} className="glass p-6 product-card cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? "text-slate-400 bg-slate-400/10"}`}>
                {post.category}
              </span>
              <span className="text-xs text-slate-500">{post.date}</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{post.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{post.excerpt}</p>
            <p className="mt-4 text-xs font-semibold text-cyan-400">Read article →</p>
          </article>
        ))}
      </div>
    </div>
  );
}
