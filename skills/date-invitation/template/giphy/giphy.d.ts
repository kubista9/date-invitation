// Types for the GIPHY helpers (the code is plain JS; editors pick these up for completion and checking).

/** One rendition inside a GIPHY GIF object. Values are strings in the real API. */
export interface GiphyRendition {
  url?: string;
  mp4?: string;
  webp?: string;
  width?: string;
  height?: string;
  size?: string;
}

/** GIF object, only the fields we read. */
export interface GiphyGifObject {
  id: string;
  title?: string;
  alt_text?: string;
  username?: string;
  url?: string; // the giphy.com page for this GIF
  rating?: string;
  images: Partial<Record<string, GiphyRendition>>; // e.g. original, fixed_width, fixed_width_small, downsized
}

export interface GiphyMeta { status: number; msg: string; response_id?: string }
export interface GiphySearchResponse { data: GiphyGifObject[]; meta: GiphyMeta; pagination?: { total_count: number; count: number; offset: number } }
/** `data` is an empty array/object when the GIF was removed or its rating is above the ceiling. */
export interface GiphyByIdResponse { data: GiphyGifObject | Record<string, never> | []; meta: GiphyMeta }

/** What we save per GIF. Never contains a media URL. */
export interface GiphySelection {
  id: string;
  title: string;
  alt: string;
  username: string;
  sourceUrl: string; // giphy.com page, may be ""
  rendition: string; // e.g. "original"
  selectedAt: string; // ISO timestamp
}

export type GiphyErrorKind = "config" | "rate" | "notfound" | "network" | "http" | "query";
export declare class GiphyError extends Error { kind: GiphyErrorKind; status?: number }

export interface GiphyPickerOptions {
  selection?: GiphySelection | null;
  onSelect?: (s: GiphySelection) => void;
  onRemove?: () => void;
  title?: string;
}
export interface GiphyPickerElement extends HTMLElement {
  setSelection(s: GiphySelection | null): void;
  getSelection(): GiphySelection | null;
}
export interface GiphyGifElement extends HTMLElement { load(): Promise<void> }

declare global {
  interface Window {
    GIPHY_API_KEY?: string;
    Giphy: {
      RENDITION: string;
      ID_RE: RegExp;
      hasKey(): boolean;
      clean(s: unknown, max: number): string;
      cleanSource(u: unknown): string;
      /** GIF ID from a GIPHY page, embed or media link, or "" if the link is not a GIPHY GIF. */
      idFromLink(link: string): string;
      searchGifs(query: string, signal?: AbortSignal): Promise<GiphyGifObject[]>;
      getGif(id: string, signal?: AbortSignal): Promise<GiphyGifObject>;
      toSelection(g: GiphyGifObject): GiphySelection;
      normalizeSelection(s: unknown): GiphySelection | null;
      GiphyPicker(o?: GiphyPickerOptions): GiphyPickerElement;
      GiphyGif(s: GiphySelection): GiphyGifElement;
      GiphyAttribution(o?: { username?: string; sourceUrl?: string }): HTMLElement;
      GiphyFallback(): HTMLElement;
    };
  }
}
