function normalizedSearchValue(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase();
}

export function airportSearchValues(candidate) {
  return [
    candidate?.code,
    ...Object.values(candidate?.name ?? {}),
    ...Object.values(candidate?.gateway?.label ?? {})
  ].map(normalizedSearchValue).filter(Boolean);
}

export function filterAirports(airports, query) {
  const needle = normalizedSearchValue(query);
  if (!needle) return [...airports];
  return airports.filter((candidate) => (
    airportSearchValues(candidate).some((value) => value.includes(needle))
  ));
}
