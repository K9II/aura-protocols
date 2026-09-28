import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "@/components/store/CartProvider";
import CartDrawer from "@/components/store/CartDrawer";

function OpenButton() {
  const { setOpen } = useCart();
  return <button onClick={() => setOpen(true)}>open drawer</button>;
}

describe("CartDrawer", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("locks body scroll while open and restores it on close", async () => {
    render(
      <CartProvider>
        <OpenButton />
        <CartDrawer />
      </CartProvider>,
    );
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(screen.getByText("open drawer"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByLabelText("Close cart"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.style.overflow).toBe("");
  });

  it("moves focus to the close button on open and restores it to the trigger on close", async () => {
    render(
      <CartProvider>
        <OpenButton />
        <CartDrawer />
      </CartProvider>,
    );
    const trigger = screen.getByText("open drawer");
    trigger.focus();
    fireEvent.click(trigger);

    const closeBtn = await screen.findByLabelText("Close cart");
    await waitFor(() => expect(closeBtn).toHaveFocus());

    fireEvent.click(closeBtn);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("traps Tab focus within the dialog", async () => {
    render(
      <CartProvider>
        <OpenButton />
        <CartDrawer />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("open drawer"));
    const closeBtn = await screen.findByLabelText("Close cart");
    await waitFor(() => expect(closeBtn).toHaveFocus());

    // Shift+Tab from the first focusable element (close button) wraps to the last.
    fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    expect(focusable[focusable.length - 1]).toHaveFocus();
  });
});
