import { AuditResult } from "./types";

/**
 * What kind of business is this, and what words does it use?
 *
 * Bleed started calibrated for restaurants with delivery, and the whole report
 * spoke that dialect: tickets, diners, the kitchen. The leaks themselves were
 * never about food. A platform standing between a business and its customer
 * and charging for the introduction is Glovo for a pizzeria, Booking.com for a
 * guesthouse, Doctoralia for a dentist and Amazon for a shop. A page that takes
 * four seconds to load loses the customer whatever it sells.
 *
 * So the engine prices the same universal leaks for every business, and the
 * vertical decides three things only: the words on screen, what one
 * transaction is worth, and which platforms to look for.
 *
 * Classification is deterministic and shows its evidence. When nothing scores
 * high enough the answer is "generic", which prices only the leaks that need no
 * assumption about the trade. Guessing a vertical to unlock a bigger number
 * would be the same sin as inventing the number.
 */

export type VerticalId =
  | "restaurant"
  | "retail"
  | "lodging"
  | "appointment"
  | "trade"
  | "professional"
  | "generic";

/** How often a business of this kind counts its transactions. */
export type RatePeriod = "day" | "week" | "month";

/** The vocabulary the report speaks for this trade. Sentence case, plain words. */
export interface Words {
  /** One transaction: "order", "booking", "appointment", "job", "enquiry". */
  transaction: string;
  transactions: string;
  /** The person on the other side: "diner", "guest", "patient", "client". */
  customer: string;
  customers: string;
  /** Where the money ends up, in the owner's language: "kitchen", "shop". */
  place: string;
  /** What the site lists: "menu", "catalogue", "rooms", "services". */
  catalogue: string;
  /** Label for the value of one transaction in the simulator. */
  valueLabel: string;
  /** Label for how many of them happen, already carrying the period. */
  rateLabel: string;
  /** What the platforms are called here: "delivery apps", "booking sites". */
  marketplaceLabel: string;
  /** The verb a customer performs: "order", "book", "hire", "get in touch". */
  verb: string;
}

export interface VerticalDefinition {
  id: VerticalId;
  /** Shown on screen when the report says what it thinks this business is. */
  label: string;
  words: Words;
  ratePeriod: RatePeriod;
  /** schema.org @type values that identify this trade outright. */
  schemaTypes: string[];
  /** Words on the page that point here. Lowercase, English and Spanish. */
  keywords: string[];
  /** Platforms that charge this trade for the introduction. */
  marketplaces: MarketplaceDefinition[];
  /** Booking or appointment systems typical of this trade. */
  bookingProviders: string[];
}

export interface MarketplaceDefinition {
  /** Name as the owner knows it. */
  name: string;
  /** Substrings that identify it in a link or in the page source. */
  match: string[];
  vertical: VerticalId;
}

export const PERIODS_PER_YEAR: Record<RatePeriod, number> = {
  day: 365,
  week: 52,
  month: 12,
};

