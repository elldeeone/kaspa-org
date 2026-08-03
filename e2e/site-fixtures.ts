export const mockedAiAnswerBody =
  "Kaspa is a proof-of-work cryptocurrency built on a blockDAG.";
export const mockedAiAnswer = `${mockedAiAnswerBody}

### Sources
- [Kaspa docs](https://docs.kaspa.org)
- [Kaspa wiki](https://wiki.kaspa.org)`;
export const genericAiError = "Sorry, something went wrong. Please try again.";
export const loreHeading = /kaspa is a live proof-of-work blockdag/i;
export const publicLlmsHrefPattern = /chatgpt\.com\/\?q=.*llms\.txt/i;

export const mockedAiResponse = JSON.stringify({
  answer: mockedAiAnswer,
  queryId: 1234,
  cacheInfo: null,
  cacheKey: null,
});

export const routeHeadings = [
  { path: "/", heading: /real-time\s+decentralization/i },
  { path: "/lore", heading: loreHeading },
  { path: "/hodl", heading: /odl kaspa/i },
  { path: "/build", heading: /build on kaspa/i },
  { path: "/assets", heading: /kaspa logo assets/i },
] as const;
