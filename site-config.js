window.STARFALL_CONFIG = {
  brand: {
    name: "Starfall Arcade",
    tagline: "A universe of browser games.",
    description: "Original browser games, development updates, community features, achievements, and future worlds in one growing arcade."
  },
  links: {
    discord: "",
    support: "",
    contactEmail: ""
  },
  storage: {
    profile: "starfallArcadeProfile_v1",
    achievements: "starfallArcadeAchievements_v1",
    activity: "starfallArcadeActivity_v1",
    lastGame: "starfallArcadeLastGame_v1"
  },
  games: [
    {
      id: "stable-empire",
      title: "Stable Empire",
      version: "Version 1",
      status: "live",
      featured: true,
      genres: ["Simulation", "Management", "Horses", "Western"],
      tagline: "Build the stable. Raise the bloodline. Grow the empire.",
      description: "A deep browser-based horse stable management game built around training, breeding, competitions, contracts, estate development, crafting, story content, and long-term progression.",
      cover: "assets/stable-empire/cover.webp",
      page: "games/stable-empire.html",
      play: "https://itzreynolds.github.io/stable-empire/",
      release: "Playable now"
    },
    {
      id: "new-world",
      title: "New World in Development",
      version: "",
      status: "locked",
      featured: false,
      genres: ["Coming Soon"],
      tagline: "A second world is taking shape beyond the horizon.",
      description: "The next original Starfall Arcade game stays hidden until its concept and direction are ready to reveal.",
      cover: "",
      page: "",
      play: "",
      release: "Unannounced"
    },
    {
      id: "beyond-horizon",
      title: "Beyond the Horizon",
      version: "",
      status: "locked",
      featured: false,
      genres: ["Future Project"],
      tagline: "The arcade is designed for more than one genre.",
      description: "Future management games, stories, experiments, and other browser projects will join the library over time.",
      cover: "",
      page: "",
      play: "",
      release: "Future"
    }
  ],
  updates: [
    {
      slug: "starfall-arcade-version-1",
      date: "August 2026",
      game: "Starfall Arcade",
      type: "Platform",
      title: "Starfall Arcade Version 1 expands",
      excerpt: "Profiles, achievements, a player dashboard, a deeper game library, roadmap, community systems, and future leaderboard infrastructure now have a home.",
      url: "news/starfall-arcade-version-1.html"
    },
    {
      slug: "stable-empire-version-1",
      date: "August 2026",
      game: "Stable Empire",
      type: "Game Spotlight",
      title: "Stable Empire remains Version 1",
      excerpt: "The flagship game receives a stronger Starfall Arcade presentation while the actual Stable Empire game and its saves remain untouched.",
      url: "news/stable-empire-version-1.html"
    },
    {
      slug: "community-roadmap",
      date: "Coming Next",
      game: "Starfall Arcade",
      type: "Roadmap",
      title: "Community systems are the next frontier",
      excerpt: "Discord, tester programs, bug reports, suggestions, events, real accounts, cloud sync, and live leaderboards are planned in stages.",
      url: "news/community-roadmap.html"
    }
  ],
  roadmap: [
    { phase: "01", status: "complete", title: "Establish Starfall Arcade", text: "Launch the brand, game library, news system, mobile-ready site, and GitHub Pages home." },
    { phase: "02", status: "complete", title: "Build the local player layer", text: "Add browser-local profiles, achievements, recent activity, favorite games, and Continue Playing shortcuts." },
    { phase: "03", status: "live", title: "Showcase Stable Empire — Version 1", text: "Give the flagship title premium cover art, a full game page, feature breakdown, gallery, update history, and direct play path." },
    { phase: "04", status: "next", title: "Open the community", text: "Connect Discord, organize bug reports and suggestions, recruit testers, and publish community events." },
    { phase: "05", status: "planned", title: "Real Starfall accounts", text: "Move beyond browser-local profiles with secure sign-in, account sync, cross-device achievements, and server-side profile data." },
    { phase: "06", status: "planned", title: "Cloud saves and live leaderboards", text: "Only after backend integration: opt-in game reporting, cloud-compatible saves, seasonal rankings, and verified statistics." },
    { phase: "07", status: "future", title: "Reveal the next game", text: "Introduce the second original Starfall Arcade project when it is ready for a proper announcement." },
    { phase: "08", status: "future", title: "Optional supporter program", text: "Consider cosmetics, badges, early previews, and other non-pay-to-win benefits after the community foundation is established." }
  ],
  achievements: [
    { id:"first-visit", icon:"✦", title:"Touchdown", description:"Visit Starfall Arcade for the first time.", points:10 },
    { id:"profile-created", icon:"👤", title:"Make It Yours", description:"Create a local Starfall Arcade profile.", points:20 },
    { id:"library-explorer", icon:"🕹️", title:"Arcade Explorer", description:"Visit the game library.", points:15 },
    { id:"stable-scout", icon:"🐎", title:"Stable Scout", description:"Open the Stable Empire game page.", points:15 },
    { id:"stable-launch", icon:"🏇", title:"Ready to Ride", description:"Launch Stable Empire from Starfall Arcade.", points:25 },
    { id:"news-reader", icon:"📰", title:"Patch Notes Please", description:"Visit the updates area.", points:10 },
    { id:"roadmap-scout", icon:"🧭", title:"Eyes on the Horizon", description:"Check the public roadmap.", points:10 },
    { id:"community-curious", icon:"💬", title:"Community Curious", description:"Visit the community hub.", points:10 }
  ]
};