export const VERTICALS: Record<VerticalId, VerticalDefinition> = {
  restaurant: {
    id: "restaurant",
    label: "Restaurant or food service",
    ratePeriod: "day",
    words: {
      transaction: "order",
      transactions: "orders",
      customer: "diner",
      customers: "diners",
      place: "kitchen",
      catalogue: "menu",
      valueLabel: "Average delivery ticket",
      rateLabel: "Delivery orders a day",
      marketplaceLabel: "delivery apps",
      verb: "order",
    },
    schemaTypes: [
      "Restaurant",
      "FoodEstablishment",
      "CafeOrCoffeeShop",
      "BarOrPub",
      "Bakery",
      "FastFoodRestaurant",
      "IceCreamShop",
      "Brewery",
      "Distillery",
      "Winery",
    ],
    /* Discriminating phrases only. A bare "menu" would match the navigation
       button on half the web, so the list asks for how a kitchen writes. */
    keywords: [
      "menu del dia",
      "nuestra carta",
      "la carta",
      "carta de",
      "pedir a domicilio",
      "a domicilio",
      "order online",
      "takeaway",
      "para llevar",
      "delivery",
      "reservar mesa",
      "book a table",
      "restaurante",
      "pizzeria",
      "cafeteria",
      "tapas",
      "nuestros platos",
      "cocina",
    ],
    marketplaces: [
      { name: "Glovo", match: ["glovoapp", "glovo.com", "glovo.es"], vertical: "restaurant" },
      { name: "Just Eat", match: ["just-eat", "justeat"], vertical: "restaurant" },
      { name: "Uber Eats", match: ["ubereats", "uber.com/es/es/store"], vertical: "restaurant" },
      { name: "Deliveroo", match: ["deliveroo"], vertical: "restaurant" },
      { name: "El Tenedor", match: ["eltenedor", "thefork"], vertical: "restaurant" },
    ],
    bookingProviders: ["covermanager", "thefork", "eltenedor", "opentable", "resdiary", "restoo"],
  },

  retail: {
    id: "retail",
    label: "Shop selling goods",
    ratePeriod: "day",
    words: {
      transaction: "sale",
      transactions: "sales",
      customer: "customer",
      customers: "customers",
      place: "shop",
      catalogue: "catalogue",
      valueLabel: "Average basket",
      rateLabel: "Online sales a day",
      marketplaceLabel: "marketplaces",
      verb: "buy",
    },
    schemaTypes: [
      "Store",
      "OnlineStore",
      "ClothingStore",
      "ShoeStore",
      "JewelryStore",
      "BookStore",
      "FurnitureStore",
      "HardwareStore",
      "ElectronicsStore",
      "SportingGoodsStore",
      "PetStore",
      "Florist",
      "GroceryStore",
      "ToyStore",
    ],
    keywords: [
      "add to cart",
      "anadir al carrito",
      "anadir a la cesta",
      "comprar ahora",
      "buy now",
      "envio gratis",
      "free shipping",
      "tienda online",
      "nuestra tienda",
      "checkout",
      "mi cesta",
      "mi carrito",
      "devoluciones",
      "gastos de envio",
      "en stock",
    ],
    marketplaces: [
      { name: "Amazon", match: ["amazon.es/", "amazon.com/", "amzn.to"], vertical: "retail" },
      { name: "Etsy", match: ["etsy.com"], vertical: "retail" },
      { name: "eBay", match: ["ebay.es", "ebay.com"], vertical: "retail" },
      { name: "Wallapop", match: ["wallapop"], vertical: "retail" },
      { name: "AliExpress", match: ["aliexpress"], vertical: "retail" },
      { name: "Miravia", match: ["miravia"], vertical: "retail" },
    ],
    bookingProviders: [],
  },

  lodging: {
    id: "lodging",
    label: "Hotel or holiday rental",
    ratePeriod: "day",
    words: {
      transaction: "booking",
      transactions: "bookings",
      customer: "guest",
      customers: "guests",
      place: "house",
      catalogue: "rooms",
      valueLabel: "Average booking",
      rateLabel: "Bookings a day",
      marketplaceLabel: "booking sites",
      verb: "book",
    },
    schemaTypes: [
      "Hotel",
      "LodgingBusiness",
      "BedAndBreakfast",
      "Hostel",
      "Motel",
      "Resort",
      "Campground",
      "VacationRental",
      "Apartment",
    ],
    keywords: [
      "book now",
      "reservar ahora",
      "check-in",
      "check in",
      "habitaciones",
      "habitacion doble",
      "rooms",
      "hotel",
      "hoteles",
      "per night",
      "por noche",
      "disponibilidad",
      "availability",
      "alojamiento",
      "apartamentos turisticos",
      "desayuno incluido",
      "huespedes",
    ],
    marketplaces: [
      { name: "Booking.com", match: ["booking.com"], vertical: "lodging" },
      { name: "Airbnb", match: ["airbnb."], vertical: "lodging" },
      { name: "Expedia", match: ["expedia."], vertical: "lodging" },
      { name: "Hotels.com", match: ["//hotels.com", ".hotels.com", "www.hotels.com"], vertical: "lodging" },
      { name: "Vrbo", match: ["vrbo."], vertical: "lodging" },
      { name: "TripAdvisor", match: ["tripadvisor."], vertical: "lodging" },
    ],
    bookingProviders: ["mirai", "roiback", "siteminder", "cloudbeds", "avirato", "witbooking", "paraty"],
  },

  appointment: {
    id: "appointment",
    label: "Practice booking appointments",
    ratePeriod: "week",
    words: {
      transaction: "appointment",
      transactions: "appointments",
      customer: "patient",
      customers: "patients",
      place: "practice",
      catalogue: "services",
      valueLabel: "Average appointment",
      rateLabel: "Appointments a week",
      marketplaceLabel: "booking platforms",
      verb: "book",
    },
    schemaTypes: [
      "Dentist",
      "MedicalClinic",
      "Physician",
      "MedicalBusiness",
      "HealthAndBeautyBusiness",
      "BeautySalon",
      "HairSalon",
      "NailSalon",
      "DaySpa",
      "Optician",
      "Physiotherapy",
      "VeterinaryCare",
      "SportsActivityLocation",
      "HealthClub",
      "Gym",
      "Psychologist",
    ],
    keywords: [
      "pedir cita",
      "pide tu cita",
      "cita previa",
      "solicitar cita",
      "cita online",
      "book an appointment",
      "reservar cita",
      "primera consulta",
      "tratamientos",
      "treatments",
      "our team",
      "nuestro equipo",
      "clinica",
      "consulta",
      "sesion",
      "session",
      "dentista",
      "fisioterapia",
      "peluqueria",
      "estetica",
      "nuestros profesionales",
      "primera visita",
    ],
    marketplaces: [
      { name: "Doctoralia", match: ["doctoralia"], vertical: "appointment" },
      { name: "Treatwell", match: ["treatwell"], vertical: "appointment" },
      { name: "Booksy", match: ["booksy"], vertical: "appointment" },
      { name: "Fresha", match: ["fresha.com"], vertical: "appointment" },
      { name: "Top Doctors", match: ["topdoctors"], vertical: "appointment" },
      { name: "Mindbody", match: ["mindbodyonline"], vertical: "appointment" },
    ],
    bookingProviders: ["calendly", "simplybook", "booksy", "fresha", "acuity", "reservio", "timify"],
  },

  trade: {
    id: "trade",
    label: "Trade working on site",
    ratePeriod: "week",
    words: {
      transaction: "job",
      transactions: "jobs",
      customer: "client",
      customers: "clients",
      place: "business",
      catalogue: "services",
      valueLabel: "Average job",
      rateLabel: "Jobs a week",
      marketplaceLabel: "lead marketplaces",
      verb: "hire",
    },
    schemaTypes: [
      "Plumber",
      "Electrician",
      "HVACBusiness",
      "RoofingContractor",
      "HousePainter",
      "Locksmith",
      "MovingCompany",
      "GeneralContractor",
      "HomeAndConstructionBusiness",
      "AutoRepair",
      "Carpenter",
      "CleaningService",
    ],
    keywords: [
      "presupuesto sin compromiso",
      "free quote",
      "pide presupuesto",
      "solicita presupuesto",
      "presupuesto gratis",
      "urgencias 24h",
      "24 hour",
      "instalacion",
      "reparacion",
      "mantenimiento",
      "obra",
      "reforma",
      "reformas",
      "averias",
      "urgencias",
      "24 horas",
      "emergency call",
    ],
    marketplaces: [
      { name: "Habitissimo", match: ["habitissimo"], vertical: "trade" },
      { name: "Cronoshare", match: ["cronoshare"], vertical: "trade" },
      { name: "Houzz", match: ["houzz."], vertical: "trade" },
      { name: "Thumbtack", match: ["thumbtack"], vertical: "trade" },
      { name: "Checkatrade", match: ["checkatrade"], vertical: "trade" },
    ],
    bookingProviders: ["calendly", "jobber", "servicem8"],
  },

  professional: {
    id: "professional",
    label: "Professional practice",
    ratePeriod: "month",
    words: {
      transaction: "new client",
      transactions: "new clients",
      customer: "client",
      customers: "clients",
      place: "practice",
      catalogue: "services",
      valueLabel: "Value of a new client",
      rateLabel: "New clients a month",
      marketplaceLabel: "directories",
      verb: "get in touch",
    },
    schemaTypes: [
      "LegalService",
      "Attorney",
      "AccountingService",
      "FinancialService",
      "InsuranceAgency",
      "RealEstateAgent",
      "Notary",
      "ProfessionalService",
      "ArchitectureFirm",
      "EmploymentAgency",
      "TravelAgency",
      "MarketingAgency",
      "ConsultingService",
    ],
    keywords: [
      "primera consulta gratuita",
      "free consultation",
      "asesoria",
      "despacho",
      "nuestros servicios",
      "case studies",
      "casos de exito",
      "honorarios",
      "contact us",
      "contacta con nosotros",
      "solicita informacion",
      "abogados",
      "gestoria",
      "consultoria",
      "asesoramiento",
    ],
    marketplaces: [
      { name: "Idealista", match: ["idealista"], vertical: "professional" },
      { name: "Fotocasa", match: ["fotocasa"], vertical: "professional" },
      { name: "Emagister", match: ["emagister"], vertical: "professional" },
      { name: "Malt", match: ["malt.es", "malt.fr"], vertical: "professional" },
      { name: "Clutch", match: ["clutch.co"], vertical: "professional" },
    ],
    bookingProviders: ["calendly", "hubspot meetings", "acuity"],
  },

  generic: {
    id: "generic",
    label: "Business",
    ratePeriod: "month",
    words: {
      transaction: "sale",
      transactions: "sales",
      customer: "customer",
      customers: "customers",
      place: "business",
      catalogue: "site",
      valueLabel: "Value of one sale",
      rateLabel: "Sales a month",
      marketplaceLabel: "platforms",
      verb: "buy",
    },
    schemaTypes: ["LocalBusiness", "Organization"],
    keywords: [],
    marketplaces: [],
    bookingProviders: ["calendly"],
  },
};

