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

The homepage takes compositional cues from the [Billow reference](https://www.framer.com/community/gallery/billow/): confident typography, a clear primary action, and a carefully composed first screen. FARA keeps Avenir and Beacon’s type scale, blue controls, and orange actions. No reference assets, commercial claims, or imagery are copied. The landing page pairs a short introduction with a cartographic study-area graphic in a tighter, 1320px composition. It renders the existing local Census county boundaries as SVG and reads tract counts from the dataset manifest. Four blue county tones, fine outer outlines, a slightly darker square grid, and an orange type underline provide contrast without invented data or imagery. Lake holes remain in the boundary fills without the heavy outlines that previously made them look like white marks. County labels are positioned for legibility. On phones the composition stacks within the initial screen. It can grow on unusually short screens or under zoom; content is never hidden by a page scroll lock.

The public pages and planner share a rounded white masthead, pale background, restrained borders, and pill actions. Paper (`#F5F8FB`), explorer background (`#EDF3F7`), and border (`#D9E2E8`) are application neutral choices. Ranked area rows, a generous map, and an inspector retain the atlas structure inside the planner. Orange marks the proposed event and primary planning actions. Menlo is reserved for measurements and technical identifiers.

The plain FARA wordmark sits beside its expanded name on one line and returns to the homepage at `/`. Resources, Methodology, and About are accessible from the main navigation and homepage footer. **Go to planner** opens `/planner`. Exact pages use `aria-current="page"`; saved-plan pages retain the planner section highlight without claiming that the link points to the current page. The masthead has no status badge or decorative external-link arrow. Its phone menu supports Escape and returns focus to its trigger.

The map legend, selected area, and event assumptions are placed below the canvas. **Show event overlay** controls the proposed marker and radius. Mobile **Areas / Map / Plan** controls switch the working view; they do not represent a required sequence. The footer pairs **© [current year] FARA** on the left with **Plan with your community.** on the same line, followed by **Resources**, **Data & Methods**, and **About FARA** links. On phones, the planner footer centers the copyright/community line and navigation with the same spacing as the home and reference pages. U.S. Census and USDA source attribution, full details, and limitations remain on the methods page; map-provider attribution remains with the map.

About, Resources, and Data & Methods use plain, title-only page headers: **About FARA**, **Resources**, and **Data & Methods**. They have no header descriptions, eyebrow copy, decorative rules, or colored banner. Ink headings and blue/warm section panels remain in the body, with shared section-heading styles. About keeps its local checks visible; Data & Methods retains its topic index, two-signal diagram, and source register. All information is shown directly, including the complete calculations, assumptions, dataset details, and privacy explanation; none is inside a disclosure or accordion. Saved plans and community forms retain their document surfaces.

Section-header descriptions use their available panel width rather than a narrow character limit. About's local checks form five aligned rows, with a short explanation beside each check and the model limitations below; they stack on phones without leaving an isolated tag.

The desktop planner uses a compact masthead and a workspace sized to the viewport. Its area list and inspector scroll independently; the inspector contains only Area details, Event settings, and Compare locations. **Save & Share** replaces the indicator metadata at the top right. It opens the sharing dialog after saving, leaving the working area at its full size. There is no bottom action bar, survey opt-out switch, or verification disclosure. The illustrative-data warning remains when using test data. The map legend and assumptions remain accessible. Shorter laptop screens use a smaller map height; phones retain Areas / Map / Plan views and a reachable header action.

Resources keeps its directory structure: publisher and service-area metadata sit beside each entry on desktop, then stack above the title and description on narrower screens. Numbered blue and warm topic headings break up the page, with a clear topic index and a warm referral reminder. External-link arrows stay beside the first title line. The review-date notice is omitted from the interface; its record remains in configuration and documentation. Source links and referral limits are unchanged.

Reference-page titles align with the page content and use the same responsive size across all three pages. The source register has padding on both sides of every cell. On screens wider than 700px, Resources and Data & Methods share a scroll-aware contents component: the current section has a blue background, orange border, and `aria-current="location"`; native anchors, keyboard navigation, and browser history remain intact. At 700px and below, all three reference pages show their content without a table of contents; the hidden navigation is also removed from keyboard navigation and the accessibility tree. Their footers center the copyright/community line and navigation links, matching the homepage.

The **Data & Methods** page title stays on one line. Footer navigation labels also stay on one line; complete links can move onto another row when needed on narrow screens.

The workspace heading reads **Pantry Planner**. Map hovers show the existing priority index as a percentage, such as **60% priority**, in a single line. Only the location text may truncate on a narrow viewport, keeping the percentage visible. The scoring calculation is unchanged.

The homepage atlas caption centers the four county names on one line, separated by dots. The tract count and boundary year are kept together on a second, unbroken line: **490 Census tracts · 2020 boundaries** for the observed dataset. The home eyebrow reads **Central Florida · Pantry Planning**.

Successful saves open a native modal with FARA's white surface, restrained border, and rounded corners. **Your Saved Plan** occupies the first full-width row and emphasizes **Copy Plan Link**. The optional-to-use **Community Survey** and **Your Private Dashboard** sections follow side by side on larger screens and stack on phones. The close button stays visible while scrolling. Each section has a selectable URL, an open action, and an independent copy confirmation. All three open actions use the same secondary button style and open in new tabs, with an accessible new-tab description and no window opener. The private-link reminder explains that anyone with the link can manage the plan. The X, Escape, or an outside click/tap closes the dialog. Inside clicks and drags that start inside leave it open. Focus stays inside while it is open, background scrolling is locked, and closing returns focus to the opener. Reopening retains the saved links; editing the proposal invalidates them for the next save.

All new plans have a survey link, while the creator's existing close/reopen controls remain intact. The organizer's public plan has no survey question or check-in section. The participant page remains a standalone survey without the site's masthead, menus, or footer navigation, with its unchanged four questions and privacy disclosure. Planning scores, budgets, operator notes, alternatives, and provenance stay on the detailed public plan.
