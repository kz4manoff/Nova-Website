export interface PageSeoMetadata {
  title: string;
  description: string;
  path: string;
}

export function applyPageSeo({ title, description, path }: PageSeoMetadata): void {
  document.title = title;

  const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
    let element = document.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  };

  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

  const canonicalUrl = `${window.location.origin}${path}`;
  setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", canonicalUrl);
}