/** Every marketplace we know about, flattened for the crawler to match against. */
export const ALL_MARKETPLACES: MarketplaceDefinition[] = Object.values(VERTICALS).flatMap(
  (v) => v.marketplaces
);

/** Every booking system we know about, flattened for the crawler. */
export const ALL_BOOKING_PROVIDERS: string[] = Array.from(
  new Set(Object.values(VERTICALS).flatMap((v) => v.bookingProviders))
);

export interface VerticalVerdict {
  id: VerticalId;
  definition: VerticalDefinition;
  confidence: "high" | "medium" | "low";
  /** One line, shown on screen: why the report thinks this is that kind of business. */
  evidence: string;
  /** Every vertical's score, so the decision can be audited. */
  scores: Record<VerticalId, number>;
}

/* What each signal is worth. A declared schema.org type is the business saying
   what it is in machine-readable form, so it outweighs everything else. A link
   to a platform that only serves one trade is nearly as strong. Words on the
   page are the weakest: "menu" appears on sites that sell no food at all. */
/* Spanish sites write "clínica", "añadir", "reparación". A keyword list that
   only matches the unaccented spelling silently never fires. */
const flatten = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const WEIGHT_SCHEMA = 6;
const WEIGHT_MARKETPLACE = 4;
const WEIGHT_BOOKING = 2;
const WEIGHT_KEYWORD = 1;
const MAX_KEYWORD_SCORE = 3;
/** Below this, the report says "business" and prices only the universal leaks. */
const MIN_CONFIDENT_SCORE = 4;

