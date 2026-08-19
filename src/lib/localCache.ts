/**
 * Lightweight local cache (browser localStorage).
 * Mirrors the offline/local-storage layer of the mobile app: recent searches,
 * cached station list and last known offline tickets.
 */

const KEY = {
  recentSearches: "ktb.recentSearches",
  stations: "ktb.stations",
  tickets: "ktb.offlineTickets",
  passenger: "ktb.passengerDetails",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — ignore */
  }
}

export type RecentSearch = {
  from: number;
  to: number;
  fromName: string;
  toName: string;
  date: string;
  pax: number;
};

export function getRecentSearches(): RecentSearch[] {
  return read<RecentSearch[]>(KEY.recentSearches, []);
}

export function pushRecentSearch(entry: RecentSearch) {
  const existing = getRecentSearches().filter(
    (s) => !(s.from === entry.from && s.to === entry.to && s.date === entry.date),
  );
  write(KEY.recentSearches, [entry, ...existing].slice(0, 5));
}

export function clearRecentSearches() {
  write(KEY.recentSearches, []);
}

export type CachedStation = { id: number; name: string; city: string; code: string };

export function cacheStations(stations: CachedStation[]) {
  write(KEY.stations, stations);
}

export function getCachedStations(): CachedStation[] {
  return read<CachedStation[]>(KEY.stations, []);
}

export type OfflineTicket = {
  bookingRef: string;
  bookingId: string;
  agency: string;
  route: string;
  date: string;
  departure: string;
  seats: string;
  amount: number;
};

export function cacheTickets(tickets: OfflineTicket[]) {
  write(KEY.tickets, tickets);
}

export function getCachedTickets(): OfflineTicket[] {
  return read<OfflineTicket[]>(KEY.tickets, []);
}

export type PassengerDetails = { name: string; phone: string; email: string };

export function savePassengerDetails(details: PassengerDetails) {
  write(KEY.passenger, details);
}

export function getPassengerDetails(): PassengerDetails | null {
  return read<PassengerDetails | null>(KEY.passenger, null);
}
