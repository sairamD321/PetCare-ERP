import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Admin blue (#2f6fed at shade 6).
const brand: MantineColorsTuple = ['#eaf1ff', '#d4e2ff', '#a8c3fd', '#79a2fb', '#5287f9', '#3a76f7', '#2f6fed', '#2259d4', '#1a4fbe', '#0b43a8'];
// Storefront / sign-in orange (#f07c2f at shade 6, #d9671c at 7).
const orange: MantineColorsTuple = ['#fff4ea', '#fde6d3', '#f9cba6', '#f5ae76', '#f2954d', '#f18636', '#f07c2f', '#d9671c', '#c15a15', '#a84c0d'];
// Ink / navy used for dark buttons and the sidebar brand.
const navy: MantineColorsTuple = ['#eef0f7', '#d9dcea', '#b0b6d1', '#848db8', '#5f6aa2', '#485495', '#3c4890', '#2e3a7d', '#232c4f', '#1b2340'];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: { brand, orange, navy },
  fontFamily: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
  headings: { fontFamily: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif", fontWeight: '700' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg', padding: 'lg' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Modal: { defaultProps: { centered: true, radius: 'lg' } },
    Table: { defaultProps: { verticalSpacing: 'sm', highlightOnHover: true } },
  },
});

// Accent used by the customer storefront and the sign-in screens.
export const STORE_ACCENT = 'orange';
