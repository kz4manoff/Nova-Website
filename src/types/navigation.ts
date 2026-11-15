export type AppRoute =
  | "home"
  | "features"
  | "download"
  | "pro"
  | "about"
  | "support";

export const routeToPath: Record<AppRoute, string> = {
  home: "/",
  features: "/features",
  download: "/download",
  pro: "/pro",
  about: "/about",
  support: "/support",
};

export function pathToRoute(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  switch (normalized) {
    case "/":
      return "home";
    case "/features":
      return "features";
    case "/download":
      return "download";
    case "/pro":
      return "pro";
    case "/about":
      return "about";
    case "/support":
      return "support";
    default:
      return "home";
  }
}
