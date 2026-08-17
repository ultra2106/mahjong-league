const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwYt5_Xf5Wh7aaJ3fpSfj0FgG1h57sHHHYEs5BRjXzgj_rBvSf3oKA2pwOZbGNFhTXc/exec';
const ADMIN_SECRET = 'mahjong2026';

async function apiGet(action, params) {
  const query = params ? '&' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${GAS_API_URL}?action=${action}${query}`);
  return res.json();
}

async function apiPost(action, data) {
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, secret: ADMIN_SECRET, data })
  });
  return res.json();
}

async function getStandings() { return apiGet('getStandings'); }
async function getTeams() { return apiGet('getTeams'); }
async function getPlayers() { return apiGet('getPlayers'); }
async function getGames() { return apiGet('getGames'); }
async function getGameDetail(id) { return apiGet('getGameDetail', { id }); }

async function submitGame(gameData) { return apiPost('addGame', gameData); }
async function updateGame(gameData) { return apiPost('updateGame', gameData); }
async function deleteGame(id) { return apiPost('deleteGame', { id }); }

async function submitTeam(teamData) { return apiPost('addTeam', teamData); }
async function submitPlayer(playerData) { return apiPost('addPlayer', playerData); }
async function updateTeam(teamData) { return apiPost('updateTeam', teamData); }
async function deleteTeam(id) { return apiPost('deleteTeam', { id }); }
