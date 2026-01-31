import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator,
  Lightbulb,
  ListChecks,
  Swords,
  Zap,
  Info,
  ArrowLeftRight,
  Plus,
  Trash2,
} from "lucide-react";

// ---------------- Basics ----------------
const DAYS_PER_MONTH = 30.4;
const WEEKS_PER_MONTH = 52 / 12;

const clampNum = (v: any, min: number, max: number) => {
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(n) ? n : 0
  );

const kwhFromWattsHours = (watts: number, hours: number) => (watts * hours) / 1000;
const hoursFromMinutes = (min: number) => min / 60;

const fmt = {
  hours(n: number) {
    if (!Number.isFinite(n) || n <= 0) return "0";
    if (n < 10) return n.toFixed(1);
    if (n < 100) return n.toFixed(0);
    return Math.round(n).toString();
  },
  days(n: number) {
    if (!Number.isFinite(n) || n <= 0) return "0";
    if (n < 10) return n.toFixed(1);
    if (n < 100) return n.toFixed(0);
    return Math.round(n).toString();
  },
};

const BigEmoji = ({ children }: { children: React.ReactNode }) => (
  <div className="text-4xl leading-none select-none">{children}</div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
    {children}
  </span>
);

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">{left}</div>
      <div className="text-sm font-semibold tabular-nums">{right}</div>
    </div>
  );
}

