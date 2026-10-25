import React from "react";
import {
  Baby,
  Bug,
  Camera,
  ChefHat,
  Flame,
  HeartHandshake,
  Home,
  KeyRound,
  PaintRoller,
  Palette,
  PartyPopper,
  PawPrint,
  Refrigerator,
  Scissors,
  Shirt,
  Sparkles,
  Utensils,
  AppWindow,
} from "lucide-react";
import {
  HammerIcon,
  ZapIcon,
  SproutIcon,
  WrenchIcon,
  BrushIcon,
  TrowelIcon,
  DropletIcon,
} from "../Icons";

export type ServiceGroup =
  | "All Services"
  | "Home Repairs"
  | "Cleaning & Yard"
  | "Personal & Wellness"
  | "Events & Food";

export interface OfferedServiceItem {
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string; [key: string]: any }>;
  group: Exclude<ServiceGroup, "All Services">;
  label: string;
  title: string;
  description: string;
  points: string[];
  image: string;
  searchQuery: string;
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  "All Services",
  "Home Repairs",
  "Cleaning & Yard",
  "Personal & Wellness",
  "Events & Food",
];

export const OFFERED_SERVICES: OfferedServiceItem[] = [
  {
    id: "appliance-repair",
    name: "Appliance Repair",
    shortName: "Appliance Repair",
    icon: Refrigerator,
    group: "Home Repairs",
    label: "Refrigerators, AC, washers & microwaves",
    title: "Appliance Repair Technician",
    description:
      "Troubleshoot, service, and restore major household appliances including refrigerators, air conditioners, washing machines, and cooking equipment.",
    points: [
      "Refrigerator & freezer cooling diagnostics",
      "Air conditioner cleaning & freon charging",
      "Washing machine motor & water line fixes",
    ],
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Appliance Repair",
  },
  {
    id: "babysitter",
    name: "Babysitter",
    shortName: "Babysitter",
    icon: Baby,
    group: "Personal & Wellness",
    label: "Trusted, warm & attentive childcare",
    title: "Babysitter & Childcare",
    description:
      "Verified and compassionate babysitters to keep your children safe, entertained, and well-cared for in the comfort of your home.",
    points: [
      "Playtime supervision & fun activities",
      "Nutritious meal preparation & feeding",
      "Bedtime routines & homework guidance",
    ],
    image:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Babysitter",
  },
  {
    id: "barber",
    name: "Barber",
    shortName: "Barber",
    icon: Scissors,
    group: "Personal & Wellness",
    label: "Sharp fades, haircuts & beard styling",
    title: "Barber & Men's Grooming",
    description:
      "Professional on-demand grooming bringing precision fades, classic scissor cuts, beard sculpting, and clean shaves to you.",
    points: [
      "Skin fades, tapers & modern cuts",
      "Beard trimming, shaping & line-ups",
      "Hot towel shaves & scalp treatments",
    ],
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Barber",
  },
  {
    id: "carpenter",
    name: "Carpenter",
    shortName: "Carpenter",
    icon: HammerIcon,
    group: "Home Repairs",
    label: "Woodwork & home improvements",
    title: "Carpenter",
    description:
      "Fix doors, build shelves, install cabinets, and handle custom woodwork and structural repairs around your home.",
    points: [
      "Door & cabinet repair",
      "Custom shelves & fixtures",
      "Furniture restoration & wood framing",
    ],
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Carpenter",
  },
  {
    id: "cook",
    name: "Cook",
    shortName: "Cook",
    icon: ChefHat,
    group: "Events & Food",
    label: "Home-cooked meals & kitchen culinary",
    title: "Home Cook & Private Cook",
    description:
      "Talented home cooks to whip up fresh daily family meals, hearty Filipino favorites, or healthy customized diets right in your kitchen.",
    points: [
      "Daily & weekly family meal prep",
      "Classic Filipino & specialty dishes",
      "Ingredient prep & kitchen tidying",
    ],
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Cook",
  },
  {
    id: "electrician",
    name: "Electrician",
    shortName: "Electrician",
    icon: ZapIcon,
    group: "Home Repairs",
    label: "Electrical safety & installation",
    title: "Electrician",
    description:
      "Licensed professionals for wiring, lighting installation, circuit breaker fixes, and complete electrical safety diagnostics.",
    points: [
      "Wiring & outlet installation",
      "Lighting fixtures & ceiling fan setup",
      "Circuit breaker repair & troubleshooting",
    ],
    image:
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Electrician",
  },
  {
    id: "event-planner",
    name: "Event Planner",
    shortName: "Event Planner",
    icon: PartyPopper,
    group: "Events & Food",
    label: "Weddings, birthdays & milestone events",
    title: "Event Planner & Coordinator",
    description:
      "Stress-free celebration organizing, decor coordination, schedule management, and on-site oversight for memorable gatherings.",
    points: [
      "Concept theme styling & floral decor",
      "Supplier & timeline coordination",
      "On-the-day event execution",
    ],
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Event Planner",
  },
  {
    id: "food-catering",
    name: "Food Catering",
    shortName: "Food Catering",
    icon: Utensils,
    group: "Events & Food",
    label: "Party trays, buffets & celebration banquets",
    title: "Food Catering",
    description:
      "Sumptuous banquet spreads, packed meals, and party trays designed to feed crowds for birthdays, fiestas, and special reunions.",
    points: [
      "Party trays & full buffet layouts",
      "Customized menus for any headcount",
      "Food warmer stations & catering setup",
    ],
    image:
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Food Catering",
  },
  {
    id: "gardener",
    name: "Gardener",
    shortName: "Gardener",
    icon: SproutIcon,
    group: "Cleaning & Yard",
    label: "Lawn care & landscaping",
    title: "Gardener & Landscaper",
    description:
      "Keep your lawn green, trees trimmed, and plants healthy with experienced local gardening and landscaping services.",
    points: [
      "Lawn mowing & weeding",
      "Tree trimming & pruning",
      "Planting, fertilizing & landscape design",
    ],
    image:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Gardener",
  },
  {
    id: "hair-stylist",
    name: "Hair Stylist",
    shortName: "Hair Stylist",
    icon: Sparkles,
    group: "Personal & Wellness",
    label: "Haircuts, rebonding, color & blowouts",
    title: "Hair Stylist & Beautician",
    description:
      "On-demand salon styling, modern cuts, hair coloring, revitalizing keratin treatments, and blowouts without leaving home.",
    points: [
      "Women's haircuts & blowout styling",
      "Hair coloring, balayage & highlights",
      "Rebonding & keratin treatments",
    ],
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Hair Stylist",
  },
  {
    id: "handyman",
    name: "Handyman",
    shortName: "Handyman",
    icon: WrenchIcon,
    group: "Home Repairs",
    label: "Quick fixes & home maintenance",
    title: "Handyman / General Repair",
    description:
      "The jack-of-all-trades for mounting TVs, fixing loose fixtures, furniture assembly, and resolving everyday household repairs.",
    points: [
      "TV mounting & wall hanging",
      "Furniture assembly & hardware fixes",
      "General fixture repairs & maintenance",
    ],
    image:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Handyman",
  },
  {
    id: "house-cleaning",
    name: "House Cleaning",
    shortName: "House Cleaning",
    icon: BrushIcon,
    group: "Cleaning & Yard",
    label: "Sparkling clean homes",
    title: "House Cleaning Specialist",
    description:
      "Professional deep cleaning for homes, apartments, and offices. We scrub, sanitize, and polish so you don't have to.",
    points: [
      "Deep house cleaning & surface disinfection",
      "Move-in & move-out sanitation",
      "Kitchen & bathroom deep scrubbing",
    ],
    image:
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "House Cleaning",
  },
  {
    id: "laundry",
    name: "Laundry",
    shortName: "Laundry",
    icon: Shirt,
    group: "Cleaning & Yard",
    label: "Wash, dry, fold & ironing",
    title: "Laundry Service",
    description:
      "Reliable laundry services for daily clothes, linens, comforters, and delicate fabrics with careful washing and pressing.",
    points: [
      "Wash, dry & fold service",
      "Garment pressing & hand ironing",
      "Bedsheet, curtain & comforter care",
    ],
    image:
      "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Laundry",
  },
  {
    id: "locksmith",
    name: "Locksmith",
    shortName: "Locksmith",
    icon: KeyRound,
    group: "Home Repairs",
    label: "Lockouts, key duplication & deadbolts",
    title: "Locksmith",
    description:
      "Emergency lockout assistance, key duplication, deadbolt installation, and digital door lock servicing to safeguard your property.",
    points: [
      "Emergency lockout opening",
      "Key duplication & rekeying",
      "Deadbolt & electronic lock install",
    ],
    image:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Locksmith",
  },
  {
    id: "makeup-artist",
    name: "Makeup Artist",
    shortName: "Makeup Artist",
    icon: Palette,
    group: "Personal & Wellness",
    label: "Bridal, photoshoot & glam makeup",
    title: "Makeup Artist",
    description:
      "Certified beauty artists providing flawless makeup application for weddings, graduation portraits, debut parties, and photo shoots.",
    points: [
      "Bridal & entourage makeup",
      "High-definition photo shoot styling",
      "Natural glowing looks & party glam",
    ],
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Makeup Artist",
  },
  {
    id: "masonry",
    name: "Masonry",
    shortName: "Masonry",
    icon: TrowelIcon,
    group: "Home Repairs",
    label: "Concrete, brick & stone work",
    title: "Mason & Concrete Specialist",
    description:
      "Expert concrete pouring, bricklaying, tile installation, firewall construction, and structural crack repairs.",
    points: [
      "Concrete & cement pouring",
      "Floor & wall tiling installation",
      "Firewall & plastering repairs",
    ],
    image:
      "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Masonry",
  },
  {
    id: "massage-therapist",
    name: "Massage Therapist",
    shortName: "Massage Therapist",
    icon: HeartHandshake,
    group: "Personal & Wellness",
    label: "Traditional Hilot & relaxation massage",
    title: "Massage Therapist",
    description:
      "Certified therapists offering Swedish, Shiatsu, deep tissue, and traditional Hilot massage in the comfort of your own home.",
    points: [
      "Traditional Filipino Hilot therapy",
      "Deep tissue muscle tension relief",
      "Swedish relaxation & ventosa",
    ],
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Massage Therapist",
  },
  {
    id: "painter",
    name: "Painter",
    shortName: "Painter",
    icon: PaintRoller,
    group: "Home Repairs",
    label: "Interior & exterior painting",
    title: "Painter",
    description:
      "Transform your home with clean, precise wall painting, waterproofing, surface priming, and decorative finishes.",
    points: [
      "Interior & exterior wall painting",
      "Roof & firewall waterproofing",
      "Wood & metal protective coating",
    ],
    image:
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Painter",
  },
  {
    id: "pest-control",
    name: "Pest Control",
    shortName: "Pest Control",
    icon: Bug,
    group: "Cleaning & Yard",
    label: "Termite, rodent & insect management",
    title: "Pest Control Specialist",
    description:
      "Safe, eco-conscious fumigation and pest management targeting termites, ants, cockroaches, bedbugs, and rodents.",
    points: [
      "Termite inspection & barrier treatment",
      "Cockroach & insect extermination",
      "Safe perimeter fogging & pest proofing",
    ],
    image:
      "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Pest Control",
  },
  {
    id: "pet-grooming",
    name: "Pet Grooming",
    shortName: "Pet Grooming",
    icon: PawPrint,
    group: "Personal & Wellness",
    label: "Baths, fur trimming & pet care",
    title: "Pet Groomer",
    description:
      "Gentle, loving care for your dogs and cats including baths, fur styling, nail clipping, ear cleaning, and tick & flea baths.",
    points: [
      "Full bath, blow-dry & brush out",
      "Breed-standard hair cuts & trims",
      "Nail clipping & ear sanitizing",
    ],
    image:
      "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Pet Grooming",
  },
  {
    id: "photographer",
    name: "Photographer",
    shortName: "Photographer",
    icon: Camera,
    group: "Events & Food",
    label: "Portraits, celebrations & events",
    title: "Photographer & Videographer",
    description:
      "Capture life's best memories with high-resolution photography for birthdays, weddings, real estate, and family portraits.",
    points: [
      "Event coverage & candids",
      "Family & graduation portraits",
      "Professional photo editing & digital delivery",
    ],
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Photographer",
  },
  {
    id: "plumber",
    name: "Plumber",
    shortName: "Plumber",
    icon: DropletIcon,
    group: "Home Repairs",
    label: "Leaks, pipes & drains",
    title: "Plumber",
    description:
      "Fix leaks, unclog drains, and install bathroom fixtures quickly and safely.",
    points: [
      "Leak repairs & burst pipes",
      "Toilet & sink install",
      "Drain unblocking & pipe maintenance",
    ],
    image:
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Plumber",
  },
  {
    id: "roofer",
    name: "Roofer",
    shortName: "Roofer",
    icon: Home,
    group: "Home Repairs",
    label: "Roof leaks, gutters & flashing",
    title: "Roofer",
    description:
      "Weatherproof your home with corrugated sheet replacement, gutter clearing, flashing repair, and roof sealants.",
    points: [
      "Roof leak detection & elastomeric sealing",
      "Gutter cleaning & downspout replacement",
      "Corrugated metal sheet installation",
    ],
    image:
      "https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Roofer",
  },
  {
    id: "tailor",
    name: "Tailor",
    shortName: "Tailor",
    icon: Scissors,
    group: "Events & Food",
    label: "Alterations, hems & custom sewing",
    title: "Tailor & Alterations Specialist",
    description:
      "Get the perfect fit with professional garment alterations, zipper replacements, uniform stitching, and custom tailoring.",
    points: [
      "Hemming & sizing adjustments",
      "Zipper & button replacements",
      "Uniforms & custom dressmaking",
    ],
    image:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Tailor",
  },
  {
    id: "welder",
    name: "Welder",
    shortName: "Welder",
    icon: Flame,
    group: "Home Repairs",
    label: "Gates, grills & metal repairs",
    title: "Welder & Metal Fabricator",
    description:
      "Sturdy metal welding, steel gate repair, window security grills, railing installation, and structural fabrication.",
    points: [
      "Steel gate & window grill welding",
      "Railings & fence fabrication",
      "On-site structural metal repairs",
    ],
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Welder",
  },
  {
    id: "window-cleaner",
    name: "Window Cleaner",
    shortName: "Window Cleaner",
    icon: AppWindow,
    group: "Cleaning & Yard",
    label: "Spotless glass & window frames",
    title: "Window Cleaning Specialist",
    description:
      "Streak-free window washing for residential homes, glass doors, high panes, and screen mesh deep cleaning.",
    points: [
      "Streak-free glass washing & squeegee finish",
      "Window track & screen scrubbing",
      "Hard water stain & residue removal",
    ],
    image:
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=1000",
    searchQuery: "Window Cleaner",
  },
];

