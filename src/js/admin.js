async function init() {
  await renderTeamList();
  await renderTeamOptions();

  document.getElementById('team-form').addEventListener('submit', handleTeamSubmit);
  document.getElementById('player-form').addEventListener('submit', handlePlayerSubmit);
}

async function renderTeamList() {
  const teams = await getTeams();
  const players = await getPlayers();
  const wrap = document.getElementById('team-list');

  wrap.innerHTML = teams.map(t => {
    const members = players.filter(p => p.team_id === t.id);
    return `<p><strong>${t.name}</strong>（${members.length}人）: ${members.map(m => m.name).join(', ')}</p>`;
  }).join('');
}

async function renderTeamOptions() {
  const teams = await getTeams();
  const select = document.getElementById('player-team');
  select.innerHTML = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

async function handleTeamSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('team-name').value;
  const color = document.getElementById('team-color').value;
  await submitTeam({ name, color });
  document.getElementById('team-name').value = '';
  await renderTeamList();
  await renderTeamOptions();
}

async function handlePlayerSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('player-name').value;
  const team_id = document.getElementById('player-team').value;
  await submitPlayer({ name, team_id });
  document.getElementById('player-name').value = '';
  await renderTeamList();
}

init();
