/** Envelope returned by every data module. */
export interface Envelope<T> {
  data: T;
  source: string;
  sourceUrl: string;
  /** ISO timestamp of when the data was fetched (or when the fallback snapshot was taken). */
  fetchedAt: string;
  isFallback: boolean;
}

export interface RegionReading {
  sst: number;
  anom: number;
}

/** One row of the CPC weekly SST file (wksst9120.for). */
export interface WeeklySstRow {
  /** ISO date of the week's center day. */
  date: string;
  nino12: RegionReading;
  nino3: RegionReading;
  nino34: RegionReading;
  nino4: RegionReading;
}

/**
 * One seasonal row of the RONI history table (CPC's Relative Oceanic Niño
 * Index): the ONI calculation minus the mean tropical-belt SST anomaly, so it
 * isolates the Pacific's excess warmth rather than absolute warming.
 */
export interface RoniRow {
  /** Three-month season code, e.g. "AMJ". */
  season: string;
  year: number;
  value: number;
}

/**
 * One row of the Australian Bureau of Meteorology's weekly relative Niño 3.4
 * index (rnino_3.4.txt): a different agency's own relative/anomaly-vs-tropics
 * calculation from NOAA's RONI, published weekly rather than seasonally, with
 * its own +0.8°C El Niño threshold — never mix with NOAA's ±0.5°C.
 */
export interface BomRninoRow {
  /** ISO date the week starts. */
  weekStart: string;
  /** ISO date the week ends — BOM's own convention labels readings by this date. */
  weekEnd: string;
  value: number;
}

export type EnsoPhase = 'el-nino' | 'la-nina' | 'neutral';
export type Intensity = 'neutral' | 'weak' | 'moderate' | 'strong' | 'very-strong';
export type Direction = 'strengthening' | 'steady' | 'weakening';

/** Derived headline status shown by the widget. */
export interface EnsoStatus {
  phase: EnsoPhase;
  /** CPC's ENSO Alert System status, e.g. "El Niño Advisory". */
  advisory: string;
  /** Latest weekly Niño 3.4 anomaly, °C. */
  nino34Anom: number;
  /** ISO date of the week center for that reading. */
  weekCentered: string;
  intensity: Intensity;
  direction: Direction;
}
