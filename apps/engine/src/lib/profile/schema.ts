import { z } from "zod";
import { BUDGET_TIERS } from "@/lib/constants";

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  biological_sex: z.enum(["male", "female", "other", "prefer_not_to_say"]).nullable().optional(),
  weight_kg: z.number().min(30).max(300).nullable().optional(),
  activity_level: z.enum(["sedentary", "moderate", "active", "athlete"]).nullable().optional(),
  primary_goal: z.enum(["recovery", "body_comp", "sleep_stress", "performance", "longevity"]).nullable().optional(),
  current_medications: z.string().nullable().optional(),
  using_peptides: z.boolean().default(false),
  peptides_detail: z.string().nullable().optional(),
  interested_in_rx: z.boolean().default(false),
  budget_tier: z.enum(BUDGET_TIERS).nullable().optional(),
  glp1_status: z.enum(["never", "current", "recently_stopped"]).nullable().optional(),
  glp1_stopped_month: z.string().nullable().optional(),
  menopause_status: z.enum(["pre", "peri", "post", "not_applicable"]).nullable().optional(),
  onboarding_complete: z.boolean().default(false),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ProfileContextSchema = UserProfileSchema.omit({ id: true });
export type ProfileContext = z.infer<typeof ProfileContextSchema>;
