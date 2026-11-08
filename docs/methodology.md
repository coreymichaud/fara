# Planning methodology

The application’s [Methodology page](../src/app/methodology/page.tsx) is the public method reference; [planner.ts](../src/lib/domain/planner.ts) is the pure implementation.

For each complete, positive-population/household tract, min–max normalize poverty and the share of residents over one straight-line mile from a SNAP retailer, across all four counties. A constant feature contributes 0.5. Priority = 100 × [w × normalized poverty + (1−w) × normalized retail distance], default w=0.5. Values are relative index points, not probabilities. SNAP participation is never scored. Missing values are neither zero nor imputed.

For each candidate tract interior point, include comparable tract representative points at Haversine distance ≤ the user’s radius (Earth radius 3,958.7613 miles). Sum whole-tract 2020 occupied housing units H. Compute their household-weighted mean priority P. Planning value = min(capacity,H) × P / 100. This is an abstract objective in index units, not expected households served. A representative-point household pool is a coarse tract proxy, not a population-within-circle estimate. The display catchment is a geographic circle approximation; inclusion uses Haversine.

A single-event greedy choice maximizes this value; ties break by GEOID. Dismissed/flagged candidate sites leave recommendations, but their residents remain in catchment calculations. Shortlist order represents operator judgment. No service-network overlap penalty is possible without validated baseline pantry data. Event cost/budget only reports feasibility for the entered amounts. A plan above budget may be saved for discussion, visibly marked; it is not approved for operation. Day/time do not modify any impact calculation.

Compare the current manual point with at most two candidate points under identical scope, radius, capacity, and weights. The sensitivity panel shows top-ranked candidates at 1, 2.5 and 5 miles, and 25/75 vs 75/25 indicator weights. Changes reveal model sensitivity, not statistical confidence or causal uplift.

The operator should verify a venue, local services, physical accessibility, safety, permits, demand and capacity before implementation. Anonymous feedback questions test perceived feasibility, not representativeness or guaranteed attendance. Whole-question cell suppression protects small counts but is not formal differential privacy.
