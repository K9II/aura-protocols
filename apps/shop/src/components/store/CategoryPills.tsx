import Link from "next/link";
import type { ChemicalClass, Compound } from "@/data/catalog";
import { classCounts } from "@/lib/catalog";
import { CLASS_COLOR } from "@/lib/class-colors";

export default function CategoryPills({ catalog, active }: { catalog: Compound[]; active?: ChemicalClass }) {
  return (
    <nav className="s-pills" aria-label="Filter by chemical class">
      <Link href="/products" aria-current={!active ? "page" : undefined}>
        All<span>{catalog.length}</span>
      </Link>
      {classCounts(catalog).map(({ cls, count }) => (
        <Link key={cls} href={`/products?cat=${encodeURIComponent(cls)}`} aria-current={active === cls ? "page" : undefined}>
          <i aria-hidden style={{ background: CLASS_COLOR[cls] }} />{cls}<span>{count}</span>
        </Link>
      ))}
    </nav>
  );
}
