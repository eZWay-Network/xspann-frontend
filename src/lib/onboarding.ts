const ARTIST_CHOICE_KEY = "xpn-offer-artist-setup";

export function rememberArtistSetupChoice() {
  if (typeof window !== "undefined") window.localStorage.setItem(ARTIST_CHOICE_KEY, "1");
}

export function shouldOfferArtistSetup() {
  return typeof window !== "undefined" && window.localStorage.getItem(ARTIST_CHOICE_KEY) === "1";
}

export function clearArtistSetupChoice() {
  if (typeof window !== "undefined") window.localStorage.removeItem(ARTIST_CHOICE_KEY);
}
