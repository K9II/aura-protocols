"use client";
import { useRef } from "react";
import { stopAction } from "@/app/admin/email/actions";
import { Icon } from "@/components/admin/ui";

export default function StopDialog({ id, done, total }: { id: string; done: number; total: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const n = (x: number) => x.toLocaleString("en-US");
  return (
    <>
      <button type="button" className="a-btn danger" onClick={() => ref.current?.showModal()}><Icon name="stop" />Stop sending…</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`stop-${id}`}>
        <form action={stopAction}>
          <input type="hidden" name="id" value={id} />
          <div className="a-modal-h"><h2 id={`stop-${id}`}>Stop sending?</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-balance"><span>Sent so far</span><span className="to">{n(done)} of {n(total)}</span></div>
            <ul className="a-effects">
              <li><Icon name="stop" /><span>The other {n(Math.max(0, total - done))} people won&apos;t get this campaign.</span></li>
              <li><Icon name="lock" /><span>A stopped campaign can&apos;t be restarted. To reach them later, make a new campaign.</span></li>
            </ul>
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Keep sending</button>
            <button type="submit" className="a-btn danger-fill"><Icon name="stop" />Stop sending</button></div></div>
        </form>
      </dialog>
    </>
  );
}
