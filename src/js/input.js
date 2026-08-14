let players = [];

async function init() {
  players = await getPlayers();
  renderPlayerRows();

  document.getElementById('game-form').addEventListener('submit', handleSubmit);
}

function renderPlayerRows() {
  const wrap = document.getElementById('player-rows');
  wrap.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>${i + 1}着</label>
      <select data-rank="${i + 1}" class="player-select">
        ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
      <input type="number" class="point-input" data-rank="${i + 1}" placeholder="収支（例: 10.5 / -8.0）">
    `;
    wrap.appendChild(div);
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const date = document.getElementById('date').value;
  const round_no = document.getElementById('round_no').value;

  const selects = document.querySelectorAll('.player-select');
  const points = document.querySelectorAll('.point-input');

  const gamePlayers = Array.from(selects).map((sel, i) => ({
    player_id: sel.value,
    rank: i + 1,
    point: parseFloat(points[i].value || 0)
  }));

  const gameData = {
    date,
    round_no,
    players: gamePlayers,
    payments: [] // 🔧点数移動の詳細は今後拡張
  };

  const result = await submitGame(gameData);
  document.getElementById('result-message').textContent =
    result.status === 'ok' ? '登録しました！' : '登録に失敗しました: ' + result.error;
}

init();
