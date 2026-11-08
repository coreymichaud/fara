# FARA: five-slide PowerPoint narrative

Use **FARA — Food Access Resource Allocation** as the project name on the title slide.

Use the Beacon typography and palette in `BRAND.md`, application screenshots in `screenshots/`, and “independent prototype” attribution. Keep private creator links out of the slides. This outline is the source for the presentation; the PowerPoint and video still need to be produced.

## 1. A pattern needs a practical next step

**Title:** From food-access signals to a plan people can question.

Food banks and pantry operators need to choose a plausible location, make assumptions explicit, and find out whether it works locally. A map alone cannot validate a venue or reveal an unlisted pantry. Show the **Pantry planner** workspace screenshot and describe the planning task. Use the map, ranked **Suggested areas**, and the selected-area inspector to orient the audience.

## 2. Evidence you can inspect

**Title:** Four counties. Transparent public indicators.

490 joined tracts: Lake, Orange, Osceola, Seminole. 488 eligible for the current scoring rule. Poverty and straight-line retailer distance form an editable relative index; SNAP participation is context. Show source vintages, missing values, a margin of error, and the data version. Explain that raw inputs remain local and only minimized permitted assets are bundled.

## 3. Area details, event settings, and location comparison

**Title:** One event, explicit assumptions, human judgment.

Use **Area details** to inspect a suggested area, **Event settings** to set radius, household-slot capacity, day/time, and optional operator-entered cost, and **Compare locations** to compare two sites under the same assumptions. Flag a location with a predefined reason. State “Potential proximity, not attendance or causal impact.” **Show event overlay** controls the proposal only; existing pantry service coverage is unknown.

## 4. Share a decision brief; ask the community

**Title:** Ask the community about the proposal.

Persistent public read-only snapshot, separate creator secret, anonymous fixed-choice survey, protected aggregate counts with small-cell suppression. If showing n, capture a real test response and label it as a demonstration response, not representative evidence. Show the mobile public plan without names/contact details.

## 5. Built to test, ready for field validation

**Title:** A defensible prototype, with clear next steps.

Diagram: local uv/Pandas/DuckDB pipeline → minimized static assets → one Next.js Cloud Run container; Firestore holds plans and surveys. Use the test and coverage results from `VERIFICATION.md` and include the deployment status. Next: validate venues and existing services, update source vintages, conduct community testing, and review privacy/abuse controls. AI assisted development; there is no AI feature at runtime.

Suggested presentation roles: one person drives the product, another explains the data and methods, and a third prepares slides and records the demo using `demo_script.md`.
