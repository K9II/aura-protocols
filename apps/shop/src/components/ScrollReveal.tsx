"use client";

import { useEffect } from "react";

/** Fades/rises `.p-reveal` elements into view as they enter the viewport. No-op under prefers-reduced-motion. */
export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".p-reveal").forEach((el) => el.classList.add("in-view"));
      return;
    }
    const els = document.querySelectorAll(".p-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
