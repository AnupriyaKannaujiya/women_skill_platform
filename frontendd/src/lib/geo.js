// Reads the device location once. Resolves { lat, lng, accuracy } or rejects with a
// message a person can act on.
export function getLocation({ timeout = 10000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser cannot share location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy || 0),
        }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Location permission was denied. Allow location for this site in your browser settings."
              : "Could not get your location. Check that location (GPS) is on and try again.",
          ),
        ),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 60000 },
    );
  });
}

export const mapsLink = (point) => (point ? `https://maps.google.com/?q=${point.lat},${point.lng}` : "");
