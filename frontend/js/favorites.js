/* favorites.js */
const FAVORITES_KEY = 'ferd-favorites';
function loadFavorites() {
  const json = localStorage.getItem(FAVORITES_KEY);
  return json ? JSON.parse(json) : [];
}
function saveFavorite(destId) {
  const favorites = loadFavorites();
  if (!favorites.includes(destId)) {
    favorites.push(destId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}
function removeFavorite(destId) {
  let favorites = loadFavorites();
  favorites = favorites.filter(id => id !== destId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}
