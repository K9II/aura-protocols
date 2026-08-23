// apps/modality/src/components/JsonLd.tsx
//
// Emits one or more schema.org objects as a JSON-LD <script>. Pass a single
// schema object or an array (they're wrapped in an @graph). Use with the builders
// in lib/schema.ts:
//
//   <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(faqs)]} />
//
// Server-rendered; safe to place anywhere in a page's tree.

type Schema = Record<string, unknown>;

export default function JsonLd({ data }: { data: Schema | Schema[] }) {
  const json = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : data;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
