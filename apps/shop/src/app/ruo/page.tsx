import type { Metadata } from "next";
import ProsePage from "@/components/store/ProsePage";

export const metadata: Metadata = { title: "Research Use Only", alternates: { canonical: "/ruo" } };

export default function RuoPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title={<>Research <em>use only.</em></>}
      sections={[
        { heading: "What that means", body: <p>Every compound sold by Aura Protocols is intended solely for in-vitro laboratory research. None is a drug, dietary supplement, cosmetic, or food, and none is approved by the FDA.</p> },
        { heading: "What we don't do", body: <p>We don&apos;t provide instructions for use, preparation guidance, or any claim about effects in humans or animals, and our partners agree to the same rules.</p> },
        { heading: "Who can buy", body: <p>Purchasers must be 21 or older and confirm research use before entering the Site. We refuse or cancel orders when there is reason to believe a product is intended for any other purpose.</p> },
        { heading: "Your responsibility", body: <p>Purchasers are responsible for handling, storage, and disposal in accordance with all applicable laws and institutional policies.</p> },
      ]}
    />
  );
}
