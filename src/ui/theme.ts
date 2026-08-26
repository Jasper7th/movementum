export const colors = {
  background: '#F5F7F2', surface: '#FFFFFF', surfaceMuted: '#E9EEE5',
  text: '#17211A', textMuted: '#647068', accent: '#2E7D55',
  accentSoft: '#DDF1E5', warm: '#E89A45', border: '#DDE3DA',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const layout = {
  pageHorizontal: 20,
  pageTop: 18,
  pageBottom: 32,
  sectionGap: 20,
  compactGap: 10,
} as const;

export const radii = { small: 12, medium: 18, large: 24 } as const;

export const cardPadding = { secondary: 14, primary: 24 } as const;

export const controlHeights = { compact: 40, standard: 44, primary: 54 } as const;

export const typography = {
  pageEyebrow: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1.1 },
  pageTitle: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
  sectionTitle: { fontSize: 19, fontWeight: '800' as const },
  cardTitle: { fontSize: 15, fontWeight: '800' as const },
  body: { fontSize: 14, lineHeight: 20 },
  helper: { fontSize: 12, lineHeight: 17 },
  count: { fontSize: 11, fontWeight: '700' as const },
} as const;
