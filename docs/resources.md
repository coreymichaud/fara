# Resource directory

The `/resources` page is a reference for nonprofit staff and volunteers. It groups operating guidance, referral tools, and local organizations by the task a reader is trying to complete. It is separate from the planner’s indicator datasets and does not establish pantry locations, schedules, capacity, or current service coverage on the map.

## Sources and review

The initial local organizations came from the supplied two-page **Central Florida Food Aid** reference. Links and descriptions were checked against the organizations’ own websites on **7 November 2026**. Additional operating and referral resources come from the official publishers listed below. The reference PDF is not copied into the repository or production image.

| Resource                                  | Publisher                                               | Origin                             | Official page                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Pantry operations and volunteer training  | Second Harvest Food Bank of Central Florida             | Additional guidance                | [Partner agency resources](https://shfbpartneragencies.org/resources/)                                                                  |
| Emergency Food Assistance Program         | Florida Department of Agriculture and Consumer Services | Additional guidance                | [Florida TEFAP](https://www.fdacs.gov/Food-Nutrition/Nutrition-Programs/The-Emergency-Food-Assistance-Program-TEFAP)                    |
| Nutrition in food banking                 | Feeding America                                         | Additional guidance                | [Hunger and Health toolkit directory](https://www.feedingamerica.org/research/hunger-and-health)                                        |
| FoodKeeper                                | FoodSafety.gov / USDA FSIS                              | Additional guidance                | [Storage reference](https://www.foodsafety.gov/keep-food-safe/foodkeeper-app)                                                           |
| Food Finder                               | Second Harvest Food Bank of Central Florida             | Organization in supplied reference | [Pantry locator](https://feedhopenow.org/find-help/food-finder/)                                                                        |
| 211 directory                             | Heart of Florida United Way                             | Additional referral tool           | [Community resources](https://www.hfuw.org/get-help/211-help/)                                                                          |
| Lake and Sumter 211 resources             | United Way of Lake and Sumter Counties                  | Additional referral tool           | [County resources](https://www.uwls.org/211-help/)                                                                                      |
| Community Partner Network                 | Florida Department of Children and Families             | Additional guidance                | [Partner roles and participation](https://www.myflfamilies.com/services/public-assistance/additional-resources-and-services/community/) |
| MyACCESS tutorials and partner training   | Florida Department of Children and Families             | Additional guidance                | [DCF training](https://www.myflfamilies.com/about/training)                                                                             |
| Resource Center                           | HOPE Helps                                              | Supplied reference                 | [Resource Center](https://www.hopehelps.org/resource-center/)                                                                           |
| Member Share Grocery Program              | United Against Poverty Orlando                          | Supplied reference                 | [Grocery program](https://uporlando.org/member-share-grocery-program/)                                                                  |
| Food pantry and case-management referrals | Hands of Hope America                                   | Supplied reference                 | [Food pantry](https://handsofhopeamerica.org/food-pantry)                                                                               |
| Agape Mission Markets                     | Catholic Charities of Central Florida                   | Supplied reference                 | [Locations and assistance](https://cflcc.org/mission-markets/)                                                                          |
| Church & Community Assistance Program     | CCAP                                                    | Supplied reference                 | [Services and contact routes](https://www.ccapflorida.org/)                                                                             |
| Community food-delivery partnerships      | Servant’s Heart Ministry                                | Supplied reference                 | [Delivery model](https://servantsheartministry.org/)                                                                                    |
| Knights Helping Knights Pantry            | University of Central Florida                           | Supplied reference                 | [Student pantry](https://studentunion.ucf.edu/knights-pantry/)                                                                          |

The page links to provider information rather than reproducing changing hours, income thresholds, or application deadlines. United Against Poverty’s handling fees and UCF’s student audience are stated because they materially affect a referral. Statewide and national guidance is labeled separately from Central Florida organizations. Donation-only and volunteer-signup links were not used as substitutes for service information.

A reviewed link means its destination and described content were checked. It does not verify service availability, the quality of an organization, or a resident’s eligibility. Some provider tools require JavaScript or an account; those requirements are noted where relevant.

## Maintaining the page

The catalog lives in `src/config/resources.ts`; the server-rendered page is `src/app/resources/page.tsx`. Each entry records a title, publisher, geographic scope or audience, HTTPS URL, and a short explanation of how nonprofit staff can use it. No third-party content is embedded or fetched when someone opens the page.

When changing the catalog:

1. Read the official destination and follow any redirects. Prefer service, training, or program pages over donation landing pages.
2. Check the publisher, geographic scope, audience, costs, and access restrictions. Keep descriptions factual and avoid promises of assistance.
3. Update the review date only after reviewing the whole catalog. Keep provenance and any material access qualifications current here.
4. Run the resource tests, navigation checks, and browser accessibility/responsive checks. Live provider requests stay outside the deterministic test suite.

The tests validate link structure, required fields, unique destinations and section IDs, rendered attribution, external-link protections, and navigation. They do not monitor the availability of external websites.
