/* filters.js – Combined filtering based on AND logic across categories and OR within interests */

/**
 * Apply a set of filters to the destinations list.
 * @param {Array} destinations – Array of destination objects.
 * @param {Object} filterOpts – { budget?: string, interests?: string[], season?: string }
 * @returns {Array} filtered destinations
 */
function applyFilters(destinations, filterOpts) {
  let result = destinations;

  if (filterOpts.budget) {
    result = result.filter(d => d.budget_category === filterOpts.budget);
  }

  if (filterOpts.season) {
    result = result.filter(d => d.best_travel_season && d.best_travel_season.toLowerCase() === filterOpts.season.toLowerCase());
  }

  if (Array.isArray(filterOpts.interests) && filterOpts.interests.length) {
    // OR logic: keep destinations that have ANY of the selected interests
    result = result.filter(d => {
      const destInterests = d.travel_interests || [];
      return filterOpts.interests.some(interest => destInterests.includes(interest));
    });
  }

  return result;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyFilters };
} else {
  // Expose globally for browser usage
  window.applyFilters = applyFilters;
}
