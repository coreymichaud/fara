import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { product } from '@/config/product';
import { Footer } from '@/components/footer';
import { loadDataset } from '@/lib/data/load';
export const metadata: Metadata = {
  title: `Data & methods | ${product.name}`,
  description:
    'Sources, calculations, uncertainty, and privacy practices behind the Central Florida pantry planning map.',
};
export default async function Methodology() {
  const { manifest } = await loadDataset();
  return (
    <>
      <main id="main" className="reading-page">
        <div className="eyebrow">Planning reference</div>
        <h1>Data & methods</h1>
        <p className="page-lead">
          Sources, calculations, and limitations behind the Central Florida planning map.
        </p>
        <section>
          <h2>Start with the geography</h2>
          <p>
            The supplied Census extracts identify Lake, Orange, Osceola, and Seminole counties. We
            join all {manifest.areaCount} tracts by 11-digit Census GEOID to 2020 Census
            cartographic boundaries. Points are interior representative points, computed in an
            equal-area projection, not venues or population centers. Boundaries are simplified for
            display only.
          </p>
        </section>
        <section>
          <h2>Two signals, one relative index</h2>
          <p>
            Poverty is the percentage of people with determined poverty status below their poverty
            threshold (ACS 2020–2024). Retail distance is the percentage of 2020 residents estimated
            to live more than one straight-line mile from a 2025 SNAP-authorized retailer (USDA
            SRAM). Both increase relative planning priority. Retailers include more than
            supermarkets, so this does not measure nutrition quality or grocery access alone.
          </p>
          <p>
            Each variable uses min–max normalization across all comparable tracts in the four-county
            study area. The priority index is 100 × [poverty weight × normalized poverty +
            retail-distance weight × normalized distance]. Weights sum to 100%; the default is
            50/50. A constant variable contributes 0.5. Missing values remain missing; tracts with
            either missing signal, zero population, or zero occupied households are excluded from
            ranking. Filtering a county does not change normalization.
          </p>
          <p>
            SNAP participation is displayed as context and is never inverted into an eligibility or
            unmet-need claim. Margins of error are shown for poverty but are not propagated into a
            statistical confidence estimate. This is a relative index, not an absolute food
            insecurity probability.
          </p>
        </section>
        <section>
          <h2>A single-event greedy ranking</h2>
          <p>
            Each eligible tract representative point is a candidate. We include other tract points
            within the entered Haversine radius. The planning value equals min(event household
            capacity, sum of whole-tract occupied households) × the household-weighted mean priority
            ÷ 100. These are abstract index units. We sort descending, then by GEOID for
            deterministic ties. Dismissed or flagged candidates leave the recommendation list, while
            their residents remain in scenario calculations.
          </p>
          <p>
            This is one greedy site choice, not route optimization. No baseline service sites are
            known, so no overlap penalty or incremental uplift is calculated. Operator-entered costs
            determine event budget feasibility but do not imply an optimized spending allocation.
            Hours do not change modeled attendance.
          </p>
        </section>
        <section>
          <h2>Read the catchment carefully</h2>
          <p>
            A tract’s representative point falling within a circle does not mean all residents live
            within it. The displayed household total is the entire 2020 occupied-housing-unit count
            of included tracts. We do not spatially allocate people, predict attendance, equate
            household slots with people, model transit, or infer causation. Compare the candidate
            ranks at alternative radii and weights to understand model sensitivity.
          </p>
        </section>
        <section>
          <h2>Source register</h2>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Use & vintage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href="https://www.census.gov/programs-surveys/acs">Census ACS S1701 / S2201</a>
                </td>
                <td>2020–2024 poverty, MOE, SNAP context, and study-area discovery</td>
              </tr>
              <tr>
                <td>
                  <a href="https://www.ers.usda.gov/data-products/food-access-research-atlas/download-the-data">
                    USDA ERS, Food Access Research Atlas / SRAM
                  </a>
                </td>
                <td>
                  2025 straight-line retailer access; 2020 population and occupied households.
                  Release July 2026
                </td>
              </tr>
              <tr>
                <td>
                  <a href="https://www.fna.usda.gov/snap/retailer-locator">SNAP retailer locator</a>
                </td>
                <td>
                  Supplied public location snapshot; capture date unknown. {manifest.retailerCount}{' '}
                  points; one known inconsistent-coordinate record excluded
                </td>
              </tr>
              <tr>
                <td>
                  <a href="https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_12_tract_500k.zip">
                    Census 2020 cartographic boundaries
                  </a>
                </td>
                <td>
                  Florida tracts, 1:500,000. NAD83 transformed to EPSG:5070 for 60m simplification
                  and back to WGS84
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Version <code>{manifest.datasetVersion}</code>; schema {manifest.schemaVersion};
            generated {manifest.generatedAt}. Data mode: {manifest.mode}. Missing poverty:{' '}
            {manifest.missingness.poverty}; missing distance: {manifest.missingness.lowAccess};
            missing SNAP: {manifest.missingness.snap}. Older source years limit present-day
            interpretation; check field conditions.
          </p>
        </section>
        <section>
          <h2>Community feedback & privacy</h2>
          <p>
            Four fixed-choice questions collect voluntary feedback, with one perceived barrier per
            response. This convenience sample cannot represent the whole community. No personal
            details, free text, precise location, fingerprint, or raw IP is stored by the
            application. Creator access requires a distinct secret; public URLs grant no aggregate
            or edit access. Whole-question breakdowns are withheld when total n is under 5 or any
            nonzero cell is under 5. Anonymous responses cannot guarantee uniqueness.
          </p>
        </section>
        <Button asChild>
          <Link href="/planner">Go to planner</Link>
        </Button>
      </main>
      <Footer />
    </>
  );
}
