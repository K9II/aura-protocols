import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GuideNav from "@/components/admin/guide/GuideNav";

describe("GuideNav", () => {
  it("lists every chapter as an anchor", () => {
    render(<GuideNav />);
    const nav = screen.getByRole("navigation", { name: "Guide contents" });
    expect(nav.querySelector('a[href="#discounts"]')).toHaveTextContent("Discounts");
    expect(nav.querySelector('a[href="#payouts"]')).toHaveTextContent("Payouts");
    expect(nav.querySelector('a[href="#inquiries"]')).toHaveTextContent("Inquiries");
  });

  it("opens the first chapter's sections by default", () => {
    render(<GuideNav />);
    expect(screen.getByRole("link", { name: "Common tasks" })).toHaveAttribute("href", "#start-tasks");
  });

  it("the phone menu jumps to a chapter", () => {
    render(<GuideNav />);
    fireEvent.change(screen.getByLabelText("Jump to chapter"), { target: { value: "orders" } });
    expect(window.location.hash).toBe("#orders");
  });
});
