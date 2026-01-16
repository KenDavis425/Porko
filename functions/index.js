const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Lazy initialization - only initialize when function is called
function getAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
}

/**
 * HTTP Cloud Function to serve review pages with proper Open Graph meta tags
 * This allows Facebook, SMS, iMessage, and other crawlers to display rich previews
 */
exports.reviewPreview = functions.https.onRequest(async (req, res) => {
  // Set CORS headers to allow requests from any origin
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Extract review ID from the URL
    // The URL format is: https://yourdomain.com/#review/{reviewId}
    // But the crawler will request it as: https://yourdomain.com/?_escaped_fragment_=/review/{reviewId}
    // Or we can use a cleaner URL format: https://yourdomain.com/review/{reviewId}
    
    let reviewId = null;
    
    // Check if review ID is in query params (for escaped fragment format)
    if (req.query._escaped_fragment_) {
      const fragment = req.query._escaped_fragment_;
      const match = fragment.match(/\/review\/([^\/]+)/);
      if (match) {
        reviewId = match[1];
      }
    }
    
    // Check if review ID is in the path (cleaner URL format: /review/{reviewId})
    if (!reviewId) {
      const pathMatch = req.path.match(/\/review\/([^\/\?]+)/);
      if (pathMatch) {
        reviewId = pathMatch[1];
      }
    }
    
    // Check hash format in query params
    if (!reviewId && req.query.review) {
      reviewId = req.query.review;
    }

    // If no review ID found, serve the default app HTML
    if (!reviewId) {
      return res.status(200).send(getDefaultHTML(req));
    }

    // Get admin instance (initializes on first call)
    const adminInstance = getAdmin();
    
    // Fetch review data from Firestore
    const reviewDoc = await adminInstance.firestore().collection('reviews').doc(reviewId).get();
    
    if (!reviewDoc.exists) {
      // Review not found, serve default HTML
      return res.status(200).send(getDefaultHTML(req));
    }

    const reviewData = reviewDoc.data();
    
    // Fetch restaurant data
    let restaurantName = 'Unknown Restaurant';
    let restaurantCity = '';
    let restaurantState = '';
    let restaurantLocation = null;
    
    if (reviewData.restaurantId) {
      try {
        const restaurantDoc = await adminInstance.firestore().collection('restaurants').doc(reviewData.restaurantId).get();
        if (restaurantDoc.exists) {
          const restaurantData = restaurantDoc.data();
          restaurantName = restaurantData.name || restaurantName;
          restaurantCity = restaurantData.city || '';
          restaurantState = restaurantData.state || '';
          restaurantLocation = restaurantData.location || null;
        }
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      }
    }

    // Fetch user data for display name
    let userName = 'Anonymous';
    if (reviewData.userId) {
      try {
        const userDoc = await adminInstance.firestore().collection('users').doc(reviewData.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userName = userData.displayName || userName;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    // Build preview data
    const title = `${userName}'s Review of ${restaurantName}`;
    const description = reviewData.text 
      ? `"${reviewData.text.substring(0, 150)}${reviewData.text.length > 150 ? '...' : ''}"`
      : `${userName} rated ${restaurantName} ${reviewData.rating || 0} ${reviewData.rating === 1 ? 'star' : 'stars'}`;
    
    // Use review photo if available, otherwise use default
    const image = reviewData.photoURL || '';
    
    // Build the full URL for this review
    const baseUrl = `https://${req.headers.host || req.get('host') || 'porko-c0f87.web.app'}`;
    const reviewUrl = `${baseUrl}/review/${reviewId}`;

    // Return HTML with proper Open Graph meta tags
    res.status(200).send(getReviewHTML({
      title,
      description,
      image,
      url: reviewUrl,
      restaurantName,
      userName,
      rating: reviewData.rating || 0
    }));

  } catch (error) {
    console.error('Error in reviewPreview function:', error);
    // On error, serve default HTML
    res.status(200).send(getDefaultHTML(req));
  }
});

/**
 * Generate HTML with Open Graph meta tags for a review
 */
function getReviewHTML({ title, description, image, url, restaurantName, userName, rating }) {
  // Get base URL for absolute image URLs
  const baseUrl = url.match(/https?:\/\/[^\/]+/)?.[0] || 'https://porko-c0f87.web.app';
  
  // Ensure image URL is absolute
  const imageUrl = image && !image.startsWith('http') 
    ? (image.startsWith('//') ? `https:${image}` : `${baseUrl}${image}`)
    : image || `${baseUrl}/logo.svg`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)}</title>
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:site_name" content="PorkHub">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  
  <!-- Additional Meta Tags -->
  <meta property="article:author" content="${escapeHtml(userName)}">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${escapeHtml(url)}">
  
  <!-- Redirect to the actual app -->
  <script>
    // Redirect to the actual app after a short delay
    setTimeout(function() {
      window.location.href = "${escapeHtml(url)}";
    }, 100);
  </script>
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      max-width: 600px;
    }
    h1 {
      margin: 0 0 20px 0;
      font-size: 28px;
    }
    p {
      margin: 0 0 20px 0;
      font-size: 18px;
      opacity: 0.9;
    }
    .rating {
      font-size: 24px;
      margin: 20px 0;
    }
    .loading {
      margin-top: 20px;
      font-size: 14px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(restaurantName)}</h1>
    <div class="rating">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</div>
    <p>${escapeHtml(description)}</p>
    <p><em>by ${escapeHtml(userName)}</em></p>
    <div class="loading">Loading review...</div>
  </div>
</body>
</html>`;
}

/**
 * Generate default HTML for non-review pages
 */
function getDefaultHTML(req) {
  const baseUrl = `https://${req.headers.host || req.get('host') || 'porko-c0f87.web.app'}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  
  <title>PorkHub</title>
  <meta name="description" content="Find, review, and share the best breaded pork tenderloin sandwiches. Join the PorkHub community to discover hidden gems and top-rated restaurants.">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}">
  <meta property="og:title" content="PorkHub">
  <meta property="og:description" content="Find, review, and share the best breaded pork tenderloin sandwiches. Join the PorkHub community to discover hidden gems and top-rated restaurants.">
  <meta property="og:site_name" content="PorkHub">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="PorkHub">
  <meta name="twitter:description" content="Find, review, and share the best breaded pork tenderloin sandwiches. Join the PorkHub community to discover hidden gems and top-rated restaurants.">
  
  <script>
    window.location.href = "${baseUrl}";
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
