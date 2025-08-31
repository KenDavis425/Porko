// We will use OpenStreetMap's Nominatim API for geocoding.
// It's a free service and doesn't require an API key.
// See usage policy: https://operations.osmfoundation.org/policies/nominatim/
// It's recommended to provide a valid email in the request for contact purposes.
const YOUR_EMAIL_FOR_NOMINATIM = 'kennected.com@gmail.com';

/**
 * Geocodes an address string into latitude and longitude using Nominatim.
 * @param {string} address The address to geocode.
 * @returns {Promise<{lat: number, lng: number}|null>} A promise that resolves to the location or null.
 */
export async function geocodeAddress(address) {
  if (!address || !address.trim()) {
    console.error('Geocoding error: Address is empty.');
    return null;
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&email=${YOUR_EMAIL_FOR_NOMINATIM}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      // Nominatim returns 'lon', but the app uses 'lng'.
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }
    return null;
  } catch (error) {
    console.error('Error during geocoding fetch:', error);
    return null;
  }
}