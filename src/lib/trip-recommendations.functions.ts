import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { recommendTrips } from "./trip-recommendations.server";

export const findRecommendedTrips = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    description: z.string().trim().min(3).max(1000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    originId: z.number().int().positive().nullable(),
    passengers: z.number().int().min(1).max(5),
  }).strict().parse(input))
  .handler(({ data }) => recommendTrips(getRequest(), data));