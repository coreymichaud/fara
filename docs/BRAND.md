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

FARA (Food Access Resource Allocation) is an independent planning tool. Its name and expansion are centralized in `src/config/product.ts` and displayed as a typographic wordmark. The guide requires logo clear space at least equal to icon height. No standalone Beacon logo asset was supplied, so the application uses only the FARA name.

## Public pages and planner

The homepage takes compositional cues from the [Billow reference](https://www.framer.com/community/gallery/billow/): a centered introduction, generous space, a clear primary action, and a large framed preview. FARA keeps Avenir and Beacon’s type scale, blue controls, and orange actions. No reference assets, commercial claims, or imagery are copied. The study preview renders the existing local Census county boundaries as SVG and reads counts from the dataset manifest; it contains no pretend controls or fabricated metrics.

The public pages and planner share a rounded white masthead, pale background, restrained borders, and pill actions. Paper (`#F5F8FB`), explorer background (`#EDF3F7`), and border (`#D9E2E8`) are application neutral choices. Ranked area rows, a generous map, and an inspector retain the atlas structure inside the planner. Orange marks the proposed event and primary planning actions. Menlo is reserved for measurements and technical identifiers.

The plain FARA wordmark sits beside its expanded name and returns to the homepage at `/`. Resources, Methodology, and About are accessible from the main navigation and homepage content. **Go to planner** opens `/planner`. Exact pages use `aria-current="page"`; saved-plan pages retain the planner section highlight without claiming that the link points to the current page. The masthead has no status badge or decorative external-link arrow. Its phone menu supports Escape and returns focus to its trigger.

The map legend, selected area, and event assumptions are placed below the canvas. **Show event overlay** controls the proposed marker and radius. Mobile **Areas / Map / Plan** controls switch the working view; they do not represent a required sequence. The footer provides U.S. Census and USDA ERS attribution with **Data & methods** and **About FARA** links. Full source details and limitations remain on the reference page, and map-provider attribution remains with the map.
