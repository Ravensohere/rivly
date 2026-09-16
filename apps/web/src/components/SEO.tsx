import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
}

export function SEO({ 
  title, 
  description, 
  keywords = [], 
  image = '/og-image.png',
  noIndex = false
}: SEOProps) {
  const location = useLocation();
  const siteUrl = 'https://rivly.in'; // Or rivly.app in future
  const fullUrl = `${siteUrl}${location.pathname}`;

  const defaultTitle = 'Rivly - Your Calm Daily Operating System';
  // Don't append the brand when the page title already says it ("… | Rivly" twice).
  const fullTitle = !title
    ? defaultTitle
    : /rivly/i.test(title) ? title : `${title} | Rivly`;
  
  const defaultDescription = 'Plan your day, focus deeply, regulate mental load, and sleep better. Rivly is the productivity app for sustainable rhythm.';
  const finalDescription = description || defaultDescription;

  const allKeywords = [
    'Rivly', 
    'Rivly App', 
    'RivlyLogin', 
    'Daily Planner', 
    'ADHD Planner', 
    'Productivity App India', 
    'Rhythm Planner',
    ...keywords
  ].join(', ');

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={allKeywords} />
      <link rel="canonical" href={fullUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* og:* and twitter:* live in index.html, not here. Social crawlers don't run
          JS, so only the static tags are ever read — emitting them again from Helmet
          just duplicated every tag in the DOM. */}

      {/* JSON-LD Schema for Software Application */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Rivly",
          "applicationCategory": "ProductivityApplication",
          "operatingSystem": "Web, iOS, Android",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR"
          },
          "description": finalDescription,
          "brand": {
            "@type": "Brand",
            "name": "Rivly"
          }
          // No aggregateRating until there are real reviews — publishing invented
          // ratings is a structured-data policy violation and risks manual action.
        })}
      </script>
    </Helmet>
  );
}
