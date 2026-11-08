# FARA: five-slide PowerPoint narrative

Use **FARA — Food Access Resource Allocation** as the project name on the title slide.

Create the presentation from this outline; no `.pptx` or YouTube upload is claimed. Use the exact Beacon typography/palette in `BRAND.md`, real screenshots in `screenshots/`, and clear “independent prototype” attribution. Never include creator tokens, fake survey results, estimated recipients, or a fabricated cloud URL.

## 1. A pattern needs a practical next step

**Title:** From food-access signals to a plan people can question.

Food banks and pantry operators need to choose a plausible location, make assumptions explicit, and find out whether it works locally. A map alone cannot validate a venue or reveal an unlisted pantry. Show the actual workspace screenshot, with no invented impact statistic.

## 2. Evidence you can inspect

**Title:** Four counties. Transparent public indicators.

490 joined tracts: Lake, Orange, Osceola, Seminole. 488 eligible for the current scoring rule. Poverty and straight-line retailer distance form an editable relative index; SNAP participation is context. Show source vintages, actual missingness, a margin of error, and the data version. Explain that raw inputs remain local and only minimized permitted assets are bundled.

## 3. Explore → Plan → Compare → Challenge

**Title:** One event, explicit assumptions, human judgment.

Demonstrate radius, household-slot capacity, day/time and optional operator-entered cost. Compare two sites under the same assumptions. Reject a candidate with a predefined reason. State “Potential proximity, not attendance or causal impact.” Show the unknown current pantry network rather than a false before/after KPI.

## 4. Share a decision brief; ask the community

**Title:** Close the loop with a community check.

Persistent public read-only snapshot, separate creator secret, anonymous fixed-choice survey, protected aggregate counts with small-cell suppression. If showing n, capture a real test response and label it as a demonstration response, not representative evidence. Show the mobile public plan without names/contact details.

## 5. Built to test, ready for field validation

**Title:** A defensible prototype, with clear next steps.

Diagram: local uv/Pandas/DuckDB pipeline → minimized static assets → one Next.js Cloud Run container; Firestore holds plans and surveys. Use actual test/coverage results from `VERIFICATION.md`. State the cloud deployment status honestly. Next: validate venues and existing services, update source vintages, conduct community testing, and review privacy/abuse controls. AI assisted development; there is no AI feature at runtime.

Suggested team handoff: one teammate drives the live product; another explains data/method caveats; the nontechnical teammate assembles slides, records the demo and checks the narrative against `demo_script.md`. These are suggested roles, not claims about work already performed by teammates.
