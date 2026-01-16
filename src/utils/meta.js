// Utility for managing Open Graph and meta tags for social media sharing

export const updateMetaTags = (options = {}) => {
  const {
    title = 'PorkHub',
    description = 'Find, review, and share the best breaded pork tenderloin sandwiches.',
    image = '',
    url = window.location.href,
    type = 'website'
  } = options;

  // Update or create meta tags
  const setMetaTag = (property, content) => {
    if (!content) return;
    
    let element = document.querySelector(`meta[property="${property}"]`) || 
                  document.querySelector(`meta[name="${property}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      if (property.startsWith('og:')) {
        element.setAttribute('property', property);
      } else {
        element.setAttribute('name', property);
      }
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  };

  // Basic meta tags
  document.title = title;
  setMetaTag('description', description);

  // Open Graph tags
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:image', image);
  setMetaTag('og:url', url);
  setMetaTag('og:type', type);
  setMetaTag('og:site_name', 'PorkHub');

  // Twitter Card tags
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', image);

  // Update canonical URL
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
};

export const resetMetaTags = () => {
  updateMetaTags({
    title: 'PorkHub',
    description: 'Find, review, and share the best breaded pork tenderloin sandwiches. Join the PorkHub community to discover hidden gems and top-rated restaurants.',
    image: '',
    url: window.location.origin
  });
};
