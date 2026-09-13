import { Constante } from "./calibracion";
import { VerticalId } from "./vertical";

/**
 * The same four numbers, for every trade Bleed can read.
 *
 * To price a leak for a business you need to know what one transaction is worth
 * there, what the platforms of that trade keep, how often it happens, and how
 * many customers would come direct if the path existed. Restaurants had these
 * four in lib/calibracion.ts with their sources. Every other trade needs them
 * too, held to the same rule: a published source with a date and a URL, or an
 * honest label saying it is ours.
 *
 * The rule, again, because it is the whole product: a figure with no source is
 * marked `estimacionPropia` and the report says so on screen, next to the
 * figure, where the owner reads it. Never in a footnote.
 */

export interface VerticalEconomics {
  vertical: VerticalId;
  /** What one order, booking, appointment, job or new client is worth. */
  valorTransaccion: Constante;
  /** What the dominant platform of this trade keeps per transaction. */
  comisionPlataforma: Constante;
  /** How many transactions a small business of this kind does per period
      (the period is the vertical's ratePeriod: day, week or month). */
  transaccionesPorPeriodo: Constante;
  /** Share of customers who would come through the business's own channel
      if it existed and worked. */
  desvioADirecto: Constante;
}

export const ECONOMIA_VERTICAL: Record<VerticalId, VerticalEconomics> = {
  restaurant: {
    vertical: "restaurant",
    valorTransaccion: {
      id: "ticketMedioRestauracion",
      descripcion: "Average restaurant transaction in Spain",
      valor: 21,
      minimo: 16.5,
      maximo: 35,
      unidad: "euros",
      fuente: "CaixaBank Research, Tourism Sector Report H1 2025",
      url: "https://caixabanklab-campus.com/cual-es-el-ticket-medio-restauracion-espana/",
      fecha: "2024-12-31",
      advertencia:
        "National average from card data. Replaced by the real make-up of the catalogue when the Store API is open.",
    },
    comisionPlataforma: {
      id: "comisionAgregadorCompleto",
      descripcion: "Commission per order when the platform also handles the delivery",
      valor: 25,
      minimo: 15,
      maximo: 35,
      unidad: "porcentaje",
      fuente: "Qamarero, comparison of delivery platform commissions in Spain",
      url: "https://qamarero.com/blog/comisiones-delivery-cuanto-cobran-realmente-las-plataformas/",
      fecha: "2025-09-30",
      advertencia:
        "No platform publishes its rate on its own partner site; just-eat.es/restaurantes answers 403. The source is secondary out of necessity, and the report says so.",
    },
    transaccionesPorPeriodo: {
      id: "pedidosDiaRestaurante",
      descripcion: "Delivery orders a day for a casual-food restaurant",
      valor: 15,
      minimo: 3,
      maximo: 60,
      unidad: "ratio",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-09",
      estimacionPropia: true,
      advertencia:
        "No published source for a single venue. It is the first number the owner should change, and the report says so.",
    },
    desvioADirecto: {
      id: "preferenciaCanalDirecto",
      descripcion: "Consumers who prefer to order from the restaurant's own site or app",
      valor: 58,
      minimo: 58,
      maximo: 70,
      unidad: "porcentaje",
      fuente: "NCR Voyix, 2025 Customer Experience Report",
      url: "https://www.restaurantdive.com/news/majority-customers-prefer-ordering-delivery-direct-restaurant-ncr-voyix/738397/",
      fecha: "2024-11-30",
      advertencia:
        "Survey of United States consumers, 4% margin of error. There is no published Spanish equivalent and the report says so. The 70% figure that circulates comes from direct-ordering software vendors, who are an interested party.",
    },
  },

  retail: {
    vertical: "retail",
    valorTransaccion: {
      id: "ticketMedioRetail",
      descripcion: "Average order value for Spanish online stores",
      valor: 157,
      minimo: 157,
      maximo: 250,
      unidad: "euros",
      fuente: "Flat 101, annual eCommerce Conversion Study, via Marketing4eCommerce",
      url: "https://marketing4ecommerce.net/el-valor-medio-del-pedido-en-ecommerce-es-de-217-e-un-10-mas-que-hace-un-ano/",
      fecha: "2023-12-31",
      advertencia:
        "The study's published waves run from 157 to 250 euros; we take the lowest, because the sample is Flat 101's own client ecosystem — larger stores than the corner shop this report is written for — and Flat 101 sells conversion consulting, so it is not a neutral party. An owner whose basket is 30 euros should change this number, and the report says so.",
    },
    comisionPlataforma: {
      id: "comisionAmazonRetail",
      descripcion: "Amazon referral fee per sale for third-party sellers",
      valor: 8,
      minimo: 8,
      maximo: 15,
      unidad: "porcentaje",
      fuente: "Amazon, official seller pricing page for Spain",
      url: "https://sell.amazon.es/en/precios",
      fecha: "2026-09-13",
      advertencia:
        "Amazon's own page states most referral fees fall between 8% and 15% depending on category; we use the low end to stay conservative, though many everyday categories (books, general goods) are charged the full 15%. Etsy charges a flat 6.5% instead, which fits a craft-style shop better than Amazon does.",
    },
    transaccionesPorPeriodo: {
      id: "ventasDiaRetail",
      descripcion: "Online sales a day for a small retail shop",
      valor: 8,
      minimo: 2,
      maximo: 30,
      unidad: "ratio",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published source breaks this down for a single small shop. It is the first number the owner should replace with their own analytics.",
    },
    desvioADirecto: {
      id: "desvioDirectoRetail",
      descripcion: "Share of shoppers who would buy direct from the shop's own site instead of a marketplace",
      valor: 25,
      minimo: 10,
      maximo: 40,
      unidad: "porcentaje",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "Published studies on buying direct from a brand instead of a marketplace conflict wildly by how the question is framed (43% to 72%) and describe large, known consumer brands choosing their own D2C site over a big retailer, not a small shop competing with an Amazon or Etsy listing. Rather than pick whichever number flatters the report, we mark this our own conservative estimate.",
    },
  },

  lodging: {
    vertical: "lodging",
    valorTransaccion: {
      id: "valorReservaAlojamiento",
      descripcion:
        "Average booking value: hotel ADR (average daily rate) in Spain times the average length of stay",
      valor: 395,
      minimo: 340,
      maximo: 494,
      unidad: "euros",
      fuente: "INE (Instituto Nacional de Estadistica), Coyuntura Turistica Hotelera, full year 2025",
      url: "https://www.ine.es/dyngs/Prensa/CTH1225.htm",
      fecha: "2025-12-31",
      advertencia:
        "Computed as ADR (127.7 euros, INE, full year 2025) times average stay (3.09 nights, INE hotel occupancy survey for 2025, as reported by soloagentes.com: https://www.soloagentes.com/ine-pernoctaciones-hoteleras-2025-datos-definitivos/). A private-sector barometer (STR / Cushman & Wakefield) reports a higher ADR of 166.1 euros for 2025; we use INE's official, lower figure. The minimo-maximo range reflects normal seasonal ADR swings (roughly 110-160 euros a night) with the stay length held constant. This prices a full stay, not a single night — say so on screen.",
    },
    comisionPlataforma: {
      id: "comisionBookingAlojamiento",
      descripcion: "Booking.com commission per booking for hotels",
      valor: 15,
      minimo: 10,
      maximo: 25,
      unidad: "porcentaje",
      fuente: "Wise, guide to Booking.com's hotel commission rates",
      url: "https://wise.com/us/blog/booking-com-commission-percentage",
      fecha: "2026-06-29",
      advertencia:
        "Booking.com does not publish a rate card; each property negotiates its own contract, so we cite a neutral fintech's guide rather than a hospitality vendor with a stake in the number. Airbnb, the other dominant platform for short lets, now charges a flat 15.5% host-only fee since December 2025 — close enough to use the same figure for both.",
    },
    transaccionesPorPeriodo: {
      id: "reservasDiaAlojamiento",
      descripcion: "Bookings a day for a small hotel or guesthouse",
      valor: 4,
      minimo: 1,
      maximo: 15,
      unidad: "ratio",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published source sizes this for a single small property. It is the first number the owner should replace with their own occupancy data.",
    },
    desvioADirecto: {
      id: "desvioDirectoAlojamiento",
      descripcion: "Share of guests who would still book direct even at a price disadvantage to OTAs",
      valor: 51,
      minimo: 51,
      maximo: 65,
      unidad: "porcentaje",
      fuente: "Koddi (2015 controlled study), as reported by Hotel Speak",
      url: "https://www.hotelspeak.com/2020/01/more-than-commission-the-6-hidden-costs-of-ota-bookings/",
      fecha: "2015-01-01",
      advertencia:
        "This is an eleven-year-old United States study by Koddi, a travel-advertising company; its original report could not be located, only its citation in secondary hotel-industry coverage. No Spanish or recent equivalent was found. We use the more conservative of its two published figures — 51%, guests who still book direct even when the hotel is 10% pricier than the OTA listing — rather than the flashier 65% figure quoted at price parity.",
    },
  },

  appointment: {
    vertical: "appointment",
    valorTransaccion: {
      id: "precioCitaConsulta",
      descripcion:
        "Average price of a general private medical consultation in Spain, used as a conservative proxy for one appointment across this vertical",
      valor: 25,
      minimo: 17,
      maximo: 55,
      unidad: "euros",
      fuente: "Selectra, private healthcare cost guide for Spain",
      url: "https://selectra.es/seguros/seguros-salud/precio-consulta-privada",
      fecha: "2025-05-08",
      advertencia:
        "Specialist and dental appointments commonly cost far more (60-120 euros for a specialist first visit per the same source; dental cleanings have historically run 35-60 euros per a 2014 FACUA survey), and a basic beauty-salon appointment can cost less. We use the low end of general-practice consultations so the figure holds up across the whole vertical, from hairdressers to dentists, without overstating any single trade.",
    },
    comisionPlataforma: {
      id: "comisionTreatwellCita",
      descripcion: "Treatwell commission on a new customer's first booking",
      valor: 25,
      minimo: 25,
      maximo: 25,
      unidad: "porcentaje",
      fuente: "Treatwell, official partner pricing page",
      url: "https://www.treatwell.es/partners/precios/",
      fecha: "2026-09-13",
      advertencia:
        "This 25% applies only to a new customer's first booking sourced through the Treatwell marketplace; repeat visits carry no commission. Doctoralia, the leading platform for medical and dental appointments, charges a flat monthly subscription instead of a per-booking percentage, so this figure fits beauty and wellness bookings better than medical ones.",
    },
    transaccionesPorPeriodo: {
      id: "citasSemanaCita",
      descripcion: "Appointments a week for a small clinic or salon",
      valor: 25,
      minimo: 8,
      maximo: 60,
      unidad: "ratio",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published source sizes this for a single small practice. It is the first number the owner should replace with their own booking log.",
    },
    desvioADirecto: {
      id: "desvioDirectoCita",
      descripcion: "Share of patients or clients who would book direct instead of via a marketplace",
      valor: 35,
      minimo: 20,
      maximo: 50,
      unidad: "porcentaje",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published research was found on how many patients or salon clients would switch to booking direct. Flagged as our own estimate, and the first number the owner should challenge.",
    },
  },

  trade: {
    vertical: "trade",
    valorTransaccion: {
      id: "precioMedioTrabajoOficio",
      descripcion: "Average price of a plumbing job in Spain, used as a representative trade job value",
      valor: 175,
      minimo: 120,
      maximo: 500,
      unidad: "euros",
      fuente: "Habitissimo, average price guide for plumbers in Spain",
      url: "https://www.habitissimo.es/presupuestos/fontaneros",
      fecha: "2026-06-10",
      advertencia:
        "Habitissimo's own headline national average (175 euros) sits well below what the same page quotes for Madrid specifically (500 euros) and for full installation jobs (up to 2,000 euros); we use the conservative national figure. Electricians and other trades in this vertical will price differently — treat this as an anchor, not a universal figure.",
    },
    comisionPlataforma: {
      id: "comisionLeadOficio",
      descripcion: "Effective cost of lead-marketplace platforms as a share of an average job",
      valor: 15,
      minimo: 8,
      maximo: 25,
      unidad: "porcentaje",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "Habitissimo and Cronoshare, the leading lead marketplaces for trades in Spain, do not charge a percentage of the job. Habitissimo combines a subscription of roughly 60 euros a month with 10-50 euros per contact purchased, and cites a typical annual platform cost of 3,000-5,500 euros for an active professional (https://www.habitissimo.es/presupuestos/fontaneros). Cronoshare charges per contact unlocked, split 55% commission (refundable if no deal is reached) and 45% platform fee (https://soporte.cronoshare.com/hc/es/articles/360019653700-Precios-de-las-solicitudes). We converted this into a rough percentage of an average 175-euro job, assuming a lead converts to a paid job roughly one time in three or four. Nobody publishes that conversion rate, so this whole percentage is our own estimate, not a sourced platform rate — say so on screen.",
    },
    transaccionesPorPeriodo: {
      id: "trabajosSemanaOficio",
      descripcion: "Jobs a week for a small trade business",
      valor: 8,
      minimo: 3,
      maximo: 20,
      unidad: "ratio",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published source sizes this for a single tradesperson. It is the first number the owner should replace with their own job log.",
    },
    desvioADirecto: {
      id: "desvioDirectoOficio",
      descripcion: "Share of customers who would call the tradesperson direct instead of via a lead marketplace",
      valor: 40,
      minimo: 20,
      maximo: 55,
      unidad: "porcentaje",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published research was found on this for trades. Flagged as our own estimate, and the first number the owner should challenge.",
    },
  },

  professional: {
    vertical: "professional",
    valorTransaccion: {
      id: "valorClienteNuevoProfesional",
      descripcion:
        "Value of a new client, proxied by the price of an initial paid consultation for a small legal or accounting practice in Spain",
      valor: 60,
      minimo: 60,
      maximo: 150,
      unidad: "euros",
      fuente: "Trustlocal, aggregated quotes for legal services in Spain",
      url: "https://trustlocal.es/coste/abogado-coste/",
      fecha: "2026-09-03",
      advertencia:
        "This prices only the first meeting, not the client's full lifetime value to the practice, which is unknowable without the firm's own numbers and is usually much higher. We use the conservative, observable floor. The figures are self-reported quotes aggregated by a lead-generation directory, not an audited survey.",
    },
    comisionPlataforma: {
      id: "comisionMaltProfesional",
      descripcion: "Malt commission on a freelancer's project with a new client",
      valor: 10,
      minimo: 5,
      maximo: 10,
      unidad: "porcentaje",
      fuente: "Trabajo y Personal, guide to Malt's freelance marketplace fees",
      url: "https://trabajoypersonal.com/malt-espana-plataforma-freelance-europea/",
      fecha: "2025-08-04",
      advertencia:
        "Malt only charges freelancers and fits this vertical loosely (agencies, consultants, designers); Idealista and Fotocasa, the leading directories for real estate agents, and most legal or accounting directories charge flat subscriptions instead, which do not convert cleanly into a per-transaction percentage. Malt's rate drops from 10% to 5% after four months with the same client; we use the higher new-client rate since that is what this constant prices.",
    },
    transaccionesPorPeriodo: {
      id: "clientesMesProfesional",
      descripcion: "New clients a month for a small practice",
      valor: 4,
      minimo: 1,
      maximo: 15,
      unidad: "ratio",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published source sizes this for a single small practice. It is the first number the owner should replace with their own client records.",
    },
    desvioADirecto: {
      id: "desvioDirectoProfesional",
      descripcion: "Share of new clients who would get in touch direct instead of via a directory",
      valor: 30,
      minimo: 15,
      maximo: 45,
      unidad: "porcentaje",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published research was found on this for professional services. Flagged as our own estimate, and the first number the owner should challenge.",
    },
  },

  generic: {
    vertical: "generic",
    valorTransaccion: {
      id: "valorTransaccionGenerico",
      descripcion: "Value of one sale, a deliberately conservative figure for a business of unknown trade",
      valor: 40,
      minimo: 20,
      maximo: 80,
      unidad: "euros",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No single published figure covers 'the average transaction of any small business' — the trades above range from a 25-euro appointment to a 395-euro hotel booking. We use a low, deliberately conservative placeholder for when the site gives no clue what it sells; it is the first number the owner should replace.",
    },
    comisionPlataforma: {
      id: "comisionPlataformaGenerico",
      descripcion: "Platform commission, a deliberately conservative figure for a business of unknown trade",
      valor: 15,
      minimo: 8,
      maximo: 25,
      unidad: "porcentaje",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "Derived by eye from the range of sourced platform commissions above (8-25% across retail, lodging, appointments and trades), not independently published for 'any business.' Flagged as our own estimate.",
    },
    transaccionesPorPeriodo: {
      id: "transaccionesMesGenerico",
      descripcion: "Sales a month for a small, unclassified business",
      valor: 15,
      minimo: 5,
      maximo: 50,
      unidad: "ratio",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published source sizes this when the trade itself is unknown. It is the first number the owner should replace.",
    },
    desvioADirecto: {
      id: "desvioDirectoGenerico",
      descripcion: "Share of customers who would come through the business's own channel, a conservative default",
      valor: 25,
      minimo: 10,
      maximo: 40,
      unidad: "porcentaje",
      fuente: "Bleed, working estimate",
      url: "",
      fecha: "2026-09-13",
      estimacionPropia: true,
      advertencia:
        "No published research applies when the trade is unknown. Flagged as our own estimate, and the first number the owner should challenge.",
    },
  },
};
