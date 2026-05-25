import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ValuePropTriad from "@/components/ValuePropTriad";
import TrustBlock from "@/components/TrustBlock";
import EmailCapture from "@/components/EmailCapture";
import EngineCTACard from "@/components/EngineCTACard";
import { products } from "@/data/products";
import { posts } from "@/data/posts";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Aura Protocols — Personalized Peptide Protocols, Backed by Your Data",
  description:
    "Connect your wearable, get a peptide protocol tuned to your recovery, sleep, and stress. Plus independent vendor reviews and a clinical-grade prescribed option.",
  alternates: { canonical: "/" },
};

const featuredProducts = products.filter((p) => p.featured);
const latestPosts = posts.slice(0, 3);

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center md:pt-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
          Personalized peptide protocols
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-6xl">
          Stop guessing your stack.<br />Tune it to your biometrics.
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-300">
          Aura reads your wearable data and returns a peptide protocol tuned to your actual
          recovery, sleep, and stress — not a generic forum stack. Free. Independent.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={ENGINE_URL}
            target="_blank"
            rel={EXTERNAL_REL}
            className="btn-primary"
          >
            Connect a wearable →
          </a>
          <Link href="/blog" className="btn-outline">
            Read the research
          </Link>
        </div>
      </section>

      <TrustBlock />
      <ValuePropTriad />

      {/* Featured products */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl font-bold text-white">Featured compounds</h2>
        <p className="mt-2 text-slate-400">
          Independently reviewed. Affiliate-disclosed. Buy direct from the vendor.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* Latest posts */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl font-bold text-white">Latest from the library</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-white/10 bg-[#0d1117] p-6 transition hover:border-cyan-400/40"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                {post.category}
              </p>
              <h3 className="font-display mt-2 text-xl font-bold text-white">{post.title}</h3>
              <p className="mt-3 line-clamp-3 text-slate-400">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Email + Engine */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <EmailCapture />
        <EngineCTACard />
      </section>
    </>
  );
}
