"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// All countries present in the GA4 obfuscated sample dataset
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Bolivia", "Brazil", "Bulgaria", "Cambodia",
  "Canada", "Chile", "China", "Colombia", "Croatia", "Czech Republic",
  "Denmark", "Ecuador", "Egypt", "Ethiopia", "Finland", "France", "Germany",
  "Ghana", "Greece", "Hungary", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kuwait", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland",
  "Portugal", "Romania", "Russia", "Saudi Arabia", "Serbia", "Singapore",
  "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain",
  "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Venezuela", "Vietnam",
];

const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"] as const;
type Region = (typeof REGIONS)[number];

const SOURCES = ["organic", "cpc", "referral", "email", "social", "direct", "(none)"];

const DEVICES = ["desktop", "mobile", "tablet"] as const;
type Device = (typeof DEVICES)[number];

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryRef = useRef<HTMLDivElement>(null);

  // Close country dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────
  const getParam = (key: string) => params.get(key) ?? "";
  const getArrayParam = (key: string): string[] => {
    const val = params.get(key);
    return val ? val.split(",").filter(Boolean) : [];
  };

  const pushParams = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
          next.delete(k);
        } else if (Array.isArray(v)) {
          next.set(k, v.join(","));
        } else {
          next.set(k, v);
        }
      });
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [params, pathname, router]
  );

  // ── Current filter values ───────────────────────────────────────
  const startDate = getParam("startDate") || "2020-11-01";
  const endDate = getParam("endDate") || "2021-01-31";
  const selectedCountries = getArrayParam("country");
  const selectedRegions = getArrayParam("region");
  const selectedSources = getArrayParam("source");
  const selectedDevice = getParam("device") as Device | "";

  // ── Toggle helpers ──────────────────────────────────────────────
  const toggleCountry = (c: string) => {
    const next = selectedCountries.includes(c)
      ? selectedCountries.filter((x) => x !== c)
      : [...selectedCountries, c];
    pushParams({ country: next });
  };

  const toggleRegion = (r: Region) => {
    const next = selectedRegions.includes(r)
      ? selectedRegions.filter((x) => x !== r)
      : [...selectedRegions, r];
    pushParams({ region: next });
  };

  const toggleSource = (s: string) => {
    const next = selectedSources.includes(s)
      ? selectedSources.filter((x) => x !== s)
      : [...selectedSources, s];
    pushParams({ source: next });
  };

  const toggleDevice = (d: Device) => {
    pushParams({ device: selectedDevice === d ? null : d });
  };

  const reset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasFilters =
    params.has("startDate") ||
    params.has("endDate") ||
    params.has("country") ||
    params.has("region") ||
    params.has("source") ||
    params.has("device");

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="filter-bar" aria-label="Dashboard filters">
      {/* Date range */}
      <fieldset className="flex flex-col gap-1 border-0 p-0">
        <legend className="filter-label">Date range</legend>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="filter-input"
            value={startDate}
            min="2020-11-01"
            max={endDate}
            onChange={(e) => pushParams({ startDate: e.target.value })}
          />
          <span className="text-[#9D9690] text-xs">→</span>
          <input
            type="date"
            className="filter-input"
            value={endDate}
            min={startDate}
            max="2021-01-31"
            onChange={(e) => pushParams({ endDate: e.target.value })}
          />
        </div>
      </fieldset>

      {/* Country — custom searchable dropdown */}
      <fieldset className="flex flex-col gap-1 border-0 p-0">
        <legend className="filter-label">Country</legend>
        <div ref={countryRef} className="relative">
          <button
            type="button"
            onClick={() => setCountryOpen((o) => !o)}
            className="filter-input flex items-center justify-between gap-3 min-w-[160px] cursor-pointer select-none"
          >
            <span className="truncate">
              {selectedCountries.length > 0
                ? `${selectedCountries.length} selected`
                : "All countries"}
            </span>
            <span className="text-[#9D9690] text-[10px]">{countryOpen ? "▲" : "▼"}</span>
          </button>

          {countryOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-60 bg-[#161616] border border-[#2A2A2A] rounded-lg shadow-2xl">
              {/* Search */}
              <div className="p-2 border-b border-[#2A2A2A]">
                <input
                  type="text"
                  placeholder="Search countries…"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F0E8] placeholder-[#9D9690] outline-none focus:border-[#F59E0B]"
                  autoFocus
                />
              </div>

              {/* Country list */}
              <div className="max-h-60 overflow-y-auto py-1">
                {filteredCountries.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#9D9690]">No matches</p>
                ) : (
                  filteredCountries.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[#2A2A2A] text-xs text-[#F5F0E8]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(c)}
                        onChange={() => toggleCountry(c)}
                        className="accent-[#F59E0B] w-3 h-3 shrink-0"
                      />
                      {c}
                    </label>
                  ))
                )}
              </div>

              {/* Footer: clear */}
              {selectedCountries.length > 0 && (
                <div className="px-3 py-2 border-t border-[#2A2A2A]">
                  <button
                    type="button"
                    onClick={() => pushParams({ country: null })}
                    className="text-[11px] text-[#9D9690] hover:text-[#F43F5E] transition-colors"
                  >
                    Clear all ({selectedCountries.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected country chips */}
        {selectedCountries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedCountries.map((c) => (
              <button
                key={c}
                onClick={() => toggleCountry(c)}
                className="chip active text-[10px] px-2 py-0.5"
              >
                {c} ×
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {/* Region chips */}
      <fieldset className="flex flex-col gap-1 border-0 p-0">
        <legend className="filter-label">Region</legend>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => toggleRegion(r)}
              className={`chip ${selectedRegions.includes(r) ? "active" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Traffic source chips */}
      <fieldset className="flex flex-col gap-1 border-0 p-0">
        <legend className="filter-label">Traffic source</legend>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => toggleSource(s)}
              className={`chip ${selectedSources.includes(s) ? "active" : ""}`}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Device chips */}
      <fieldset className="flex flex-col gap-1 border-0 p-0">
        <legend className="filter-label">Device</legend>
        <div className="flex gap-1.5">
          {DEVICES.map((d) => (
            <button
              key={d}
              onClick={() => toggleDevice(d)}
              className={`chip ${selectedDevice === d ? "active" : ""}`}
            >
              {d}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Reset + pending indicator */}
      <div className="flex items-end gap-3 ml-auto">
        {isPending && (
          <span className="text-[#9D9690] text-[0.65rem] font-mono animate-pulse">
            Loading…
          </span>
        )}
        {hasFilters && (
          <button
            onClick={reset}
            className="chip text-[0.65rem] border-[#F43F5E] text-[#F43F5E] hover:bg-[#F43F5E] hover:text-black"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