// Normalized lookup map by name and aliases
export const CATEGORY_DETAILS: Record<string, OfferedServiceItem> = (() => {
  const map: Record<string, OfferedServiceItem> = {};

  OFFERED_SERVICES.forEach((service) => {
    map[service.name] = service;
    map[service.name.toLowerCase()] = service;
  });

  // Aliases for backward compatibility
  const cleaner = map["House Cleaning"];
  if (cleaner) {
    map["Cleaner"] = cleaner;
    map["cleaner"] = cleaner;
    map["Cleaning"] = cleaner;
  }

  const handyman = map["Handyman"];
  if (handyman) {
    map["General Repair"] = handyman;
    map["general repair"] = handyman;
    map["General Repair / Handyman"] = handyman;
  }

  const mason = map["Masonry"];
  if (mason) {
    map["Mason"] = mason;
    map["mason"] = mason;
  }

  return map;
})();

export const getCategoryContent = (name: string): OfferedServiceItem => {
  if (!name) return OFFERED_SERVICES[0];
  const direct = CATEGORY_DETAILS[name] || CATEGORY_DETAILS[name.toLowerCase()];
  if (direct) return direct;

  const trimmed = name.trim().toLowerCase();
  const found = OFFERED_SERVICES.find(
    (item) =>
      item.name.toLowerCase().includes(trimmed) ||
      trimmed.includes(item.name.toLowerCase())
  );

  return found || OFFERED_SERVICES[0];
};

export const getProfessionIcon = (
  role: string,
  className = "w-4 h-4"
): React.ReactElement => {
  const service = getCategoryContent(role);
  const IconComp = service.icon;
  return React.createElement(IconComp, { className });
};
