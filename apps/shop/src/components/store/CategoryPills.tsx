import Link from "next/link";
import type { ChemicalClass } from "@/data/catalog";
import { classCounts } from "@/lib/catalog";
import { compounds } from "@/data/catalog";

export default function CategoryPills({ active }: { active?: ChemicalClass }) {
  return (
    <nav className="s-pills" aria-label="Filter by chemical class">
      <Link href="/products" aria-current={!active ? "page" : undefined}>
        All<span>{compounds.length}</span>
      </Link>
      {classCounts().map(({ cls, count }) => (
        <Link key={cls} href={`/products?cat=${encodeURIComponent(cls)}`} aria-current={active === cls ? "page" : undefined}>
          {cls}<span>{count}</span>
        </Link>
      ))}
    </nav>
  );
}