function ResultCard({
  title,
  emoji,
  kwh,
  cost,
  hint,
}: {
  title: string;
  emoji: string;
  kwh: number;
  cost: number;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BigEmoji>{emoji}</BigEmoji>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Row left="Verbrauch" right={`${kwh.toFixed(3)} kWh`} />
        <Row left="Kosten" right={euro(cost)} />
        {hint ? (
          <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5" />
            <span>{hint}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------- Presets ----------------
const PRESETS = {
  lamp: {
    led: { label: "LED 😇", watts: 8 },
    bulb: { label: "Glühbirne 😬", watts: 60 },
    tube: { label: "Röhre 🏢", watts: 36 },
  },
  tv: {
    new: { label: "Neuer TV 😇", watts: 80 },
    old: { label: "Alter TV 😬", watts: 200 },
  },
  fridge: {
    new: { label: "Neuer Kühlschrank 😇", kwhYear: 150 },
    old: { label: "Alter Kühlschrank 😬", kwhYear: 350 },
  },
  washer: {
    new: { label: "Neue Waschmaschine 😇", kwhCycle: 0.6 },
    old: { label: "Alte Waschmaschine 😬", kwhCycle: 1.2 },
  },
  dishwasher: {
    new: { label: "Neue Spülmaschine 😇", kwhCycle: 0.8 },
    old: { label: "Alte Spülmaschine 😬", kwhCycle: 1.4 },
  },
} as const;

type DeviceType = "WATTS_HOURS" | "WATTS_MINUTES" | "CYCLE_KWH" | "YEAR_KWH";

type Device = {
  key: string;
  name: string;
  emoji: string;
  type: DeviceType;
  watts?: number;
  defaultQty?: number;
  defaultHoursPerDay?: number;
  defaultDaysPerWeek?: number;
  defaultMinutes?: number;
  defaultUsesPerWeek?: number;
  kwhPerCycle?: number;
  defaultCyclesPerWeek?: number;
  kwhPerYear?: number;
};

// ✅ Neu: extra Geräte (mind. 7 Stück) + deine Wünsche (Glätteisen/Toaster/Duftstecker/Handy)
const DEVICES: Device[] = [
  // Licht
  {
    key: "lamp",
    name: "Lampe",
    emoji: "💡",
    type: "WATTS_HOURS",
    watts: PRESETS.lamp.led.watts,
    defaultQty: 3,
    defaultHoursPerDay: 5,
    defaultDaysPerWeek: 7,
  },

  // Unterhaltung / Computer
  {
    key: "tv",
    name: "Fernseher",
    emoji: "📺",
    type: "WATTS_HOURS",
    watts: PRESETS.tv.new.watts,
    defaultQty: 1,
    defaultHoursPerDay: 3,
    defaultDaysPerWeek: 7,
  },
  {
    key: "pc_normal",
    name: "PC (normal)",
    emoji: "💻",
    type: "WATTS_HOURS",
    watts: 150,
    defaultQty: 1,
    defaultHoursPerDay: 4,
    defaultDaysPerWeek: 5,
  },
  {
    key: "pc_gaming",
    name: "PC (Gaming)",
    emoji: "🎮🖥️",
    type: "WATTS_HOURS",
    watts: 450,
    defaultQty: 1,
    defaultHoursPerDay: 3,
    defaultDaysPerWeek: 4,
  },
  // ✅ 7+ neue Verbraucher
  {
    key: "laptop",
    name: "Laptop",
    emoji: "💻👜",
    type: "WATTS_HOURS",
    watts: 60,
    defaultQty: 1,
    defaultHoursPerDay: 4,
    defaultDaysPerWeek: 5,
  },
  {
    key: "monitor",
    name: "Monitor",
    emoji: "🖥️",
    type: "WATTS_HOURS",
    watts: 30,
    defaultQty: 1,
    defaultHoursPerDay: 4,
    defaultDaysPerWeek: 5,
  },
  {
    key: "console",
    name: "Spielkonsole",
    emoji: "🎮",
    type: "WATTS_HOURS",
    watts: 120,
    defaultQty: 1,
    defaultHoursPerDay: 2,
    defaultDaysPerWeek: 4,
  },
  {
    key: "soundbar",
    name: "Soundbar",
    emoji: "🔊",
    type: "WATTS_HOURS",
    watts: 40,
    defaultQty: 1,
    defaultHoursPerDay: 2,
    defaultDaysPerWeek: 7,
  },

  // Küche
  {
    key: "kettle",
    name: "Wasserkocher",
    emoji: "🫖",
    type: "WATTS_MINUTES",
    watts: 2000,
    defaultQty: 1,
    defaultMinutes: 4,
    defaultUsesPerWeek: 14,
  },
  {
    key: "toaster",
    name: "Toaster",
    emoji: "🍞🔥",
    type: "WATTS_MINUTES",
    watts: 1000,
    defaultQty: 1,
    defaultMinutes: 3,
    defaultUsesPerWeek: 7,
  },
  {
    key: "coffee",
    name: "Kaffeemaschine",
    emoji: "☕",
    type: "WATTS_MINUTES",
    watts: 1000,
    defaultQty: 1,
    defaultMinutes: 6,
    defaultUsesPerWeek: 14,
  },
  {
    key: "microwave",
    name: "Mikrowelle",
    emoji: "📦⚡",
    type: "WATTS_MINUTES",
    watts: 1200,
    defaultQty: 1,
    defaultMinutes: 10,
    defaultUsesPerWeek: 7,
  },
  {
    key: "stove_plate",
    name: "Herdplatte",
    emoji: "🍳",
    type: "WATTS_MINUTES",
    watts: 1500,
    defaultQty: 1,
    defaultMinutes: 20,
    defaultUsesPerWeek: 14,
  },
  {
    key: "oven",
    name: "Backofen",
    emoji: "🍕",
    type: "WATTS_MINUTES",
    watts: 2000,
    defaultQty: 1,
    defaultMinutes: 30,
    defaultUsesPerWeek: 7,
  },
  {
    key: "airfryer",
    name: "Airfryer",
    emoji: "🍟🔥",
    type: "WATTS_MINUTES",
    watts: 1500,
    defaultQty: 1,
    defaultMinutes: 20,
    defaultUsesPerWeek: 4,
  },

  // Bad / Haare / Haushalt
  {
    key: "hairdryer",
    name: "Föhn",
    emoji: "💨",
    type: "WATTS_MINUTES",
    watts: 1800,
    defaultQty: 1,
    defaultMinutes: 10,
    defaultUsesPerWeek: 7,
  },
  {
    key: "straightener",
    name: "Glätteisen",
    emoji: "💇🔥",
    type: "WATTS_MINUTES",
    watts: 50,
    defaultQty: 1,
    defaultMinutes: 10,
    defaultUsesPerWeek: 4,
  },
  {
    key: "vacuum",
    name: "Staubsauger",
    emoji: "🧹⚡",
    type: "WATTS_MINUTES",
    watts: 800,
    defaultQty: 1,
    defaultMinutes: 30,
    defaultUsesPerWeek: 1,
  },
  {
    key: "iron",
    name: "Bügeleisen",
    emoji: "👔🔥",
    type: "WATTS_MINUTES",
    watts: 2000,
    defaultQty: 1,
    defaultMinutes: 30,
    defaultUsesPerWeek: 1,
  },
  {
    key: "heater_fan",
    name: "Heizlüfter",
    emoji: "🔥🌀",
    type: "WATTS_HOURS",
    watts: 2000,
    defaultQty: 1,
    defaultHoursPerDay: 1,
    defaultDaysPerWeek: 3,
  },

  // Always-on / Kleinkram
  {
    key: "fridge",
    name: "Kühlschrank",
    emoji: "🧊",
    type: "YEAR_KWH",
    kwhPerYear: PRESETS.fridge.new.kwhYear,
    defaultQty: 1,
  },
  {
    key: "router",
    name: "WLAN-Router",
    emoji: "📶🔌",
    type: "WATTS_HOURS",
    watts: 10,
    defaultQty: 1,
    defaultHoursPerDay: 24,
    defaultDaysPerWeek: 7,
  },
  {
    key: "phone",
    name: "Handy laden",
    emoji: "📱🔌",
    type: "WATTS_HOURS",
    watts: 10,
    defaultQty: 2,
    defaultHoursPerDay: 2,
    defaultDaysPerWeek: 7,
  },
  {
    key: "scent_plug",
    name: "Duftstecker",
    emoji: "🌸🔌",
    type: "WATTS_HOURS",
    watts: 2,
    defaultQty: 2,
    defaultHoursPerDay: 24,
    defaultDaysPerWeek: 7,
  },

  // Heißwasser
  {
    key: "instant_water_heater",
    name: "Durchlauferhitzer (Dusche)",
    emoji: "🚿⚡",
    type: "WATTS_MINUTES",
    watts: 21000,
    defaultQty: 1,
    defaultMinutes: 8,
    defaultUsesPerWeek: 14,
  },

  // Waschen
  {
    key: "washer",
    name: "Waschmaschine",
    emoji: "🧺",
    type: "CYCLE_KWH",
    kwhPerCycle: PRESETS.washer.new.kwhCycle,
    defaultCyclesPerWeek: 3,
  },
  {
    key: "dishwasher",
    name: "Spülmaschine",
    emoji: "🍽️",
    type: "CYCLE_KWH",
    kwhPerCycle: PRESETS.dishwasher.new.kwhCycle,
    defaultCyclesPerWeek: 4,
  },
  {
    key: "dryer",
    name: "Trockner",
    emoji: "🌀",
    type: "CYCLE_KWH",
    kwhPerCycle: 2.5,
    defaultCyclesPerWeek: 2,
  },
];

function findDevice(key: string) {
  return DEVICES.find((d) => d.key === key) ?? DEVICES[0];
}

// ---------------- Vergleich (idiotensicher) ----------------
function runtimeFromKwhWatts(kwh: number, watts: number) {
  const hours = (kwh * 1000) / Math.max(1, watts);
  const days24 = hours / 24;
  const minutes = hours * 60;
  return { hours, days24, minutes };
}

function prettyDurationFromHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return { main: "0", sub: "" };
  if (hours < 1) {
    const m = Math.round(hours * 60);
    return { main: `${m} min`, sub: "" };
  }
  if (hours >= 48) {
    return { main: `${fmt.days(hours / 24)} Tage`, sub: `(${fmt.hours(hours)} h)` };
  }
  return { main: `${fmt.hours(hours)} h`, sub: `(${fmt.days(hours / 24)} Tage 24/7)` };
}

function CompareCard({ kwhMonth, title }: { kwhMonth: number; title: string }) {
  const led = runtimeFromKwhWatts(kwhMonth, 8);
  const bulb = runtimeFromKwhWatts(kwhMonth, 60);
  const gaming = runtimeFromKwhWatts(kwhMonth, 450);
  const shower = runtimeFromKwhWatts(kwhMonth, 21000);
  const showers = shower.minutes / 8;

  const ledPretty = prettyDurationFromHours(led.hours);
  const bulbPretty = prettyDurationFromHours(bulb.hours);
  const gamingPretty = prettyDurationFromHours(gaming.hours);

  const showersMain =
    showers >= 1 ? `${fmt.hours(showers)} Duschen` : `${Math.max(0, Math.round(shower.minutes))} min`;
  const showersSub = showers >= 1 ? "(je 8 min)" : "";

  return (
    <Card className="rounded-2xl shadow-sm border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BigEmoji>🧠</BigEmoji>
          <span>Vergleich (idiotensicher)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl bg-muted p-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{title}</span> ≈
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{kwhMonth.toFixed(1)} kWh / Monat</div>

          <div className="mt-3 text-sm text-muted-foreground">Damit könnte laufen:</div>

          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">💡 LED (8W)</div>
              <div className="text-xl font-bold tabular-nums">{ledPretty.main}</div>
              <div className="text-[11px] text-muted-foreground">{ledPretty.sub || "(24/7)"}</div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">💡 Glühbirne (60W)</div>
              <div className="text-xl font-bold tabular-nums">{bulbPretty.main}</div>
              <div className="text-[11px] text-muted-foreground">{bulbPretty.sub || "(24/7)"}</div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">🎮 Gaming-PC (450W)</div>
              <div className="text-xl font-bold tabular-nums">{gamingPretty.main}</div>
              <div className="text-[11px] text-muted-foreground">{gamingPretty.sub || ""}</div>
            </div>
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">🚿 Dusche (21kW)</div>
              <div className="text-xl font-bold tabular-nums">{showersMain}</div>
              <div className="text-[11px] text-muted-foreground">{showersSub || "(Durchlauferhitzer)"}</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Wenn du bei LED riesige Tage siehst: Licht ist selten das Problem. 😄
        </div>
      </CardContent>
    </Card>
  );
}

function MiniCompareBox({ kwhMonth, title }: { kwhMonth: number; title: string }) {
  const ledDays = runtimeFromKwhWatts(kwhMonth, 8).days24;
  const shower = runtimeFromKwhWatts(kwhMonth, 21000);
  const showers = shower.minutes / 8;
  const showerText =
    showers >= 1
      ? `${fmt.hours(showers)}× Dusche (8 min)`
      : `${Math.max(0, Math.round(shower.minutes))} min Dusche`;

  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm font-semibold">
        💡 LED: <span className="tabular-nums">{fmt.days(ledDays)} Tage</span> (24/7)
      </div>
      <div className="text-sm font-semibold">🚿 {showerText}</div>
    </div>
  );
}

// ---------------- Planner (Monat bauen / Duell) ----------------
type LampType = "led" | "bulb" | "tube";

type PlanItem = {
  id: string;
  key: string;
  qty: number;

  // WATTS_HOURS
  watts: number;
  hoursPerDay: number;
  daysPerWeek: number;

  // WATTS_MINUTES
  minutesPerUse: number;
  usesPerWeek: number;

  // CYCLE_KWH
  kwhPerCycle: number;
  cyclesPerWeek: number;

  // YEAR_KWH
  kwhPerYear: number;

  // Varianten (simpel)
  lampType: LampType;
  tvType: "new" | "old";
  fridgeType: "new" | "old" | "custom";
  washerType: "new" | "old" | "custom";
  dishwasherType: "new" | "old" | "custom";
};

const newId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

function initPlanItem(key: string): PlanItem {
  const d = findDevice(key);
  return {
    id: newId(),
    key,
    qty: d.defaultQty ?? 1,

    watts: d.watts ?? 100,
    hoursPerDay: d.defaultHoursPerDay ?? 2,
    daysPerWeek: d.defaultDaysPerWeek ?? 7,

    minutesPerUse: d.defaultMinutes ?? 10,
    usesPerWeek: d.defaultUsesPerWeek ?? 7,

    kwhPerCycle: d.kwhPerCycle ?? 1,
    cyclesPerWeek: d.defaultCyclesPerWeek ?? 2,

    kwhPerYear: d.kwhPerYear ?? 150,

    lampType: "led",
    tvType: "new",
    fridgeType: "new",
    washerType: "new",
    dishwasherType: "new",
  };
}

function itemKwhMonth(item: PlanItem) {
  const d = findDevice(item.key);

  if (d.type === "WATTS_HOURS") {
    const q = Math.max(1, item.qty);
    const weekHours = item.hoursPerDay * item.daysPerWeek;
    return kwhFromWattsHours(item.watts, weekHours) * q * WEEKS_PER_MONTH;
  }

  if (d.type === "WATTS_MINUTES") {
    const q = Math.max(1, item.qty);
    const perUse = kwhFromWattsHours(item.watts, hoursFromMinutes(item.minutesPerUse)) * q;
    return perUse * item.usesPerWeek * WEEKS_PER_MONTH;
  }

  if (d.type === "CYCLE_KWH") {
    // ✅ Waschmaschine/Spülmaschine: alt/neu wirkt wirklich in Monat bauen
    let perCycle = item.kwhPerCycle;

    if (item.key === "washer") {
      if (item.washerType === "new") perCycle = PRESETS.washer.new.kwhCycle;
      else if (item.washerType === "old") perCycle = PRESETS.washer.old.kwhCycle;
    }

    if (item.key === "dishwasher") {
      if (item.dishwasherType === "new") perCycle = PRESETS.dishwasher.new.kwhCycle;
      else if (item.dishwasherType === "old") perCycle = PRESETS.dishwasher.old.kwhCycle;
    }

    return perCycle * item.cyclesPerWeek * WEEKS_PER_MONTH;
  }

  // YEAR_KWH
  const q = Math.max(1, item.qty);
  return (item.kwhPerYear / 12) * q;
}

function computeFillSuggestion(remainingKwh: number, base: PlanItem) {
  const d = findDevice(base.key);

  if (remainingKwh <= 0) {
    return { title: "Fertig 🎉", lines: ["Du bist schon am Ziel."] };
  }

  if (d.type === "WATTS_HOURS") {
    const q = Math.max(1, base.qty);
    const watts = Math.max(1, base.watts);
    const hoursMonth = (remainingKwh * 1000) / (watts * q);
    const hoursDayEveryDay = hoursMonth / DAYS_PER_MONTH;
    const hoursDay5 = hoursMonth / (DAYS_PER_MONTH * (5 / 7));

    return {
      title: `${d.emoji} ${d.name}: so lange müsste es laufen`,
      lines: [
        `≈ ${fmt.hours(hoursMonth)} Stunden im Monat`,
        `= ${fmt.hours(hoursDayEveryDay)} h pro Tag (jeden Tag)`,
        `oder ≈ ${fmt.hours(hoursDay5)} h pro Tag (nur Mo–Fr)`,
      ],
    };
  }

  if (d.type === "WATTS_MINUTES") {
    const q = Math.max(1, base.qty);
    const perUse = kwhFromWattsHours(Math.max(1, base.watts), hoursFromMinutes(base.minutesPerUse)) * q;
    const uses = perUse > 0 ? remainingKwh / perUse : 0;
    const perWeek = uses / WEEKS_PER_MONTH;

    return {
      title: `${d.emoji} ${d.name}: wie oft nutzen?`,
      lines: [
        `≈ ${fmt.hours(uses)}× benutzen (je ${base.minutesPerUse} min)`,
        `= ≈ ${fmt.hours(perWeek)}× pro Woche`,
      ],
    };
  }

  if (d.type === "CYCLE_KWH") {
    const perCycle = Math.max(0.1, base.kwhPerCycle);
    const cycles = remainingKwh / perCycle;
    const perWeek = cycles / WEEKS_PER_MONTH;

    return {
      title: `${d.emoji} ${d.name}: wie viele Gänge?`,
      lines: [
        `≈ ${fmt.hours(cycles)} Gänge im Monat`,
        `= ≈ ${fmt.hours(perWeek)} Gänge pro Woche`,
      ],
    };
  }

  return {
    title: `${d.emoji} ${d.name}`,
    lines: [
      "Bei Jahresverbrauch-Geräten ist das nicht so gut als Füller.",
      "Nimm lieber ein Gerät mit Stunden/Minuten.",
    ],
  };
}

function PresetButtons({
  value,
  options,
  onPick,
}: {
  value: string;
  options: { key: string; label: string; sub?: string }[];
  onPick: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o.key}
          type="button"
          variant={o.key === value ? "default" : "outline"}
          className="rounded-2xl"
          onClick={() => onPick(o.key)}
        >
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight">{o.label}</div>
            {o.sub ? (
              <div className="text-[11px] text-muted-foreground leading-tight">{o.sub}</div>
            ) : null}
          </div>
        </Button>
      ))}
    </div>
  );
}

