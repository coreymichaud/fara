# Beacon brand implementation

Ground truth: `references/brand/Beacon_Brand_Guidelines.pdf`, version 1.0, April 2026. All five pages were extracted; logo, palette, typography, and component pages were rendered and visually inspected.

| Token            | Specification                       |
| ---------------- | ----------------------------------- |
| Heading family   | Avenir Medium                       |
| Body family      | Avenir Roman                        |
| Technical family | Menlo                               |
| Heading 1        | 48px, Avenir Medium                 |
| Heading 2        | 32px, Avenir Medium                 |
| Heading 3        | 24px, Avenir Medium                 |
| Body             | 16px, Avenir Roman, line-height 1.5 |
| Secondary        | 14px, Avenir Roman                  |
| Primary 900      | `#1E343F`, headings and emphasis    |
| Primary 700      | `#385981`, interactive elements     |
| Primary 500      | `#6B8FA8`, supporting elements      |
| Accent orange    | `#F79122`, calls to action          |
| Light orange     | `#FDCB9C`, light accents            |
| Error            | `#C44A4A`                           |
| Success          | `#388D58`                           |
| Info             | `#4A7CD0`                           |

The guide illustrates a five-step neutral scale but does not print neutral hex codes. Application neutrals are documented implementation choices, not claimed brand hex values. Component examples use pill buttons, outlined secondary actions, rounded bordered inputs, and red/green/blue tinted alerts. The guide gives no numeric spacing scale; application spacing uses a consistent 4px base.

CSS uses local Avenir Medium and Avenir Roman faces and Menlo, then explicit system fallbacks. The PDF specifies the fonts but contains no separately supplied licensed webfont assets. No font has been extracted from the PDF or redistributed. To make Avenir identical on devices without it, supply licensed WOFF2 files and add their URLs to the existing font faces. Text remains legible without font downloads. Compact workspace labels use the specified 14px secondary style; full page headings follow the type scale, with responsive reductions on phones.

FARA (Food Access Resource Allocation) is a prototype, not an official DataKind release. Its name and expanded name are centralized in `src/config/product.ts`. The original build brief’s ReachLab working title is superseded by this name. It uses its own typographic product name. It does not recreate or distort the Beacon logo. The guide requires logo clear space at least equal to icon height; no stand-alone original Beacon logo asset was supplied, so none is fabricated.
