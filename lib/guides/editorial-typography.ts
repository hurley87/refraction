/**
 * Editorial typography blocks map to global classes in `app/globals.css`.
 * Headings (h1–h4) use semantic elements; other styles use utility classes.
 * Display styles use `-sm` variants so copy fits the ~361px editorial column.
 */
export const editorialTypographyStyleSchemaValues = [
  'h1',
  'h2',
  'h3',
  'h4',
  'title1',
  'title2',
  'title3',
  'title4',
  'title5',
  'display0',
  'display1',
  'display2',
  'labelSmall',
  'labelMedium',
  'labelLarge',
  'bodySmall',
  'bodyMedium',
  'bodyLarge',
] as const;

export type EditorialTypographyStyle =
  (typeof editorialTypographyStyleSchemaValues)[number];

export const EDITORIAL_TYPOGRAPHY_GROUPS: ReadonlyArray<{
  label: string;
  styles: readonly EditorialTypographyStyle[];
}> = [
  { label: 'Headings', styles: ['h1', 'h2', 'h3', 'h4'] },
  {
    label: 'Title',
    styles: ['title1', 'title2', 'title3', 'title4', 'title5'],
  },
  { label: 'Display', styles: ['display0', 'display1', 'display2'] },
  { label: 'Label', styles: ['labelSmall', 'labelMedium', 'labelLarge'] },
  { label: 'Body', styles: ['bodySmall', 'bodyMedium', 'bodyLarge'] },
];

export const editorialTypographyStyleLabels: Record<
  EditorialTypographyStyle,
  string
> = {
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  title1: 'Title 1',
  title2: 'Title 2',
  title3: 'Title 3',
  title4: 'Title 4',
  title5: 'Title 5',
  display0: 'Display 0',
  display1: 'Display 1',
  display2: 'Display 2',
  labelSmall: 'Label Small',
  labelMedium: 'Label Medium',
  labelLarge: 'Label Large',
  bodySmall: 'Body Small',
  bodyMedium: 'Body Medium',
  bodyLarge: 'Body Large',
};

export function editorialTypographyClassName(
  style: EditorialTypographyStyle
): string {
  switch (style) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      return '';
    case 'title1':
      return 'title1';
    case 'title2':
      return 'title2';
    case 'title3':
      return 'title3';
    case 'title4':
      return 'title4';
    case 'title5':
      return 'title5';
    case 'display0':
      return 'display0-sm';
    case 'display1':
      return 'display1-sm';
    case 'display2':
      return 'display2-sm';
    case 'labelSmall':
      return 'label-small';
    case 'labelMedium':
      return 'label-medium';
    case 'labelLarge':
      return 'label-large';
    case 'bodySmall':
      return 'body-small';
    case 'bodyMedium':
      return 'body-medium';
    case 'bodyLarge':
      return 'body-large';
  }
}

export function editorialTypographyElement(
  style: EditorialTypographyStyle
): 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' {
  switch (style) {
    case 'h1':
      return 'h1';
    case 'h2':
      return 'h2';
    case 'h3':
      return 'h3';
    case 'h4':
      return 'h4';
    case 'bodySmall':
    case 'bodyMedium':
    case 'bodyLarge':
      return 'p';
    default:
      return 'div';
  }
}

export const EDITORIAL_TYPOGRAPHY_ADD_PREFIX = 'typography:' as const;

export function editorialTypographyAddValue(
  style: EditorialTypographyStyle
): string {
  return `${EDITORIAL_TYPOGRAPHY_ADD_PREFIX}${style}`;
}

export function parseEditorialTypographyAddValue(
  value: string
): EditorialTypographyStyle | null {
  if (!value.startsWith(EDITORIAL_TYPOGRAPHY_ADD_PREFIX)) {
    return null;
  }
  const style = value.slice(EDITORIAL_TYPOGRAPHY_ADD_PREFIX.length);
  if (
    !(editorialTypographyStyleSchemaValues as readonly string[]).includes(style)
  ) {
    return null;
  }
  return style as EditorialTypographyStyle;
}
