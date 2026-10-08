import { dateLabel } from "@/lib/today/time";

// Order-by → lot tested ≈ → ships about. Phones get the short labels (mock w8).
export default function RunStrip({ cutoff, testedAbout, shipsAbout, style }: { cutoff: string; testedAbout: string; shipsAbout: string; style?: React.CSSProperties }) {
  return (
    <div className="s-ws-run" style={style}>
      <div><span className="s-micro">Order by</span><b>{dateLabel(cutoff)}</b></div>
      <div><span className="s-micro"><span className="s-ws-long">Lot tested ≈</span><span className="s-ws-short">Tested ≈</span></span><b>{dateLabel(testedAbout)}</b></div>
      <div><span className="s-micro"><span className="s-ws-long">Ships about</span><span className="s-ws-short">Ships ≈</span></span><b>{dateLabel(shipsAbout)}</b></div>
    </div>
  );
}