function DevicePicker({ title, onPick }: { title: string; onPick: (key: string) => void }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {DEVICES.map((d) => (
            <Button
              key={d.key}
              variant="outline"
              className="rounded-2xl h-auto py-3 justify-start"
              onClick={() => onPick(d.key)}
            >
              <div className="flex items-center gap-2">
                <BigEmoji>{d.emoji}</BigEmoji>
                <div className="text-left">
                  <div className="text-sm font-semibold leading-tight">{d.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">
                    {d.type === "WATTS_HOURS" && "Stunden"}
                    {d.type === "WATTS_MINUTES" && "Minuten"}
                    {d.type === "CYCLE_KWH" && "Gänge"}
                    {d.type === "YEAR_KWH" && "Jahr"}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function hslColor(i: number) {
  return `hsl(${(i * 53) % 360} 70% 55%)`;
}

// ---------------- Main App ----------------
export default function StromkostenCheckerUltraEinfach() {
  const [page, setPage] = useState<"rechner" | "duell" | "monat" | "tipps">("rechner");
  const [advanced, setAdvanced] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const [price, setPrice] = useState(0.35);

  // -------- Rechner (ein Gerät) --------
  const [selectedKey, setSelectedKey] = useState("lamp");
  const selected = useMemo(() => findDevice(selectedKey), [selectedKey]);

  const [qty, setQty] = useState(3);
  const [watts, setWatts] = useState(PRESETS.lamp.led.watts);
  const [hoursPerDay, setHoursPerDay] = useState(5);
  const [daysPerWeek, setDaysPerWeek] = useState(7);
  const [minutesPerUse, setMinutesPerUse] = useState(6);
  const [usesPerWeek, setUsesPerWeek] = useState(7);
  const [kwhPerCycle, setKwhPerCycle] = useState(PRESETS.washer.new.kwhCycle);
  const [cyclesPerWeek, setCyclesPerWeek] = useState(3);
  const [kwhPerYear, setKwhPerYear] = useState(PRESETS.fridge.new.kwhYear);

  const [lampType, setLampType] = useState<LampType>("led");
  const [tvType, setTvType] = useState<"new" | "old">("new");
  const [fridgeType, setFridgeType] = useState<"new" | "old" | "custom">("new");
  const [washerType, setWasherType] = useState<"new" | "old" | "custom">("new");
  const [dishType, setDishType] = useState<"new" | "old" | "custom">("new");

  useEffect(() => {
    setQty(selected.defaultQty ?? 1);

    if (selected.key === "lamp") {
      setLampType("led");
      setWatts(PRESETS.lamp.led.watts);
    }

    if (selected.key === "tv") {
      setTvType("new");
      setWatts(PRESETS.tv.new.watts);
    }

    if (selected.key === "fridge") {
      setFridgeType("new");
      setKwhPerYear(PRESETS.fridge.new.kwhYear);
    }

    if (selected.key === "washer") {
      setWasherType("new");
      setKwhPerCycle(PRESETS.washer.new.kwhCycle);
      setCyclesPerWeek(selected.defaultCyclesPerWeek ?? 3);
    }

    if (selected.key === "dishwasher") {
      setDishType("new");
      setKwhPerCycle(PRESETS.dishwasher.new.kwhCycle);
      setCyclesPerWeek(selected.defaultCyclesPerWeek ?? 4);
    }

    if (selected.type === "WATTS_HOURS") {
      setWatts(selected.watts ?? watts);
      setHoursPerDay(selected.defaultHoursPerDay ?? 2);
      setDaysPerWeek(selected.defaultDaysPerWeek ?? 7);
    }

    if (selected.type === "WATTS_MINUTES") {
      setWatts(selected.watts ?? watts);
      setMinutesPerUse(selected.defaultMinutes ?? 10);
      setUsesPerWeek(selected.defaultUsesPerWeek ?? 7);
    }

    if (selected.type === "CYCLE_KWH") {
      setKwhPerCycle(selected.kwhPerCycle ?? kwhPerCycle);
      setCyclesPerWeek(selected.defaultCyclesPerWeek ?? 2);
    }

    if (selected.type === "YEAR_KWH") {
      setKwhPerYear(selected.kwhPerYear ?? kwhPerYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const calcSingle = useMemo(() => {
    const p = price;
    const q = Math.max(1, qty);

    if (selected.type === "WATTS_HOURS") {
      const weekHours = hoursPerDay * daysPerWeek;
      const kwhWeek = kwhFromWattsHours(watts, weekHours) * q;
      const kwhMonth = kwhWeek * WEEKS_PER_MONTH;
      const kwhYear = kwhWeek * 52;
      return {
        perUseKwh: null as number | null,
        perUseCost: null as number | null,
        perDayKwh: kwhFromWattsHours(watts, hoursPerDay) * q,
        perDayCost: kwhFromWattsHours(watts, hoursPerDay) * q * p,
        perMonthKwh: kwhMonth,
        perMonthCost: kwhMonth * p,
        perYearKwh: kwhYear,
        perYearCost: kwhYear * p,
      };
    }

    if (selected.type === "WATTS_MINUTES") {
      const perUseKwh = kwhFromWattsHours(watts, hoursFromMinutes(minutesPerUse)) * q;
      const perUseCost = perUseKwh * p;
      const kwhWeek = perUseKwh * usesPerWeek;
      const kwhMonth = kwhWeek * WEEKS_PER_MONTH;
      const kwhYear = kwhWeek * 52;
      return {
        perUseKwh,
        perUseCost,
        perDayKwh: null as number | null,
        perDayCost: null as number | null,
        perMonthKwh: kwhMonth,
        perMonthCost: kwhMonth * p,
        perYearKwh: kwhYear,
        perYearCost: kwhYear * p,
      };
    }

    if (selected.type === "CYCLE_KWH") {
      const perUseKwh = kwhPerCycle;
      const perUseCost = perUseKwh * p;
      const kwhWeek = perUseKwh * cyclesPerWeek;
      const kwhMonth = kwhWeek * WEEKS_PER_MONTH;
      const kwhYear = kwhWeek * 52;
      return {
        perUseKwh,
        perUseCost,
        perDayKwh: null as number | null,
        perDayCost: null as number | null,
        perMonthKwh: kwhMonth,
        perMonthCost: kwhMonth * p,
        perYearKwh: kwhYear,
        perYearCost: kwhYear * p,
      };
    }

    // YEAR_KWH
    const year = kwhPerYear;
    const day = year / 365;
    return {
      perUseKwh: null as number | null,
      perUseCost: null as number | null,
      perDayKwh: day * q,
      perDayCost: day * q * p,
      perMonthKwh: (year / 12) * q,
      perMonthCost: (year / 12) * q * p,
      perYearKwh: year * q,
      perYearCost: year * q * p,
    };
  }, [
    selected,
    price,
    qty,
    watts,
    hoursPerDay,
    daysPerWeek,
    minutesPerUse,
    usesPerWeek,
    kwhPerCycle,
    cyclesPerWeek,
    kwhPerYear,
  ]);

  const priceBox = (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dein Strompreis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="price">€/kWh</Label>
          <Input
            id="price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(clampNum(e.target.value, 0, 2))}
          />
          <div className="text-xs text-muted-foreground">z.B. 0,35</div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Nerd-Schalter</div>
            <div className="text-xs text-muted-foreground">Watt/kWh selbst ändern</div>
          </div>
          <Switch checked={advanced} onCheckedChange={setAdvanced} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Großer Vergleich</div>
            <div className="text-xs text-muted-foreground">Platzfresser (an/aus)</div>
          </div>
          <Switch checked={showCompare} onCheckedChange={setShowCompare} />
        </div>
      </CardContent>
    </Card>
  );

  const deviceGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {DEVICES.map((d) => (
        <Button
          key={d.key}
          variant={d.key === selectedKey ? "default" : "outline"}
          className="rounded-2xl h-auto py-3 justify-start"
          onClick={() => setSelectedKey(d.key)}
        >
          <div className="flex items-center gap-2">
            <BigEmoji>{d.emoji}</BigEmoji>
            <div className="text-left">
              <div className="text-sm font-semibold leading-tight">{d.name}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {d.type === "WATTS_HOURS" && "Stunden"}
                {d.type === "WATTS_MINUTES" && "Minuten"}
                {d.type === "CYCLE_KWH" && "Gänge"}
                {d.type === "YEAR_KWH" && "Jahr"}
              </div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );

  const singleInputs = (
    <div className="space-y-4">
      {selected.type !== "CYCLE_KWH" ? (
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Wie viele?</div>
            <Pill>{qty}×</Pill>
          </div>
          <div className="mt-2">
            <Slider value={[qty]} onValueChange={(v) => setQty(clampNum(v?.[0], 1, 30))} max={30} step={1} />
          </div>
        </div>
      ) : null}

      {selected.key === "lamp" ? (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm font-semibold">Lampentyp</div>
          <PresetButtons
            value={lampType}
            options={[
              { key: "led", label: "LED 😇", sub: "8W" },
              { key: "bulb", label: "Glühbirne 😬", sub: "60W" },
              { key: "tube", label: "Röhre 🏢", sub: "36W" },
            ]}
            onPick={(k) => {
              const kk = k as LampType;
              setLampType(kk);
              setWatts(PRESETS.lamp[kk].watts);
            }}
          />
        </div>
      ) : null}

      {selected.key === "tv" ? (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm font-semibold">TV</div>
          <PresetButtons
            value={tvType}
            options={[
              { key: "new", label: "Neu 😇", sub: "80W" },
              { key: "old", label: "Alt 😬", sub: "200W" },
            ]}
            onPick={(k) => {
              const kk = k as "new" | "old";
              setTvType(kk);
              setWatts(PRESETS.tv[kk].watts);
            }}
          />
        </div>
      ) : null}

      {selected.key === "fridge" ? (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm font-semibold">Kühlschrank</div>
          <PresetButtons
            value={fridgeType}
            options={[
              { key: "new", label: "Neu 😇", sub: "150 kWh/Jahr" },
              { key: "old", label: "Alt 😬", sub: "350 kWh/Jahr" },
              { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Jahr" },
            ]}
            onPick={(k) => {
              const kk = k as "new" | "old" | "custom";
              setFridgeType(kk);
              if (kk === "new") setKwhPerYear(PRESETS.fridge.new.kwhYear);
              if (kk === "old") setKwhPerYear(PRESETS.fridge.old.kwhYear);
            }}
          />
          <div className="space-y-1">
            <Label>kWh/Jahr</Label>
            <Input
              inputMode="numeric"
              value={kwhPerYear}
              onChange={(e) => {
                setFridgeType("custom");
                setKwhPerYear(clampNum(e.target.value, 20, 4000));
              }}
            />
          </div>
        </div>
      ) : null}

      {selected.key === "washer" ? (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm font-semibold">Waschmaschine</div>
          <PresetButtons
            value={washerType}
            options={[
              { key: "new", label: "Neu 😇", sub: "0,6 kWh/Gang" },
              { key: "old", label: "Alt 😬", sub: "1,2 kWh/Gang" },
              { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Gang" },
            ]}
            onPick={(k) => {
              const kk = k as "new" | "old" | "custom";
              setWasherType(kk);
              if (kk === "new") setKwhPerCycle(PRESETS.washer.new.kwhCycle);
              if (kk === "old") setKwhPerCycle(PRESETS.washer.old.kwhCycle);
            }}
          />
        </div>
      ) : null}

      {selected.key === "dishwasher" ? (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="text-sm font-semibold">Spülmaschine</div>
          <PresetButtons
            value={dishType}
            options={[
              { key: "new", label: "Neu 😇", sub: "0,8 kWh/Gang" },
              { key: "old", label: "Alt 😬", sub: "1,4 kWh/Gang" },
              { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Gang" },
            ]}
            onPick={(k) => {
              const kk = k as "new" | "old" | "custom";
              setDishType(kk);
              if (kk === "new") setKwhPerCycle(PRESETS.dishwasher.new.kwhCycle);
              if (kk === "old") setKwhPerCycle(PRESETS.dishwasher.old.kwhCycle);
            }}
          />
        </div>
      ) : null}

      {selected.type === "WATTS_HOURS" ? (
        <div className="rounded-2xl border p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Stunden pro Tag</Label>
              <Pill>{hoursPerDay} h</Pill>
            </div>
            <Slider
              value={[hoursPerDay]}
              onValueChange={(v) => setHoursPerDay(clampNum(v?.[0], 0, 24))}
              max={24}
              step={0.5}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tage pro Woche</Label>
              <Pill>{daysPerWeek}</Pill>
            </div>
            <Slider
              value={[daysPerWeek]}
              onValueChange={(v) => setDaysPerWeek(clampNum(v?.[0], 1, 7))}
              max={7}
              step={1}
            />
          </div>
          {advanced ? (
            <div className="space-y-1">
              <Label>Watt</Label>
              <Input
                inputMode="numeric"
                value={watts}
                onChange={(e) => setWatts(clampNum(e.target.value, 1, 200000))}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {selected.type === "WATTS_MINUTES" ? (
        <div className="rounded-2xl border p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Minuten pro Nutzung</Label>
              <Pill>{minutesPerUse} min</Pill>
            </div>
            <Slider
              value={[minutesPerUse]}
              onValueChange={(v) => setMinutesPerUse(clampNum(v?.[0], 0, 240))}
              max={240}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Wie oft pro Woche?</Label>
              <Pill>{usesPerWeek}×</Pill>
            </div>
            <Slider
              value={[usesPerWeek]}
              onValueChange={(v) => setUsesPerWeek(clampNum(v?.[0], 0, 100))}
              max={100}
              step={1}
            />
          </div>
          {advanced ? (
            <div className="space-y-1">
              <Label>Watt</Label>
              <Input
                inputMode="numeric"
                value={watts}
                onChange={(e) => setWatts(clampNum(e.target.value, 1, 200000))}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {selected.type === "CYCLE_KWH" ? (
        <div className="rounded-2xl border p-4 space-y-4">
          <div className="space-y-1">
            <Label>kWh pro Gang</Label>
            <Input
              inputMode="decimal"
              value={kwhPerCycle}
              onChange={(e) => setKwhPerCycle(clampNum(e.target.value, 0.1, 20))}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Gänge pro Woche</Label>
              <Pill>{cyclesPerWeek}×</Pill>
            </div>
            <Slider
              value={[cyclesPerWeek]}
              onValueChange={(v) => setCyclesPerWeek(clampNum(v?.[0], 0, 50))}
              max={50}
              step={1}
            />
          </div>
        </div>
      ) : null}

      {selected.type === "YEAR_KWH" ? (
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="text-sm text-muted-foreground">Bei Kühlschrank zählt der Jahresverbrauch.</div>
        </div>
      ) : null}
    </div>
  );

  const rechnerPage = (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rechner (ein Gerät)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deviceGrid}
        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BigEmoji>{selected.emoji}</BigEmoji>
            <div>
              <div className="font-semibold">{selected.name}</div>
              <div className="text-xs text-muted-foreground">Stell’s kurz ein 👇</div>
            </div>
          </div>
          <Pill>{euro(price)} / kWh</Pill>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>{singleInputs}</div>
          <div className="space-y-3">
            {selected.type !== "WATTS_HOURS" ? (
              <ResultCard
                title="1× benutzen"
                emoji="✅"
                kwh={calcSingle.perUseKwh ?? 0}
                cost={calcSingle.perUseCost ?? 0}
              />
            ) : (
              <ResultCard
                title="Pro Tag"
                emoji="📅"
                kwh={calcSingle.perDayKwh ?? 0}
                cost={calcSingle.perDayCost ?? 0}
              />
            )}

            <ResultCard title="Pro Monat (≈)" emoji="🗓️" kwh={calcSingle.perMonthKwh} cost={calcSingle.perMonthCost} />

            {showCompare ? (
              <CompareCard kwhMonth={calcSingle.perMonthKwh} title={`${selected.emoji} ${selected.name}`} />
            ) : (
              <MiniCompareBox kwhMonth={calcSingle.perMonthKwh} title="Vergleich (klein)" />
            )}

            <ResultCard title="Pro Jahr" emoji="🏁" kwh={calcSingle.perYearKwh} cost={calcSingle.perYearCost} />
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span>
            Formel: <span className="font-medium text-foreground">kWh = Watt × Stunden ÷ 1000</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );

  // -------- Duell --------
  const [pickSide, setPickSide] = useState<"left" | "right">("left");
  const [duelLeft, setDuelLeft] = useState<PlanItem>(() => initPlanItem("lamp"));
  const [duelRight, setDuelRight] = useState<PlanItem>(() => initPlanItem("tv"));

  const duelA = useMemo(() => itemKwhMonth(duelLeft), [duelLeft]);
  const duelB = useMemo(() => itemKwhMonth(duelRight), [duelRight]);

  const duelSummary = useMemo(() => {
    const a = duelA * price;
    const b = duelB * price;
    if (Math.abs(a - b) < 0.000001) return "Unentschieden 🤝";
    const winner = a > b ? "Links" : "Rechts";
    const other = a > b ? "Rechts" : "Links";
    const diff = Math.abs(a - b);
    return `${winner} ist das Strom-Monster 🐉 (${other} ist braver 😇). +${euro(diff)} / Monat`;
  }, [duelA, duelB, price]);

  const duelPick = (key: string) => {
    if (pickSide === "left") setDuelLeft(initPlanItem(key));
    else setDuelRight(initPlanItem(key));
  };

  const duelCard = (title: string, item: PlanItem, setItem: (v: PlanItem) => void) => {
    const d = findDevice(item.key);
    const kwhM = itemKwhMonth(item);

    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BigEmoji>{d.emoji}</BigEmoji>
              <span>
                {title}: {d.name}
              </span>
            </span>
            <Pill>{euro(kwhM * price)} / Monat</Pill>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {d.type !== "CYCLE_KWH" ? (
            <div className="rounded-2xl border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Wie viele?</div>
                <Pill>{item.qty}×</Pill>
              </div>
              <div className="mt-2">
                <Slider
                  value={[item.qty]}
                  onValueChange={(v) => setItem({ ...item, qty: clampNum(v?.[0], 1, 30) })}
                  max={30}
                  step={1}
                />
              </div>
            </div>
          ) : null}

          {item.key === "lamp" ? (
            <div className="rounded-2xl border p-3 space-y-2">
              <div className="text-sm font-semibold">Lampentyp</div>
              <PresetButtons
                value={item.lampType}
                options={[
                  { key: "led", label: "LED 😇", sub: "8W" },
                  { key: "bulb", label: "Glühbirne 😬", sub: "60W" },
                  { key: "tube", label: "Röhre 🏢", sub: "36W" },
                ]}
                onPick={(k) => {
                  const kk = k as LampType;
                  setItem({ ...item, lampType: kk, watts: PRESETS.lamp[kk].watts });
                }}
              />
            </div>
          ) : null}

          {item.key === "tv" ? (
            <div className="rounded-2xl border p-3 space-y-2">
              <div className="text-sm font-semibold">TV</div>
              <PresetButtons
                value={item.tvType}
                options={[
                  { key: "new", label: "Neu 😇", sub: "80W" },
                  { key: "old", label: "Alt 😬", sub: "200W" },
                ]}
                onPick={(k) => {
                  const kk = k as "new" | "old";
                  setItem({ ...item, tvType: kk, watts: PRESETS.tv[kk].watts });
                }}
              />
            </div>
          ) : null}

          {item.key === "fridge" ? (
            <div className="rounded-2xl border p-3 space-y-2">
              <div className="text-sm font-semibold">Kühlschrank</div>
              <PresetButtons
                value={item.fridgeType}
                options={[
                  { key: "new", label: "Neu 😇", sub: "150 kWh/Jahr" },
                  { key: "old", label: "Alt 😬", sub: "350 kWh/Jahr" },
                  { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Jahr" },
                ]}
                onPick={(k) => {
                  const kk = k as "new" | "old" | "custom";
                  const y =
                    kk === "new"
                      ? PRESETS.fridge.new.kwhYear
                      : kk === "old"
                      ? PRESETS.fridge.old.kwhYear
                      : item.kwhPerYear;
                  setItem({ ...item, fridgeType: kk, kwhPerYear: y });
                }}
              />
              <div className="space-y-1">
                <Label>kWh/Jahr</Label>
                <Input
                  inputMode="numeric"
                  value={item.kwhPerYear}
                  onChange={(e) => setItem({ ...item, fridgeType: "custom", kwhPerYear: clampNum(e.target.value, 20, 4000) })}
                />
              </div>
            </div>
          ) : null}

          {item.key === "washer" ? (
            <div className="rounded-2xl border p-3 space-y-2">
              <div className="text-sm font-semibold">Waschmaschine</div>
              <PresetButtons
                value={item.washerType}
                options={[
                  { key: "new", label: "Neu 😇", sub: "0,6 kWh/Gang" },
                  { key: "old", label: "Alt 😬", sub: "1,2 kWh/Gang" },
                  { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Gang" },
                ]}
                onPick={(k) => {
                  const kk = k as "new" | "old" | "custom";
                  const v =
                    kk === "new"
                      ? PRESETS.washer.new.kwhCycle
                      : kk === "old"
                      ? PRESETS.washer.old.kwhCycle
                      : item.kwhPerCycle;
                  setItem({ ...item, washerType: kk, kwhPerCycle: v });
                }}
              />
            </div>
          ) : null}

          {item.key === "dishwasher" ? (
            <div className="rounded-2xl border p-3 space-y-2">
              <div className="text-sm font-semibold">Spülmaschine</div>
              <PresetButtons
                value={item.dishwasherType}
                options={[
                  { key: "new", label: "Neu 😇", sub: "0,8 kWh/Gang" },
                  { key: "old", label: "Alt 😬", sub: "1,4 kWh/Gang" },
                  { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Gang" },
                ]}
                onPick={(k) => {
                  const kk = k as "new" | "old" | "custom";
                  const v =
                    kk === "new"
                      ? PRESETS.dishwasher.new.kwhCycle
                      : kk === "old"
                      ? PRESETS.dishwasher.old.kwhCycle
                      : item.kwhPerCycle;
                  setItem({ ...item, dishwasherType: kk, kwhPerCycle: v });
                }}
              />
            </div>
          ) : null}

          {d.type === "WATTS_HOURS" ? (
            <div className="rounded-2xl border p-3 space-y-3">
              <div className="text-sm font-semibold">Nutzung</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Stunden/Tag</span>
                  <Pill>{item.hoursPerDay} h</Pill>
                </div>
                <Slider
                  value={[item.hoursPerDay]}
                  onValueChange={(v) => setItem({ ...item, hoursPerDay: clampNum(v?.[0], 0, 24) })}
                  max={24}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Tage/Woche</span>
                  <Pill>{item.daysPerWeek}</Pill>
                </div>
                <Slider
                  value={[item.daysPerWeek]}
                  onValueChange={(v) => setItem({ ...item, daysPerWeek: clampNum(v?.[0], 1, 7) })}
                  max={7}
                  step={1}
                />
              </div>
              {advanced ? (
                <div className="space-y-1">
                  <Label>Watt</Label>
                  <Input
                    inputMode="numeric"
                    value={item.watts}
                    onChange={(e) => setItem({ ...item, watts: clampNum(e.target.value, 1, 200000) })}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {d.type === "WATTS_MINUTES" ? (
            <div className="rounded-2xl border p-3 space-y-3">
              <div className="text-sm font-semibold">Nutzung</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Min/Nutzung</span>
                  <Pill>{item.minutesPerUse} min</Pill>
                </div>
                <Slider
                  value={[item.minutesPerUse]}
                  onValueChange={(v) => setItem({ ...item, minutesPerUse: clampNum(v?.[0], 0, 240) })}
                  max={240}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Wie oft/Woche</span>
                  <Pill>{item.usesPerWeek}×</Pill>
                </div>
                <Slider
                  value={[item.usesPerWeek]}
                  onValueChange={(v) => setItem({ ...item, usesPerWeek: clampNum(v?.[0], 0, 100) })}
                  max={100}
                  step={1}
                />
              </div>
              {advanced ? (
                <div className="space-y-1">
                  <Label>Watt</Label>
                  <Input
                    inputMode="numeric"
                    value={item.watts}
                    onChange={(e) => setItem({ ...item, watts: clampNum(e.target.value, 1, 200000) })}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {d.type === "CYCLE_KWH" ? (
            <div className="rounded-2xl border p-3 space-y-3">
              <div className="text-sm font-semibold">Nutzung</div>
              <div className="space-y-1">
                <Label>kWh/Gang</Label>
                <Input
                  inputMode="decimal"
                  value={item.kwhPerCycle}
                  onChange={(e) => setItem({ ...item, kwhPerCycle: clampNum(e.target.value, 0.1, 20) })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Gänge/Woche</span>
                  <Pill>{item.cyclesPerWeek}×</Pill>
                </div>
                <Slider
                  value={[item.cyclesPerWeek]}
                  onValueChange={(v) => setItem({ ...item, cyclesPerWeek: clampNum(v?.[0], 0, 30) })}
                  max={30}
                  step={1}
                />
              </div>
            </div>
          ) : null}

          {d.type === "YEAR_KWH" ? (
            <div className="rounded-2xl border p-3 space-y-1">
              <Label>kWh/Jahr</Label>
              <Input
                inputMode="numeric"
                value={item.kwhPerYear}
                onChange={(e) => setItem({ ...item, kwhPerYear: clampNum(e.target.value, 20, 4000) })}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  const duelPage = (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="h-4 w-4" /> Duell (Links vs Rechts)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="rounded-2xl"
              variant={pickSide === "left" ? "default" : "outline"}
              onClick={() => setPickSide("left")}
            >
              🫲 LINKS wählen
            </Button>
            <Button
              className="rounded-2xl"
              variant={pickSide === "right" ? "default" : "outline"}
              onClick={() => setPickSide("right")}
            >
              🫱 RECHTS wählen
            </Button>
            <Button
              className="rounded-2xl"
              variant="outline"
              onClick={() => {
                setDuelLeft(duelRight);
                setDuelRight(duelLeft);
              }}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Tauschen
            </Button>
          </div>

          <DevicePicker
            title="Wähle ein Gerät (klick!)"
            onPick={(k) => {
              duelPick(k);
            }}
          />

          <Separator />

          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">Ergebnis (Monat)</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-muted p-3">
                <div className="text-xs text-muted-foreground">Links</div>
                <div className="text-xl font-bold tabular-nums">{euro(duelA * price)}</div>
              </div>
              <div className="rounded-2xl bg-muted p-3">
                <div className="text-xs text-muted-foreground">Rechts</div>
                <div className="text-xl font-bold tabular-nums">{euro(duelB * price)}</div>
              </div>
              <div className="rounded-2xl bg-muted p-3">
                <div className="text-xs text-muted-foreground">Fazit</div>
                <div className="text-sm font-semibold">{duelSummary}</div>
              </div>
            </div>
          </div>

          <MiniCompareBox kwhMonth={Math.max(duelA, duelB)} title="Mini-Vergleich (vom Monster)" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {duelCard("Links", duelLeft, setDuelLeft)}
        {duelCard("Rechts", duelRight, setDuelRight)}
      </div>
    </div>
  );

  // -------- Monat bauen (Ziel kWh) --------
  const [targetKwhMonth, setTargetKwhMonth] = useState(250);
  const [planItems, setPlanItems] = useState<PlanItem[]>(() => [
    initPlanItem("fridge"),
    initPlanItem("lamp"),
    initPlanItem("tv"),
  ]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const totalPlanKwh = useMemo(
    () => planItems.reduce((sum, it) => sum + itemKwhMonth(it), 0),
    [planItems]
  );

  const breakdown = useMemo(() => {
    return planItems
      .map((it) => {
        const d = findDevice(it.key);
        const kwh = itemKwhMonth(it);
        return { id: it.id, name: d.name, emoji: d.emoji, kwh };
      })
      .filter((x) => x.kwh > 0.0001)
      .sort((a, b) => b.kwh - a.kwh);
  }, [planItems]);

  const remaining = Math.max(0, targetKwhMonth - totalPlanKwh);
  const over = Math.max(0, totalPlanKwh - targetKwhMonth);
  const pct = targetKwhMonth > 0 ? Math.max(0, Math.min(100, (totalPlanKwh / targetKwhMonth) * 100)) : 0;

  const [fillKey, setFillKey] = useState("kettle");
  const fillBase = useMemo(() => initPlanItem(fillKey), [fillKey]);
  const fill = useMemo(() => computeFillSuggestion(remaining, fillBase), [remaining, fillBase]);

  const updateItem = (id: string, patch: Partial<PlanItem>) => {
    setPlanItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeItem = (id: string) => {
    setPlanItems((arr) => arr.filter((x) => x.id !== id));
  };

  const monthPage = (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monat bauen ✅</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Dein Ziel (kWh/Monat)</Label>
              <Input
                inputMode="numeric"
                value={targetKwhMonth}
                onChange={(e) => setTargetKwhMonth(clampNum(e.target.value, 0, 2000))}
              />
              <div className="text-xs text-muted-foreground">Ziel-Kosten: {euro(targetKwhMonth * price)}</div>
            </div>

            <div className="md:col-span-2 rounded-2xl bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Füllstand</div>
                  <div className="text-xs text-muted-foreground">Du klickst Geräte rein, bis das Ziel voll ist.</div>
                </div>
                <Pill>
                  {totalPlanKwh.toFixed(1)} / {targetKwhMonth.toFixed(0)} kWh
                </Pill>
              </div>

              <div className="mt-3 space-y-2">
                <div className="h-4 w-full rounded-full bg-background overflow-hidden">
                  <div className="h-full flex" style={{ width: `${pct}%` }}>
                    {breakdown.length ? (
                      breakdown.map((x, i) => (
                        <div
                          key={x.id}
                          title={`${x.emoji} ${x.name}: ${x.kwh.toFixed(1)} kWh/Monat`}
                          className="h-full"
                          style={{
                            flex: Math.max(0.01, x.kwh),
                            background: hslColor(i),
                          }}
                        />
                      ))
                    ) : (
                      <div className="h-full w-full bg-foreground/20" />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {breakdown.slice(0, 10).map((x, i) => {
                    const share = totalPlanKwh > 0 ? Math.round((x.kwh / totalPlanKwh) * 100) : 0;
                    return (
                      <span
                        key={x.id}
                        title={`${x.emoji} ${x.name}: ${x.kwh.toFixed(1)} kWh/Monat`}
                        className="inline-flex items-center gap-2 rounded-full bg-background/60 px-2.5 py-1 text-xs"
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: hslColor(i) }} />
                        <span className="leading-none">{x.emoji}</span>
                        <span className="font-semibold tabular-nums">{share}%</span>
                      </span>
                    );
                  })}
                  {breakdown.length > 10 ? <Pill>+{breakdown.length - 10} mehr</Pill> : null}
                </div>

                <div className="text-xs text-muted-foreground">
                  Je größer die Prozentzahl, desto mehr macht das Gerät deinen Monat voll. 😄
                </div>
              </div>

              <div className="mt-2 text-sm font-semibold">
                {remaining > 0 ? (
                  <span>
                    Es fehlen noch <span className="tabular-nums">{remaining.toFixed(1)} kWh</span> 😅
                  </span>
                ) : over > 0 ? (
                  <span>
                    Du bist drüber um <span className="tabular-nums">{over.toFixed(1)} kWh</span> 😬
                  </span>
                ) : (
                  <span>Perfekt getroffen 🎯😄</span>
                )}
              </div>

              <MiniCompareBox kwhMonth={totalPlanKwh} title="Mini-Vergleich (dein Monat)" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-2xl" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Gerät hinzufügen
            </Button>
            <Button
              className="rounded-2xl"
              variant="outline"
              onClick={() => setPlanItems([initPlanItem("fridge"), initPlanItem("lamp"), initPlanItem("tv")])}
            >
              Reset
            </Button>
          </div>

          {pickerOpen ? (
            <div className="space-y-3">
              <DevicePicker
                title="Wähle ein Gerät (klick!)"
                onPick={(k) => {
                  // ✅ neu hinzugefügt kommt immer ganz oben
                  setPlanItems((arr) => [initPlanItem(k), ...arr]);
                  setPickerOpen(false);
                }}
              />
              <Button className="rounded-2xl" variant="outline" onClick={() => setPickerOpen(false)}>
                Schließen
              </Button>
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            {planItems.map((it) => {
              const d = findDevice(it.key);
              const kwhM = itemKwhMonth(it);

              return (
                <Card key={it.id} className="rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BigEmoji>{d.emoji}</BigEmoji>
                        <span>{d.name}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Pill>{kwhM.toFixed(1)} kWh/Monat</Pill>
                        <Button variant="outline" className="rounded-2xl" onClick={() => removeItem(it.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {d.type !== "CYCLE_KWH" ? (
                      <div className="rounded-2xl border p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">Wie viele?</div>
                          <Pill>{it.qty}×</Pill>
                        </div>
                        <div className="mt-2">
                          <Slider
                            value={[it.qty]}
                            onValueChange={(v) => updateItem(it.id, { qty: clampNum(v?.[0], 1, 30) })}
                            max={30}
                            step={1}
                          />
                        </div>
                      </div>
                    ) : null}

                    {it.key === "lamp" ? (
                      <div className="rounded-2xl border p-3 space-y-2">
                        <div className="text-sm font-semibold">Lampentyp</div>
                        <PresetButtons
                          value={it.lampType}
                          options={[
                            { key: "led", label: "LED 😇", sub: "8W" },
                            { key: "bulb", label: "Glühbirne 😬", sub: "60W" },
                            { key: "tube", label: "Röhre 🏢", sub: "36W" },
                          ]}
                          onPick={(k) => {
                            const kk = k as LampType;
                            updateItem(it.id, { lampType: kk, watts: PRESETS.lamp[kk].watts });
                          }}
                        />
                      </div>
                    ) : null}

                    {it.key === "tv" ? (
                      <div className="rounded-2xl border p-3 space-y-2">
                        <div className="text-sm font-semibold">TV</div>
                        <PresetButtons
                          value={it.tvType}
                          options={[
                            { key: "new", label: "Neu 😇", sub: "80W" },
                            { key: "old", label: "Alt 😬", sub: "200W" },
                          ]}
                          onPick={(k) => {
                            const kk = k as "new" | "old";
                            updateItem(it.id, { tvType: kk, watts: PRESETS.tv[kk].watts });
                          }}
                        />
                      </div>
                    ) : null}

                    {it.key === "fridge" ? (
                      <div className="rounded-2xl border p-3 space-y-2">
                        <div className="text-sm font-semibold">Kühlschrank</div>
                        <PresetButtons
                          value={it.fridgeType}
                          options={[
                            { key: "new", label: "Neu 😇", sub: "150 kWh/Jahr" },
                            { key: "old", label: "Alt 😬", sub: "350 kWh/Jahr" },
                            { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Jahr" },
                          ]}
                          onPick={(k) => {
                            const kk = k as "new" | "old" | "custom";
                            const y =
                              kk === "new"
                                ? PRESETS.fridge.new.kwhYear
                                : kk === "old"
                                ? PRESETS.fridge.old.kwhYear
                                : it.kwhPerYear;
                            updateItem(it.id, { fridgeType: kk, kwhPerYear: y });
                          }}
                        />
                        <div className="space-y-1">
                          <Label>kWh/Jahr</Label>
                          <Input
                            inputMode="numeric"
                            value={it.kwhPerYear}
                            onChange={(e) => updateItem(it.id, { fridgeType: "custom", kwhPerYear: clampNum(e.target.value, 20, 4000) })}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* ✅ Waschmaschine alt/neu */}
                    {it.key === "washer" ? (
                      <div className="rounded-2xl border p-3 space-y-2">
                        <div className="text-sm font-semibold">Waschmaschine</div>
                        <PresetButtons
                          value={it.washerType}
                          options={[
                            { key: "new", label: "Neu 😇", sub: "0,6 kWh/Gang" },
                            { key: "old", label: "Alt 😬", sub: "1,2 kWh/Gang" },
                            { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Gang" },
                          ]}
                          onPick={(k) => {
                            const kk = k as "new" | "old" | "custom";
                            const v =
                              kk === "new"
                                ? PRESETS.washer.new.kwhCycle
                                : kk === "old"
                                ? PRESETS.washer.old.kwhCycle
                                : it.kwhPerCycle;
                            updateItem(it.id, { washerType: kk, kwhPerCycle: v });
                          }}
                        />
                      </div>
                    ) : null}

                    {/* ✅ Spülmaschine alt/neu */}
                    {it.key === "dishwasher" ? (
                      <div className="rounded-2xl border p-3 space-y-2">
                        <div className="text-sm font-semibold">Spülmaschine</div>
                        <PresetButtons
                          value={it.dishwasherType}
                          options={[
                            { key: "new", label: "Neu 😇", sub: "0,8 kWh/Gang" },
                            { key: "old", label: "Alt 😬", sub: "1,4 kWh/Gang" },
                            { key: "custom", label: "Eigener Wert ✍️", sub: "kWh/Gang" },
                          ]}
                          onPick={(k) => {
                            const kk = k as "new" | "old" | "custom";
                            const v =
                              kk === "new"
                                ? PRESETS.dishwasher.new.kwhCycle
                                : kk === "old"
                                ? PRESETS.dishwasher.old.kwhCycle
                                : it.kwhPerCycle;
                            updateItem(it.id, { dishwasherType: kk, kwhPerCycle: v });
                          }}
                        />
                      </div>
                    ) : null}

                    {d.type === "WATTS_HOURS" ? (
                      <div className="rounded-2xl border p-3 space-y-3">
                        <div className="text-sm font-semibold">Nutzung</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Stunden/Tag</span>
                            <Pill>{it.hoursPerDay} h</Pill>
                          </div>
                          <Slider
                            value={[it.hoursPerDay]}
                            onValueChange={(v) => updateItem(it.id, { hoursPerDay: clampNum(v?.[0], 0, 24) })}
                            max={24}
                            step={0.5}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Tage/Woche</span>
                            <Pill>{it.daysPerWeek}</Pill>
                          </div>
                          <Slider
                            value={[it.daysPerWeek]}
                            onValueChange={(v) => updateItem(it.id, { daysPerWeek: clampNum(v?.[0], 1, 7) })}
                            max={7}
                            step={1}
                          />
                        </div>
                        {advanced ? (
                          <div className="space-y-1">
                            <Label>Watt</Label>
                            <Input
                              inputMode="numeric"
                              value={it.watts}
                              onChange={(e) => updateItem(it.id, { watts: clampNum(e.target.value, 1, 200000) })}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {d.type === "WATTS_MINUTES" ? (
                      <div className="rounded-2xl border p-3 space-y-3">
                        <div className="text-sm font-semibold">Nutzung</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Min/Nutzung</span>
                            <Pill>{it.minutesPerUse} min</Pill>
                          </div>
                          <Slider
                            value={[it.minutesPerUse]}
                            onValueChange={(v) => updateItem(it.id, { minutesPerUse: clampNum(v?.[0], 0, 240) })}
                            max={240}
                            step={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Wie oft/Woche</span>
                            <Pill>{it.usesPerWeek}×</Pill>
                          </div>
                          <Slider
                            value={[it.usesPerWeek]}
                            onValueChange={(v) => updateItem(it.id, { usesPerWeek: clampNum(v?.[0], 0, 100) })}
                            max={100}
                            step={1}
                          />
                        </div>
                        {advanced ? (
                          <div className="space-y-1">
                            <Label>Watt</Label>
                            <Input
                              inputMode="numeric"
                              value={it.watts}
                              onChange={(e) => updateItem(it.id, { watts: clampNum(e.target.value, 1, 200000) })}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {d.type === "CYCLE_KWH" ? (
                      <div className="rounded-2xl border p-3 space-y-3">
                        <div className="text-sm font-semibold">Nutzung</div>
                        <div className="space-y-1">
                          <Label>kWh/Gang</Label>
                          <Input
                            inputMode="decimal"
                            value={it.kwhPerCycle}
                            onChange={(e) => updateItem(it.id, { kwhPerCycle: clampNum(e.target.value, 0.1, 20) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Gänge/Woche</span>
                            <Pill>{it.cyclesPerWeek}×</Pill>
                          </div>
                          <Slider
                            value={[it.cyclesPerWeek]}
                            onValueChange={(v) => updateItem(it.id, { cyclesPerWeek: clampNum(v?.[0], 0, 30) })}
                            max={30}
                            step={1}
                          />
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />

          <Tabs defaultValue="rest" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rest">Rest-Rechner</TabsTrigger>
              <TabsTrigger value="tip">Warum hilft das?</TabsTrigger>
            </TabsList>

            <TabsContent value="rest" className="mt-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Was müsste laufen, um den Rest zu füllen?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border p-3">
                    <div className="text-sm font-semibold">Wähle ein Gerät als „Füller“</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DEVICES.filter((d) => d.type !== "YEAR_KWH").map((d) => (
                        <Button
                          key={d.key}
                          variant={fillKey === d.key ? "default" : "outline"}
                          className="rounded-2xl"
                          onClick={() => setFillKey(d.key)}
                        >
                          {d.emoji} {d.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-muted p-4">
                    <div className="text-sm font-semibold">{fill.title}</div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                      {fill.lines.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <MiniCompareBox kwhMonth={remaining} title={`Mini-Vergleich (Rest: ${remaining.toFixed(1)} kWh)`} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tip" className="mt-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Warum diese Seite so gut ist</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <div className="rounded-2xl bg-muted p-4">
                    Du siehst, wie sich ein Monat zusammensetzt — und warum <span className="font-semibold text-foreground">Heizen</span>
                    (Dusche, Trockner, Herd/Ofen, Heizlüfter) viel mehr reinhaut als LEDs.
                  </div>
                  <div className="text-xs">Das ist absichtlich grob. Nerd-Schalter an für echte Werte.</div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );

  // -------- Tipps --------
  const tipsPage = (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Merksatz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="rounded-2xl bg-muted p-4">
            <div className="font-semibold text-foreground">LED & Handy = meistens Peanuts 🥜</div>
            <div>
              Teuer sind Dinge, die <span className="font-medium text-foreground">heizen</span>: Durchlauferhitzer, Trockner,
              Herd/Ofen, Heizlüfter.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kochen: erst hoch, dann runter?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="rounded-2xl bg-muted p-4">
            Hoch zum Aufheizen ✅ — danach runterdrehen ✅ — paar Minuten früher aus ✅ (wenn Nachwärme reicht).
          </div>
          <div className="text-xs">Dumm ist nur: kocht schon und bleibt auf MAX blubbern 🙃</div>
        </CardContent>
      </Card>
    </div>
  );

  const pageTitle =
    page === "rechner"
      ? "Seite 1/4: Rechner"
      : page === "duell"
      ? "Seite 2/4: Duell"
      : page === "monat"
      ? "Seite 3/4: Monat bauen"
      : "Seite 4/4: Tipps";

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Stromkosten für Dummies 😄</h1>
            <p className="mt-1 text-sm text-muted-foreground">{pageTitle}</p>
          </div>
          <Pill>Idiotensicher</Pill>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Button
            className="rounded-2xl justify-start"
            variant={page === "rechner" ? "default" : "outline"}
            onClick={() => setPage("rechner")}
          >
            <Calculator className="h-4 w-4 mr-2" /> Rechner
          </Button>
          <Button
            className="rounded-2xl justify-start"
            variant={page === "duell" ? "default" : "outline"}
            onClick={() => setPage("duell")}
          >
            <Swords className="h-4 w-4 mr-2" /> Duell
          </Button>
          <Button
            className="rounded-2xl justify-start"
            variant={page === "monat" ? "default" : "outline"}
            onClick={() => setPage("monat")}
          >
            <ListChecks className="h-4 w-4 mr-2" /> Monat bauen
          </Button>
          <Button
            className="rounded-2xl justify-start"
            variant={page === "tipps" ? "default" : "outline"}
            onClick={() => setPage("tipps")}
          >
            <Lightbulb className="h-4 w-4 mr-2" /> Tipps
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-4">{priceBox}</div>
          <div className="lg:col-span-3 space-y-6">
            {page === "rechner" ? rechnerPage : null}
            {page === "duell" ? duelPage : null}
            {page === "monat" ? monthPage : null}
            {page === "tipps" ? tipsPage : null}
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">© Mini-App — extra simpel 🙂</div>
      </div>
    </div>
  );
}
