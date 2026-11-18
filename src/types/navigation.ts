export type AppRoute =
  | "home"
  | "features"
  | "download"
  | "pro"
  | "about"
  | "support"
  | "nova-control";

export const routeToPath: Record<AppRoute, string> = {
  home: "/",
  features: "/features",
  download: "/download",
  pro: "/pro",
  about: "/about",
  support: "/support",
  "nova-control": "/nova-control",
};

export function pathToRoute(pathname: string): AppRoute {
  const normalized = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
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
    case "/nova-control":
      return "nova-control";
    default:
      return "home";
  }
}
