# Firebase Cloud Functions Setup Guide

This guide explains how to deploy and use the Cloud Functions for social media previews.

## What This Does

The Cloud Function (`reviewPreview`) serves HTML with proper Open Graph meta tags when someone accesses a review URL like:
- `https://yourdomain.com/review/{reviewId}`

This allows Facebook, SMS, iMessage, Slack, Discord, and other platforms to display rich previews with:
- Review title
- Review text
- Review image
- Rating information

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged into Firebase: `firebase login`
3. Node.js 20+ installed (Cloud Functions uses Node.js 20 runtime)

## Setup Steps

### 1. Install Function Dependencies

```bash
cd functions
npm install
```

### 2. Test Locally (Optional)

You can test the function locally using the Firebase emulator:

```bash
firebase emulators:start --only functions
```

Then test with: `http://localhost:5001/porko-c0f87/us-central1/reviewPreview?review={reviewId}`

### 3. Deploy Functions

Deploy the function to Firebase:

```bash
firebase deploy --only functions
```

Or deploy everything (functions + hosting):

```bash
firebase deploy
```

### 4. Verify Deployment

After deployment, you can test the function:

1. Get a review ID from your Firestore database
2. Visit: `https://porko-c0f87.web.app/review/{reviewId}`
3. View page source to see the meta tags
4. Test with Facebook's Sharing Debugger: https://developers.facebook.com/tools/debug/

## URL Format

The app now supports two URL formats for sharing:

1. **New format (recommended)**: `/review/{reviewId}`
   - Works with Cloud Function
   - Better for social media previews
   - Example: `https://yourdomain.com/review/abc123`

2. **Old format (backward compatible)**: `/#review/{reviewId}`
   - Still works, but redirects to new format
   - Example: `https://yourdomain.com/#review/abc123`

## Testing Social Media Previews

### Facebook
1. Go to: https://developers.facebook.com/tools/debug/
2. Enter: `https://yourdomain.com/review/{reviewId}`
3. Click "Debug" to see the preview

### Twitter
1. Go to: https://cards-dev.twitter.com/validator
2. Enter your review URL
3. See the preview card

### Other Platforms
- **SMS/iMessage**: Share the link and check if preview appears
- **Slack**: Paste the link in a channel
- **Discord**: Paste the link in a channel

## Troubleshooting

### Function Not Working
- Check Firebase Console > Functions to see if it's deployed
- Check function logs: `firebase functions:log`
- Verify the rewrite rule in `firebase.json`

### Preview Not Showing
- Clear Facebook/Twitter cache using their debug tools
- Ensure image URLs are absolute (start with `http://` or `https://`)
- Check that review data exists in Firestore

### CORS Errors
- The function already sets CORS headers
- If issues persist, check Firebase Console > Functions > Configuration

## Costs

Firebase Cloud Functions have a free tier:
- 2 million invocations/month
- 400,000 GB-seconds compute time
- 200,000 CPU-seconds

After free tier, pricing is:
- $0.40 per million invocations
- $0.0000025 per GB-second
- $0.0000100 per vCPU-second

For a typical app, you'll likely stay within the free tier.
