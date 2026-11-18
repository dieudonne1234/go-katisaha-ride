import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SCREEN_TRANSLATIONS } from "./screen-translations";

export type Lang = "en" | "rw" | "fr";
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "rw", label: "Kinyarwanda", short: "RW" },
  { code: "fr", label: "Français", short: "FR" },
];

const en = {
  "nav.home": "Home",
  "nav.search": "Search",
  "nav.tickets": "My Tickets",
  "nav.alerts": "Alerts",
  "nav.profile": "Profile",
  "nav.agencies": "Agencies",
  "nav.timetable": "Timetable",
  "nav.stations": "Stations",
  "nav.dashboard": "Dashboard",
  "nav.adminDashboard": "Admin Dashboard",
  "nav.allPages": "All pages",
  "nav.staff": "Staff",
  "nav.staffHint": "Sign in with a staff account to manage stations, buses and bookings.",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.openMenu": "Open menu",
  "nav.language": "Language",
  "net.online": "Online",
  "net.offline": "Offline",
  "net.banner": "You are offline — showing saved data. Booking and payment need a connection.",
  "home.kicker": "Rwanda Bus Network",
  "home.title": "Book your journey across Rwanda",
  "home.lead":
    "Compare departures from Horizon Express, Volcano Express and Stella Express, choose your exact seat and travel with an instant digital QR ticket.",
  "home.from": "From",
  "home.to": "To",
  "home.date": "Date",
  "home.passengers": "Passengers",
  "home.departure": "Departure station",
  "home.destination": "Destination station",
  "home.searchBuses": "Search buses",
  "home.sameStation": "Departure and destination must be different stations.",
  "home.upcoming": "Upcoming trip",
  "home.popular": "Popular destinations",
  "home.agencies": "Available agencies",
  "home.fromPrice": "from",
  "home.tip1t": "Book 14 days ahead",
  "home.tip1b": "Daily departures at 06:30, 10:00 and 15:30 on every corridor.",
  "home.tip2t": "Guaranteed seat",
  "home.tip2b": "Seats are locked the moment you reserve — no double bookings.",
  "home.tip3t": "Arrive 20 min early",
  "home.tip3b": "Show your QR ticket at the gate for a quick scan and boarding.",
  "tickets.title": "My tickets",
  "tickets.lead": "Every booking you have made with KATISHA BUS.",
  "tickets.signIn": "Sign in to see your tickets.",
  "tickets.none": "No bookings yet.",
  "tickets.find": "Find a trip",
  "tickets.refresh": "Refresh tickets",
  "tickets.checking": "Checking…",
  "tickets.seats": "Seats",
  "tickets.view": "View",
  "tickets.loading": "Loading your digital tickets…",
  "tickets.account": "Checking your account…",
  "tickets.error": "Your tickets could not be loaded. Check your connection and try again.",
};
type Dict = Record<keyof typeof en, string>;

const rw: Dict = {
  "nav.home": "Ahabanza",
  "nav.search": "Shakisha",
  "nav.tickets": "Amatike yanjye",
  "nav.alerts": "Amatangazo",
  "nav.profile": "Umwirondoro",
  "nav.agencies": "Ibigo",
  "nav.timetable": "Ingengabihe",
  "nav.stations": "Gare",
  "nav.dashboard": "Ubuyobozi",
  "nav.adminDashboard": "Ubuyobozi bw'ikigo",
  "nav.allPages": "Paji zose",
  "nav.staff": "Abakozi",
  "nav.staffHint": "Injira ukoresheje konti y'umukozi kugira ngo ucunge gare, bisi n'amatike.",
  "nav.signIn": "Injira",
  "nav.signOut": "Sohoka",
  "nav.openMenu": "Fungura menu",
  "nav.language": "Ururimi",
  "net.online": "Uri kuri murandasi",
  "net.offline": "Nta murandasi",
  "net.banner":
    "Nta murandasi ufite — turerekana amakuru abitswe. Kugura itike no kwishyura bisaba murandasi.",
  "home.kicker": "Urusobe rwa bisi mu Rwanda",
  "home.title": "Fata itike y'urugendo rwawe mu Rwanda",
  "home.lead":
    "Gereranya ingendo za Horizon Express, Volcano Express na Stella Express, uhitemo intebe yawe, ugende ufite itike ya QR ako kanya.",
  "home.from": "Uva",
  "home.to": "Ujya",
  "home.date": "Itariki",
  "home.passengers": "Abagenzi",
  "home.departure": "Gare uvamo",
  "home.destination": "Gare ujyamo",
  "home.searchBuses": "Shakisha bisi",
  "home.sameStation": "Gare uvamo n'iyo ujyamo zigomba gutandukana.",
  "home.upcoming": "Urugendo rutaha",
  "home.popular": "Aho abantu bajya cyane",
  "home.agencies": "Ibigo bihari",
  "home.fromPrice": "guhera kuri",
  "home.tip1t": "Fata itike iminsi 14 mbere",
  "home.tip1b": "Ingendo za buri munsi saa 06:30, 10:00 na 15:30 ku nzira zose.",
  "home.tip2t": "Intebe yizewe",
  "home.tip2b": "Intebe ifatwa ako kanya ukimara kuyihitamo — nta guhurirwaho.",
  "home.tip3t": "Hagera iminota 20 mbere",
  "home.tip3b": "Erekana itike yawe ya QR ku muryango kugira ngo uyisuzumishe vuba.",
  "tickets.title": "Amatike yanjye",
  "tickets.lead": "Amatike yose waguze kuri KATISHA BUS.",
  "tickets.signIn": "Injira kugira ngo urebe amatike yawe.",
  "tickets.none": "Nta tike uragura.",
  "tickets.find": "Shakisha urugendo",
  "tickets.refresh": "Vugurura amatike",
  "tickets.checking": "Turimo kureba…",
  "tickets.seats": "Intebe",
  "tickets.view": "Reba",
  "tickets.loading": "Turimo gufungura amatike yawe…",
  "tickets.account": "Turimo kugenzura konti yawe…",
  "tickets.error": "Amatike yawe ntiyabashije gufunguka. Reba murandasi wongere ugerageze.",
};

