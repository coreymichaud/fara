export type Resource = {
  title: string;
  organization: string;
  coverage: string;
  href: string;
  description: string;
};

export type ResourceSection = {
  id: string;
  title: string;
  summary: string;
  resources: readonly Resource[];
};

export const resourcesReviewedOn = '2026-11-07';

export const resourceSections: readonly ResourceSection[] = [
  {
    id: 'operations',
    title: 'Run a food program',
    summary: 'References for pantry procedures, volunteer preparation, and the food you offer.',
    resources: [
      {
        title: 'Pantry operations & volunteer training',
        organization: 'Second Harvest Food Bank of Central Florida',
        coverage: 'Central Florida',
        href: 'https://shfbpartneragencies.org/resources/',
        description:
          'Use the partner agency library to prepare volunteers and review pantry procedures. It includes a choice pantry handbook, food safety training, temperature logs, record-keeping guidance, and resources on compassionate service.',
      },
      {
        title: 'Florida’s Emergency Food Assistance Program',
        organization: 'Florida Department of Agriculture and Consumer Services',
        coverage: 'Florida',
        href: 'https://www.fdacs.gov/Food-Nutrition/Nutrition-Programs/The-Emergency-Food-Assistance-Program-TEFAP',
        description:
          'Find the state’s TEFAP guidance, recipient agency resources, distribution map, and program contacts. Start here when exploring how your organization could participate in USDA food distribution.',
      },
      {
        title: 'Nutrition in food banking',
        organization: 'Feeding America',
        coverage: 'National guidance',
        href: 'https://www.feedingamerica.org/research/hunger-and-health',
        description:
          'Find the Nutrition in Food Banking Toolkit and related research on the Hunger and Health page. Use these references when reviewing food selection, nutrition policies, cultural preferences, and partnerships with health organizations.',
      },
      {
        title: 'FoodKeeper storage reference',
        organization: 'FoodSafety.gov / USDA Food Safety and Inspection Service',
        coverage: 'National guidance',
        href: 'https://www.foodsafety.gov/keep-food-safe/foodkeeper-app',
        description:
          'Look up food and beverage storage guidance when preparing volunteer instructions or reviewing inventory practices. The web tool requires JavaScript; the same page links to mobile versions.',
      },
    ],
  },
  {
    id: 'referrals',
    title: 'Make a referral',
    summary: 'Help someone find food, connect with other support, or navigate public benefits.',
    resources: [
      {
        title: 'Find a nearby food pantry',
        organization: 'Second Harvest Food Bank of Central Florida',
        coverage: 'Seven Central Florida counties, including all four study counties',
        href: 'https://feedhopenow.org/find-help/food-finder/',
        description:
          'Search the Food Finder by ZIP code for nearby feeding partners. Contact the listed provider before making a referral to confirm availability, hours, and any appointment requirements.',
      },
      {
        title: '211 community resource directory',
        organization: 'Heart of Florida United Way',
        coverage: 'Orange, Osceola & Seminole counties',
        href: 'https://www.hfuw.org/get-help/211-help/',
        description:
          'Search local support for food, housing, utilities, and other household needs. Use the directory or contact the referral team when a household needs help beyond what your organization provides.',
      },
      {
        title: '211 resources for Lake & Sumter',
        organization: 'United Way of Lake and Sumter Counties',
        coverage: 'Lake & Sumter counties',
        href: 'https://www.uwls.org/211-help/',
        description:
          'Use the county resource links and searchable referral directory to connect Lake or Sumter residents with local assistance. This is a starting point for checking what other services may be available.',
      },
      {
        title: 'Community Partner Network',
        organization: 'Florida Department of Children and Families',
        coverage: 'Florida',
        href: 'https://www.myflfamilies.com/services/public-assistance/additional-resources-and-services/community/',
        description:
          'Learn about the roles organizations can take in helping residents apply for or maintain public assistance. Find existing partners or review how to become one. DCF, rather than a community partner, determines benefit eligibility.',
      },
      {
        title: 'MyACCESS tutorials & partner training',
        organization: 'Florida Department of Children and Families',
        coverage: 'Florida',
        href: 'https://www.myflfamilies.com/about/training',
        description:
          'Prepare staff to help residents navigate MyACCESS accounts, applications, and case updates. The training page also links to community-partner compliance courses through My FL Learn, which requires an account.',
      },
    ],
  },
  {
    id: 'local-network',
    title: 'Central Florida organizations',
    summary: 'Local services and possible connections to explore before planning your own event.',
    resources: [
      {
        title: 'HOPE’s Resource Center',
        organization: 'HOPE Helps',
        coverage: 'Oviedo / Seminole County',
        href: 'https://www.hopehelps.org/resource-center/',
        description:
          'Review resource-center support and the connection to HOPE’s choice pantry. Check current intake information with the team when helping a household identify suitable local assistance.',
      },
      {
        title: 'Member Share Grocery Program',
        organization: 'United Against Poverty Orlando',
        coverage: 'Orlando area',
        href: 'https://uporlando.org/member-share-grocery-program/',
        description:
          'Learn about a grocery program where members select food and household items. Products carry handling fees, so explain the costs and confirm membership requirements before referring someone; this is not a free-food pantry.',
      },
      {
        title: 'Food pantry & case-management referrals',
        organization: 'Hands of Hope America',
        coverage: 'Four Corners: Lake, Osceola, Orange & Polk',
        href: 'https://handsofhopeamerica.org/food-pantry',
        description:
          'Find information on emergency food assistance and a case-management referral route for the Four Corners area. Staff can also explore connections for needs such as housing, utilities, employment, and benefits.',
      },
      {
        title: 'Agape Mission Markets',
        organization: 'Catholic Charities of Central Florida',
        coverage: 'Multiple Central Florida locations',
        href: 'https://cflcc.org/mission-markets/',
        description:
          'Review the market locations and assistance information for these food pantries. Each site has its own schedule; check the listed location and appointment details before directing a household there.',
      },
      {
        title: 'Church & Community Assistance Program',
        organization: 'CCAP',
        coverage: 'Kissimmee / Osceola County',
        href: 'https://www.ccapflorida.org/',
        description:
          'Find food-assistance information and contact or appointment routes for the Kissimmee center. The organization also describes clothing and housing support, which may help staff coordinate a broader referral.',
      },
      {
        title: 'Community food-delivery partnerships',
        organization: 'Servant’s Heart Ministry',
        coverage: 'Central Florida',
        href: 'https://servantsheartministry.org/',
        description:
          'Learn about a model that delivers food through community partners to households, including people facing transportation barriers. Contact the organization to explore partnership or referral possibilities rather than assuming a delivery is available.',
      },
      {
        title: 'Knights Helping Knights Pantry',
        organization: 'University of Central Florida',
        coverage: 'UCF students',
        href: 'https://studentunion.ucf.edu/knights-pantry/',
        description:
          'Use the university’s pantry page when supporting a UCF student with food or other basic needs. This is a student service, not a general community pantry; check the current UCF ID and access requirements.',
      },
    ],
  },
];
