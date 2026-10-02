import { z } from "zod";

// US-only shipping (50 states + DC).
export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN",
  "MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
] as const;

export const shipAddressSchema = z.object({
  name: z.string().trim().min(1).max(100),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().nullable().transform((v) => (v ? v : null)),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().transform((s) => s.toUpperCase()).pipe(z.enum(US_STATES)),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
});

export type ShipAddress = z.infer<typeof shipAddressSchema>;
