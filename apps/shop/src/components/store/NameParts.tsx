import { Fragment } from "react";

// A blend's name breaks only around its slashes, never inside a part ("TB-" / "500").
// Shared by the compound card, the lot card and search (2026-10-20).
export default function NameParts({ name }: { name: string }) {
  if (!name.includes(" / ")) return <>{name}</>;
  return <>{name.split(" / ").map((p, i) => <Fragment key={i}>{i ? " / " : ""}<span className="s-card-nw">{p}</span></Fragment>)}</>;
}
