import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContactForm from "@/components/store/ContactForm";

describe("ContactForm", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, ref: "Q-1047" }) })); });

  it("signed out: asks for name, email and an optional order number; posts the topic; shows the Q-number", async () => {
    render(<ContactForm signedIn={null} orders={[]} />);
    fireEvent.click(screen.getByLabelText("Order question"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dana" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dana@example.com" } });
    fireEvent.change(screen.getByLabelText("Order number (optional)"), { target: { value: "AP-1052" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Two vials cracked." } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Q-1047"));
    const body = JSON.parse((fetch as unknown as { mock: { calls: Array<[string, { body: string }]> } }).mock.calls[0][1].body);
    expect(body).toEqual({ topic: "order", name: "Dana", email: "dana@example.com", orderNumber: "AP-1052", message: "Two vials cracked.", website: "" });
  });

  it("signed in: shows who, offers their orders, no name/email fields", () => {
    render(<ContactForm signedIn={{ name: "Dana Whitfield", email: "dana.w@example.com" }} orders={[{ number: "AP-1052", label: "AP-1052 · Oct 1 · $268.00" }]} />);
    expect(screen.getByText(/Signed in as/)).toHaveTextContent("Dana Whitfield · dana.w@example.com");
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.getByRole("option", { name: "AP-1052 · Oct 1 · $268.00" })).toBeInTheDocument();
  });

  it("shows the server's error (e.g. too many tries)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "You've sent several messages already — please wait an hour and try again." }) }));
    render(<ContactForm signedIn={{ name: "D", email: "d@x.com" }} orders={[]} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("wait an hour"));
  });
});
