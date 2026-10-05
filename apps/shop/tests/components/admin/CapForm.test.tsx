import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const setCapAction = vi.fn();
vi.mock("@/app/admin/discounts/actions", () => ({ setCapAction }));

const { default: CapForm } = await import("@/components/admin/discounts/CapForm");

describe("CapForm", () => {
  beforeEach(() => { setCapAction.mockReset(); });

  it("reads no unsaved changes until the field is edited, then names the pending change", () => {
    render(<CapForm cap={30} aside={<div />} after={<div />} />);
    expect(screen.getByText("No unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "25" } });
    expect(screen.getByText("Cap changes from 30% to 25%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeEnabled();
  });

  it("discard reverts the field and the save bar together", () => {
    render(<CapForm cap={30} aside={<div />} after={<div />} />);
    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByLabelText("Maximum discount")).toHaveValue(30);
    expect(screen.getByText("No unsaved changes")).toBeInTheDocument();
  });

  it("shows the server error after a submit that fails", async () => {
    setCapAction.mockResolvedValue({ error: "Use a whole percent from 15 to 60." });
    const { container } = render(<CapForm cap={30} aside={<div />} after={<div />} />);
    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "5" } });
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Use a whole percent from 15 to 60.");
  });

  it("clears the error as soon as the field is edited again", async () => {
    setCapAction.mockResolvedValue({ error: "Use a whole percent from 15 to 60." });
    const { container } = render(<CapForm cap={30} aside={<div />} after={<div />} />);
    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "5" } });
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "20" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears the error when Discard is pressed instead", async () => {
    setCapAction.mockResolvedValue({ error: "Use a whole percent from 15 to 60." });
    const { container } = render(<CapForm cap={30} aside={<div />} after={<div />} />);
    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "5" } });
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows Saved once the page re-renders with the new cap, until edited again", async () => {
    setCapAction.mockResolvedValue({ ok: true });
    const { container, rerender } = render(<CapForm cap={30} aside={<div />} after={<div />} />);
    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "25" } });
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });

    // The server action revalidates the page; the new cap arrives as a prop.
    rerender(<CapForm cap={25} aside={<div />} after={<div />} />);
    expect(await screen.findByText("Saved")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Maximum discount"), { target: { value: "40" } });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.getByText("Cap changes from 25% to 40%")).toBeInTheDocument();
  });

  it("renders the aside and after content around the single save bar", () => {
    render(<CapForm cap={30} aside={<div data-testid="aside">Aside</div>} after={<div data-testid="after">After</div>} />);
    expect(screen.getByTestId("aside")).toBeInTheDocument();
    expect(screen.getByTestId("after")).toBeInTheDocument();
    expect(screen.getAllByText(/No unsaved changes|Cap changes/)).toHaveLength(1);
  });
});