export const VERTICAL_IDS = Object.keys(VERTICALS) as VerticalId[];

/**
 * The deterministic pass reads structured data and outgoing links. When a site
 * declares none of it — and plenty of small sites declare none of it — the
 * model that already reads the page for triage gets to name the trade instead.
 * It is never allowed to overrule evidence, only to fill a silence, and the
 * report says which of the two decided, because a reader is entitled to know
 * whether a machine measured that or guessed it.
 */
export function verdictFromModel(
  proposed: string,
  deterministic: VerticalVerdict,
  note?: string
): VerticalVerdict {
  const id = VERTICAL_IDS.find((v) => v === proposed);
  if (!id || id === "generic" || deterministic.confidence !== "low") return deterministic;
  return {
    id,
    definition: VERTICALS[id],
    confidence: "low",
    evidence: `The site declares nothing about its trade, so the model that read it called it ${VERTICALS[
      id
    ].label.toLowerCase()}${note ? `: ${note}` : "."}`,
    scores: deterministic.scores,
  };
}

export function classifyVertical(audit: AuditResult): VerticalVerdict {
  const scores = {} as Record<VerticalId, number>;
  const reasons = {} as Record<VerticalId, string[]>;
  const ids = Object.keys(VERTICALS) as VerticalId[];
  for (const id of ids) {
    scores[id] = 0;
    reasons[id] = [];
  }

  const haystack = flatten(
    [
      audit.name || "",
      audit.domain || "",
      audit.title || "",
      audit.description || "",
      audit.cuisine || "",
      audit.textSample || "",
      ...(audit.ownOrderSignals || []),
    ].join(" ")
  );

  const declared = (audit.schemaTypes || []).map((t) => t.toLowerCase());
  const marketplaces = audit.marketplaces || [];
  const legacyAggregators = audit.aggregators || [];

  for (const id of ids) {
    const v = VERTICALS[id];
    if (id === "generic") continue;

    const schemaHit = v.schemaTypes.find((t) => declared.includes(t.toLowerCase()));
    if (schemaHit) {
      scores[id] += WEIGHT_SCHEMA;
      reasons[id].push(`it declares itself a ${schemaHit} in its own structured data`);
    }

    const marketHits = marketplaces
      .filter((m) => v.marketplaces.some((def) => def.name === m.platform))
      .map((m) => m.platform);
    // The food path predates the general one and still fills `aggregators`.
    const legacyHits =
      id === "restaurant"
        ? legacyAggregators.filter((a) => v.marketplaces.some((def) => def.name.replace(/\s/g, "").toLowerCase() === a.replace(/\s/g, "").toLowerCase()))
        : [];
    const allMarketHits = Array.from(new Set([...marketHits, ...legacyHits]));
    if (allMarketHits.length > 0) {
      scores[id] += WEIGHT_MARKETPLACE;
      reasons[id].push(`it links out to ${allMarketHits.join(" and ")}`);
    }

    if (audit.bookingProvider && v.bookingProviders.includes(audit.bookingProvider.toLowerCase())) {
      scores[id] += WEIGHT_BOOKING;
      reasons[id].push(`it books through ${audit.bookingProvider}`);
    }

    const keywordHits = v.keywords.filter((k) => haystack.includes(flatten(k)));
    if (keywordHits.length > 0) {
      /* One phrase is a coincidence. Three distinct ones is how a trade talks,
         and that alone is allowed to be enough — but only just. */
      scores[id] +=
        Math.min(keywordHits.length * WEIGHT_KEYWORD, MAX_KEYWORD_SCORE) +
        (keywordHits.length >= 3 ? 1 : 0);
      reasons[id].push(`its own pages talk about ${keywordHits.slice(0, 2).join(" and ")}`);
    }
  }

  // An open shop API is a shop, unless something louder already said otherwise.
  if (audit.woocommerce || audit.storeApi) {
    scores.retail += WEIGHT_BOOKING;
    reasons.retail.push("it runs a shop engine with a catalogue behind it");
  }

  /* A checkout and a page full of prices is a shop even when the engine behind
     it is custom and names itself nowhere. */
  if ((audit.contactChannels || []).includes("checkout") && (audit.priceSignals || []).length >= 3) {
    scores.retail += WEIGHT_BOOKING;
    reasons.retail.push("it puts prices and a checkout in front of the visitor");
  }

  let winner: VerticalId = "generic";
  let best = 0;
  for (const id of ids) {
    if (id === "generic") continue;
    if (scores[id] > best) {
      best = scores[id];
      winner = id;
    }
  }

  const runnerUp = ids
    .filter((id) => id !== winner && id !== "generic")
    .reduce((max, id) => Math.max(max, scores[id]), 0);

  if (best < MIN_CONFIDENT_SCORE) {
    return {
      id: "generic",
      definition: VERTICALS.generic,
      confidence: "low",
      evidence:
        "We could not tell what trade this is from the site itself, so this report only prices the leaks that hold for any business.",
      scores,
    };
  }

  const confidence: VerticalVerdict["confidence"] =
    best >= WEIGHT_SCHEMA && best - runnerUp >= 2 ? "high" : best - runnerUp >= 2 ? "medium" : "low";

  return {
    id: winner,
    definition: VERTICALS[winner],
    confidence,
    evidence: `Read as ${VERTICALS[winner].label.toLowerCase()} because ${reasons[winner]
      .slice(0, 2)
      .join(", and ")}.`,
    scores,
  };
}
