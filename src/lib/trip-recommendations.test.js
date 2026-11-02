import { test, expect } from "bun:test";
import { matchAvailableTrips, verifiedRecommendations } from "./trip-recommendations";

const intent = { origin: "Kigali", destination: "Musanze", date: "2026-11-03", passengers: 2, maximumFare: 6000, earliestDeparture: null, latestDeparture: "11:59", agency: null, busType: null, priority: "price" };
const trip = { id: 1, travel_date: "2026-11-03", departure_time: "08:00:00", arrival_time: "10:00:00", price_rwf: 5000, available_seats: 2, agency: { name: "Horizon Express" }, bus: { seat_capacity: 30, bus_type: "STANDARD" }, route: { duration_minutes: 120, origin: { id: 1, name: "Nyabugogo", city: "Kigali" }, destination: { id: 2, name: "Musanze Bus Station", city: "Musanze" } } };

test("recommendations only include available schedules for the requested date", () => {
  expect(matchAvailableTrips([trip, { ...trip, id: 2, travel_date: "2026-11-04" }], intent, "2026-11-03").map((t) => t.id)).toEqual([1]);
});
test("a request for two passengers excludes departures with one remaining seat", () => {
  expect(matchAvailableTrips([{ ...trip, available_seats: 1 }], intent, "2026-11-03")).toEqual([]);
});
test("morning under 6000 RWF excludes over-budget and afternoon departures", () => {
  expect(matchAvailableTrips([trip, { ...trip, id: 2, price_rwf: 6001 }, { ...trip, id: 3, departure_time: "12:00:00" }], intent, "2026-11-03").map((t) => t.id)).toEqual([1]);
});
test("recommendations cannot invent a trip outside available schedules", () => {
  expect(verifiedRecommendations([999, 1, 1], [trip]).map((t) => t.id)).toEqual([1]);
});
test("destination and explicit agency must match actual schedules", () => {
  expect(matchAvailableTrips([trip], { ...intent, destination: "Rubavu" }, "2026-11-03")).toEqual([]);
  expect(matchAvailableTrips([trip], { ...intent, agency: "Volcano" }, "2026-11-03")).toEqual([]);
});
test("cheapest preference sorts by the actual fare", () => {
  expect(matchAvailableTrips([trip, { ...trip, id: 2, price_rwf: 4000 }], intent, "2026-11-03").map((t) => t.id)).toEqual([2, 1]);
});