const functions = require('firebase-functions');
let admin = null;

// Lazy initialization - only initialize when function is called
function getAdmin() {
  if (!admin) {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  }
  return admin;
}

/**
 * Extract the correct base URL from the request
 * When called through Firebase Hosting rewrite, req.headers.host is the Cloud Function domain
 * We need to get the original domain from x-forwarded-host or hardcode it
 */
function getBaseUrl(req) {
  // Try to get the original host from x-forwarded-host header
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost) {
    return `https://${forwardedHost}`;
  }
  
  // Try to extract from referer header
  const referer = req.headers.referer;
  if (referer) {
    const match = referer.match(/https?:\/\/([^\/]+)/);
    if (match && match[1]) {
      return `https://${match[1]}`;
    }
  }
  
  // Fallback to known production domain
  return 'https://porkhub.tech';
}

/**
 * HTTP Cloud Function to serve review pages with proper Open Graph meta tags
 * This allows Facebook, iMessage, and other platforms to display rich previews
 */
exports.reviewPreview = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Detect if this is a crawler/bot (for social media previews)
  const userAgent = req.get('user-agent') || '';
  const isCrawler = /bot|crawler|spider|crawling|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|Discordbot|SkypeUriPreview|Applebot|Googlebot|bingbot|facebot/i.test(userAgent);

  console.log('=== reviewPreview called ===');
  console.log('Request path:', req.path);
  console.log('Request URL:', req.url);
  console.log('Request headers.host:', req.headers.host);
  console.log('Request headers.x-forwarded-host:', req.headers['x-forwarded-host']);
  console.log('Request headers.referer:', req.headers.referer);
  console.log('User-Agent:', userAgent);
  console.log('Is Crawler:', isCrawler);

  try {
    let reviewId = null;
    
    // Log all available URL/path information
    console.log('=== URL/Path Debugging ===');
    console.log('req.path:', req.path);
    console.log('req.url:', req.url);
    console.log('req.originalUrl:', req.originalUrl);
    console.log('req.baseUrl:', req.baseUrl);
    console.log('req.params:', req.params);
    console.log('req.query:', req.query);
    
    // Extract review ID from multiple possible locations
    let pathToCheck = req.path || req.url || req.originalUrl || '';
    
    // Try to extract from path - handle /review/REVIEWID format
    const pathMatch = pathToCheck.match(/\/review\/([^\/\?&]+)/);
    
    if (pathMatch && pathMatch[1]) {
      reviewId = decodeURIComponent(pathMatch[1]);
      console.log('✓ Extracted review ID from path:', reviewId);
    }
    
    // If not found in path, try query parameter
    if (!reviewId && req.query && req.query.reviewId) {
      reviewId = decodeURIComponent(req.query.reviewId);
      console.log('✓ Extracted review ID from query param:', reviewId);
    }
    
    // Last attempt: check if path after /review/ is the ID (handles /review/ABC123XYZ)
    if (!reviewId) {
      const reviewMatch = pathToCheck.match(/^\/review\/(.+?)(?:\?|$)/);
      if (reviewMatch && reviewMatch[1]) {
        reviewId = decodeURIComponent(reviewMatch[1]);
        console.log('✓ Extracted review ID from review match:', reviewId);
      }
    }
    
    console.log('Final extracted reviewId:', reviewId);

    if (!reviewId) {
      console.error('❌ No review ID found in:', {
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        query: req.query
      });
      const baseUrl = getBaseUrl(req);
      console.log('Using baseUrl:', baseUrl);
      if (isCrawler) {
        return res.status(200).send(getDefaultHTML(baseUrl));
      } else {
        return res.redirect(302, baseUrl);
      }
    }

    // Get admin instance
    const adminInstance = getAdmin();
    
    // Fetch review data from Firestore
    console.log('📄 Attempting to fetch review with ID:', reviewId);
    const reviewDoc = await adminInstance.firestore().collection('reviews').doc(reviewId).get();
    
    console.log('📄 Review doc exists:', reviewDoc.exists);
    if (reviewDoc.exists) {
      console.log('📄 Review data keys:', Object.keys(reviewDoc.data()));
      console.log('📄 Review data:', JSON.stringify(reviewDoc.data(), null, 2));
    }
    
    if (!reviewDoc.exists) {
      console.error('❌ Review document not found with ID:', reviewId);
      const baseUrl = getBaseUrl(req);
      if (isCrawler) {
        return res.status(200).send(getDefaultHTML(baseUrl));
      } else {
        return res.redirect(302, baseUrl);
      }
    }

    const reviewData = reviewDoc.data();
    
    // Fetch restaurant data
    let restaurantName = 'Unknown Restaurant';
    let restaurantCity = '';
    let restaurantState = '';
    
    if (reviewData.restaurantId) {
      try {
        console.log('Fetching restaurant:', reviewData.restaurantId);
        const restaurantDoc = await adminInstance.firestore().collection('restaurants').doc(reviewData.restaurantId).get();
        if (restaurantDoc.exists) {
          const restaurantData = restaurantDoc.data();
          restaurantName = restaurantData.name || restaurantName;
          restaurantCity = restaurantData.city || '';
          restaurantState = restaurantData.state || '';
          console.log('Got restaurant:', restaurantName, restaurantCity, restaurantState);
        }
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      }
    }

    // Fetch user data
    let userName = 'Anonymous';
    if (reviewData.userId) {
      try {
        console.log('Fetching user:', reviewData.userId);
        const userDoc = await adminInstance.firestore().collection('users').doc(reviewData.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userName = userData.displayName || userName;
          console.log('Got user:', userName);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    // Build preview data
    const title = `${userName}'s Review of ${restaurantName}`;
    const location = restaurantCity && restaurantState ? `${restaurantCity}, ${restaurantState}` : (restaurantCity || restaurantState || '');
    const description = reviewData.text 
      ? `"${reviewData.text.substring(0, 150)}${reviewData.text.length > 150 ? '...' : ''}" - Rated ${reviewData.rating || 0}⭐ ${location ? `at ${location}` : ''}`
      : `${userName} rated ${restaurantName} ${reviewData.rating || 0}⭐ ${location ? `at ${location}` : ''}`;
    
    const image = reviewData.photoURL && reviewData.photoURL.trim() ? reviewData.photoURL : '';
    
    // Build the full URL
    const baseUrl = getBaseUrl(req);
    console.log('Using baseUrl for review:', baseUrl);
    const reviewUrl = `${baseUrl}/review/${reviewId}`;
    const redirectUrl = `${baseUrl}/?review=${encodeURIComponent(reviewId)}`;

    console.log('Building response - Title:', title);
    console.log('Building response - Description:', description);
    console.log('Building response - Image:', image);

    // If crawler, return HTML with meta tags; if browser, redirect
    if (isCrawler) {
      console.log('Returning review HTML for crawler');
      res.status(200).send(getReviewHTML({
        title,
        description,
        image,
        url: reviewUrl,
        baseUrl,
        restaurantName,
        userName,
        rating: reviewData.rating || 0
      }));
    } else {
      console.log('Redirecting browser to:', redirectUrl);
      res.redirect(302, redirectUrl);
    }

  } catch (error) {
    console.error('Error in reviewPreview function:', error);
    const baseUrl = getBaseUrl(req);
    if (isCrawler) {
      res.status(200).send(getDefaultHTML(baseUrl));
    } else {
      res.redirect(302, baseUrl);
    }
  }
});

/**
 * Generate HTML with Open Graph meta tags for a review
 */
function getReviewHTML({ title, description, image, url, baseUrl, restaurantName, userName, rating }) {
  // Build the absolute image URL
  let imageUrl = null;
  
  if (image && image.trim().length > 0) {
    if (image.startsWith('http://') || image.startsWith('https://')) {
      imageUrl = image;
    } else if (image.startsWith('//')) {
      imageUrl = 'https:' + image;
    } else if (image.startsWith('/')) {
      imageUrl = baseUrl + image;
    } else {
      imageUrl = baseUrl + '/' + image;
    }
    console.log('Using review image from review:', imageUrl);
  } else {
    console.log('No review image, using default');
  }
  
  // Fallback: use web-app-manifest-512x512.png if no image
  const finalImageUrl = imageUrl || (baseUrl + '/web-app-manifest-512x512.png');
  
  console.log('Final OG image URL:', finalImageUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook - Required for previews -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(finalImageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(finalImageUrl)}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:type" content="image/png">
  <meta property="og:site_name" content="PorkHub">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(finalImageUrl)}">
  
  <!-- Additional Meta Tags -->
  <meta property="article:author" content="${escapeHtml(userName)}">
  <meta name="author" content="${escapeHtml(userName)}">
  <link rel="canonical" href="${escapeHtml(url)}">
  
  <script>
    (function() {
      try {
        var pathMatch = window.location.pathname.match(/\/review\/([^\/\?]+)/);
        if (pathMatch && pathMatch[1]) {
          var reviewId = pathMatch[1];
          window.location.replace(window.location.origin + '/?review=' + encodeURIComponent(reviewId));
        }
      } catch (e) {
        console.error('Redirect failed:', e);
      }
    })();
  </script>
</head>
<body>
  <p>Loading review...</p>
</body>
</html>`;
}

/**
 * Generate default HTML fallback
 */
function getDefaultHTML(baseUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>PorkHub - Find Great Breaded Pork Tenderloins</title>
  <meta name="description" content="Find, review, and share the best breaded pork tenderloin sandwiches. Join the PorkHub community.">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}">
  <meta property="og:title" content="PorkHub">
  <meta property="og:description" content="Find, review, and share the best breaded pork tenderloin sandwiches.">
  <meta property="og:image" content="${baseUrl}/web-app-manifest-512x512.png">
  <meta property="og:site_name" content="PorkHub">
  
  <meta http-equiv="refresh" content="1;url=${baseUrl}/">
  <script>
    window.location.replace("${baseUrl}/");
  </script>
</head>
<body>
  <p>Redirecting to PorkHub...</p>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}
