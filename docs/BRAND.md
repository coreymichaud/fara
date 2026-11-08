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

The homepage takes compositional cues from the [Billow reference](https://www.framer.com/community/gallery/billow/): confident typography, a clear primary action, and a carefully composed first screen. FARA keeps Avenir and Beacon’s type scale, blue controls, and orange actions. No reference assets, commercial claims, or imagery are copied. The landing page pairs a short introduction with a cartographic study-area graphic. It renders the existing local Census county boundaries as SVG and reads tract counts from the dataset manifest. The blue silhouette, orange type underline, and Menlo labels provide contrast without invented data or imagery. On phones the composition stacks within the initial screen. It can grow on unusually short screens or under zoom; content is never hidden by a page scroll lock.

The public pages and planner share a rounded white masthead, pale background, restrained borders, and pill actions. Paper (`#F5F8FB`), explorer background (`#EDF3F7`), and border (`#D9E2E8`) are application neutral choices. Ranked area rows, a generous map, and an inspector retain the atlas structure inside the planner. Orange marks the proposed event and primary planning actions. Menlo is reserved for measurements and technical identifiers.

The plain FARA wordmark sits beside its expanded name on one line and returns to the homepage at `/`. Resources, Methodology, and About are accessible from the main navigation and homepage footer. **Go to planner** opens `/planner`. Exact pages use `aria-current="page"`; saved-plan pages retain the planner section highlight without claiming that the link points to the current page. The masthead has no status badge or decorative external-link arrow. Its phone menu supports Escape and returns focus to its trigger.

The map legend, selected area, and event assumptions are placed below the canvas. **Show event overlay** controls the proposed marker and radius. Mobile **Areas / Map / Plan** controls switch the working view; they do not represent a required sequence. The footer provides U.S. Census and USDA ERS attribution with **Data & methods** and **About FARA** links. Full source details and limitations remain on the reference page, and map-provider attribution remains with the map.

About and Data & methods use open editorial layouts instead of a shared white document card. About separates the planning task, local checks, and project background. Data & methods provides an index, a two-signal diagram, visible source vintages and limitations, and keyboard-accessible native disclosure sections for full calculation and privacy details. Saved plans and community forms retain their document surfaces.

The desktop planner uses a compact masthead and a workspace sized to the viewport. Its area list and inspector scroll independently; the save action, map legend, and assumptions remain accessible. Shorter laptop screens use a smaller map height. Phones retain the existing Areas / Map / Plan views and allow scrolling to reach their controls.

Resources uses the same editorial heading, page width, spacing, and unboxed topic index as the other reference pages. It keeps a directory structure: publisher and service-area metadata sit beside each entry on desktop, then stack above the title and description on narrower screens. Thin rules separate entries and a stronger rule introduces each topic. Review dates, external-link indicators, and referral limits remain visible.
