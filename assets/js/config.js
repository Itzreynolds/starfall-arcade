export const STARFALL_CONFIG = {
  siteName: "Starfall Arcade",
  version: "Version 1",
  siteUrl: "https://itzreynolds.github.io/starfall-arcade",
  discordUrl: "",
  supportEmail: "",

  // REQUIRED FOR LIVE ACCOUNTS:
  // Create a Supabase project, then paste the Project URL and public anon key here.
  // Never put your service-role key, Stripe secret key, or Resend API key in this file.
  supabaseUrl: "https://ythdsmdsdfydxoupdywj.supabase.co",
  supabaseAnonKey: "sb_publishable_QhU7Pw5KTDcYUlzAtSCbJA_aKMhbnvI",
  
  games: [
    {
      id: "stable-empire",
      title: "Stable Empire",
      version: "Version 1",
      status: "Live",
      genre: "Simulation • Management • Horses",
      playUrl: "https://itzreynolds.github.io/stable-empire/",
      coverUrl: "assets/img/stable-empire-cover.png",
      description: "Build the stable. Raise the bloodline. Grow the empire."
    }
  ]
};
