"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

export type NetworkCountry = {
  countryCode: string | null;
  countryName: string;
  count: number;
};

type ActiveCountry = {
  countryCode: string | null;
  countryName: string;
  count: number;
  sharePercent: number;
};

const GEOGRAPHY_URL = "/maps/mercatura-countries.json";

function interpolateChannel(start: number, end: number, amount: number): number {
  return Math.round(start + (end - start) * amount);
}

function countryFill(count: number, maximumCount: number): string {
  if (count <= 0 || maximumCount <= 0) {
    return "#171815";
  }

  const ratio = Math.min(1, count / maximumCount);
  const strength = 0.18 + ratio * 0.82;

  const start = [23, 24, 21];
  const end = [183, 132, 42];

  const red = interpolateChannel(start[0], end[0], strength);
  const green = interpolateChannel(start[1], end[1], strength);
  const blue = interpolateChannel(start[2], end[2], strength);

  return `rgb(${red} ${green} ${blue})`;
}

function formatNodeCount(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "node" : "nodes"}`;
}

export function NetworkCountryMap({
  countries,
  locatedAddressCount,
  variant = "full",
}: {
  countries: NetworkCountry[];
  locatedAddressCount: number;
  variant?: "full" | "compact";
}) {
  const [activeCountry, setActiveCountry] = useState<ActiveCountry | null>(null);

  const countriesByCode = useMemo(
    () =>
      new Map(
        countries
          .filter(
            (country): country is NetworkCountry & { countryCode: string } =>
              country.countryCode !== null
          )
          .map((country) => [country.countryCode.toUpperCase(), country])
      ),
    [countries]
  );

  const maximumCount = useMemo(
    () => Math.max(0, ...countries.map((country) => country.count)),
    [countries]
  );

  const observedTotal =
    locatedAddressCount > 0
      ? locatedAddressCount
      : countries.reduce((total, country) => total + country.count, 0);

  return (
    <div
      className={`mercatura-country-map relative overflow-hidden bg-[#050605] ${
        variant === "compact" ? "h-[215px]" : "h-[390px] rounded-[8px] border border-[#292a24]"
      }`}
      aria-label="Mercatura observed network distribution by country"
    >
      <ComposableMap
        projection="geoEqualEarth"
        width={1000}
        height={430}
        projectionConfig={{
          center: [0, 7],
          scale: 162,
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <Geographies geography={GEOGRAPHY_URL}>
          {({ geographies }) =>
            geographies.map((geography) => {
              const properties = geography.properties as Record<string, unknown>;

              const rawCode = properties.iso_a2;
              const rawName = properties.name;

              const countryCode = typeof rawCode === "string" ? rawCode.toUpperCase() : "";

              const countryName =
                typeof rawName === "string" && rawName.length > 0
                  ? rawName
                  : countryCode || "Unknown";

              const observed = countriesByCode.get(countryCode);
              const count = observed?.count ?? 0;

              const selected: ActiveCountry = {
                countryCode: countryCode || null,
                countryName: observed?.countryName ?? countryName,
                count,
                sharePercent: observedTotal === 0 ? 0 : (count * 100) / observedTotal,
              };

              const fill = countryFill(count, maximumCount);

              return (
                <Geography
                  key={geography.rsmKey}
                  geography={geography}
                  tabIndex={0}
                  aria-label={`${selected.countryName}: ${formatNodeCount(count)}`}
                  onMouseEnter={() => setActiveCountry(selected)}
                  onMouseLeave={() => setActiveCountry(null)}
                  onFocus={() => setActiveCountry(selected)}
                  onBlur={() => setActiveCountry(null)}
                  onClick={() => setActiveCountry(selected)}
                  style={{
                    fill:
                      activeCountry?.countryCode === selected.countryCode
                        ? count > 0
                          ? "#d8a33a"
                          : "#252620"
                        : fill,
                    stroke:
                      activeCountry?.countryCode === selected.countryCode ? "#ad8130" : "#4f3b18",
                    strokeWidth: activeCountry?.countryCode === selected.countryCode ? 0.7 : 0.42,
                    outline: "none",
                    cursor: "pointer",
                    transition: "fill 120ms ease, stroke 120ms ease, stroke-width 120ms ease",
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {activeCountry !== null ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-[#5b451f] bg-[#080908]/95 px-3 py-2">
          <p className="text-xs font-medium text-[#e0aa40]">{activeCountry.countryName}</p>

          <p className="mt-0.5 text-[10px] text-[#a4a49f]">
            {formatNodeCount(activeCountry.count)} · {activeCountry.sharePercent.toFixed(1)}% of
            observed network
          </p>
        </div>
      ) : variant === "full" ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-[#3c321f] bg-[#080908]/88 px-3 py-2 text-[10px] text-[#777975]">
          {formatNodeCount(observedTotal)} geolocated across the observed network
        </div>
      ) : null}
    </div>
  );
}
