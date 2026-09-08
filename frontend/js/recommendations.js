/* recommendations.js – Implements the weighted recommendation algorithm described in the Design Docs */

/**
 * Compute a score for a single destination based on user preferences.
 * @param {Object} dest – Destination object from the data file.
 * @param {Object} prefs – User preferences object:
 *   {
 *     budget: string,            // e.g., '$', '$$', '$$$'
 *     interests: string[],       // array of selected interests e.g., ['Food','Culture']
 *     duration: number,        // number of days (optional, not used in current MVP)
 *     travelType: string,        // e.g., 'Solo','Family','Couple' (optional for future)
 *     season: string             // desired season e.g., 'Spring'
 *   }
 * @returns {number} total score (0‑100)
 */
function scoreDestination(dest, prefs) {
  const weights = {
    budget: 25,
    interests: 30,
    duration: 15,
    travelType: 15,
    season: 15
  };

  let total = 0;

  // ---- Budget (exact match) ----
  if (prefs.budget && dest.budget_category) {
    total += dest.budget_category === prefs.budget ? weights.budget : 0;
  }

  // ---- Interests (partial match) ----
  if (Array.isArray(prefs.interests) && prefs.interests.length) {
    const matched = (dest.travel_interests || []).filter(i => prefs.interests.includes(i)).length;
    const interestScore = (matched / prefs.interests.length) * weights.interests;
    total += interestScore;
  }

  // ---- Season ----
  if (prefs.season && dest.best_travel_season) {
    total += dest.best_travel_season.toLowerCase() === prefs.season.toLowerCase() ? weights.season : 0;
  }

  // ---- Duration (placeholder – give full score if duration provided) ----
  if (prefs.duration) {
    total += weights.duration;
  }

  // ---- Travel Type (placeholder – give full score if travelType provided) ----
  if (prefs.travelType) {
    total += weights.travelType;
  }

  // Clamp to 0‑100
  return Math.min(100, Math.round(total));
}

/**
 * Get sorted recommendations based on preferences.
 * @param {Array} destinations – Array of destination objects.
 * @param {Object} prefs – Same shape as described in scoreDestination.
 * @returns {Array} destinations sorted by descending score, each enriched with a `match` field.
 */
function getRecommendations(destinations, prefs) {
  const scored = destinations.map(dest => ({
    ...dest,
    match: scoreDestination(dest, prefs)
  }));
  // Sort descending by match score
  scored.sort((a, b) => b.match - a.match);
  // Return top 5 as mock recommendation list (adjustable)
  return scored.slice(0, 5);
}

// Export for use in the front‑end scripts (Node style for simplicity)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getRecommendations, scoreDestination };
} else {
  // Expose globally for browser usage
  window.getRecommendations = getRecommendations;
  window.scoreDestination = scoreDestination;
}