const fr: Dict = {
  "nav.home": "Accueil",
  "nav.search": "Recherche",
  "nav.tickets": "Mes billets",
  "nav.alerts": "Alertes",
  "nav.profile": "Profil",
  "nav.agencies": "Agences",
  "nav.timetable": "Horaires",
  "nav.stations": "Gares",
  "nav.dashboard": "Tableau de bord",
  "nav.adminDashboard": "Tableau de bord admin",
  "nav.allPages": "Toutes les pages",
  "nav.staff": "Personnel",
  "nav.staffHint":
    "Connectez-vous avec un compte du personnel pour gérer gares, bus et réservations.",
  "nav.signIn": "Se connecter",
  "nav.signOut": "Se déconnecter",
  "nav.openMenu": "Ouvrir le menu",
  "nav.language": "Langue",
  "net.online": "En ligne",
  "net.offline": "Hors ligne",
  "net.banner":
    "Vous êtes hors ligne — données enregistrées affichées. La réservation et le paiement nécessitent une connexion.",
  "home.kicker": "Réseau de bus du Rwanda",
  "home.title": "Réservez votre voyage à travers le Rwanda",
  "home.lead":
    "Comparez les départs de Horizon Express, Volcano Express et Stella Express, choisissez votre siège et voyagez avec un billet QR instantané.",
  "home.from": "Départ",
  "home.to": "Arrivée",
  "home.date": "Date",
  "home.passengers": "Passagers",
  "home.departure": "Gare de départ",
  "home.destination": "Gare d'arrivée",
  "home.searchBuses": "Rechercher des bus",
  "home.sameStation": "Les gares de départ et d'arrivée doivent être différentes.",
  "home.upcoming": "Prochain voyage",
  "home.popular": "Destinations populaires",
  "home.agencies": "Agences disponibles",
  "home.fromPrice": "à partir de",
  "home.tip1t": "Réservez 14 jours à l'avance",
  "home.tip1b": "Départs quotidiens à 06:30, 10:00 et 15:30 sur chaque ligne.",
  "home.tip2t": "Siège garanti",
  "home.tip2b": "Les sièges sont bloqués dès la réservation — aucune double réservation.",
  "home.tip3t": "Arrivez 20 min en avance",
  "home.tip3b": "Présentez votre billet QR à l'entrée pour un embarquement rapide.",
  "tickets.title": "Mes billets",
  "tickets.lead": "Toutes vos réservations avec KATISHA BUS.",
  "tickets.signIn": "Connectez-vous pour voir vos billets.",
  "tickets.none": "Aucune réservation pour l'instant.",
  "tickets.find": "Trouver un trajet",
  "tickets.refresh": "Actualiser les billets",
  "tickets.checking": "Vérification…",
  "tickets.seats": "Sièges",
  "tickets.view": "Voir",
  "tickets.loading": "Chargement de vos billets…",
  "tickets.account": "Vérification de votre compte…",
  "tickets.error": "Vos billets n'ont pas pu être chargés. Vérifiez votre connexion et réessayez.",
};

export const DICTS: Record<Lang, Dict> = { en, rw, fr };
export type TKey = keyof typeof en;
const STORAGE = "ktb.lang";

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
  tr: (text: string, values?: Record<string, string | number>) => string;
}>({
  lang: "en",
  setLang: () => {},
  t: (k) => en[k],
  tr: (text) => text,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE);
    if (saved === "rw" || saved === "fr" || saved === "en") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "rw" ? "rw" : lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE, l);
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback((k: TKey) => DICTS[lang][k] ?? en[k], [lang]);
  const tr = useCallback(
    (text: string, values?: Record<string, string | number>) => {
      const translated = SCREEN_TRANSLATIONS[text]?.[lang] ?? text;
      return translated.replace(/\{(\w+)\}/g, (match, key: string) =>
        String(values?.[key] ?? match),
      );
    },
    [lang],
  );
  return <Ctx.Provider value={{ lang, setLang, t, tr }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
