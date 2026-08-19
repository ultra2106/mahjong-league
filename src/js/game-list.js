function fmtDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function init() {
  await renderGameList();
}

async function renderGameList() {
  const games = await getGames();
  const players = await getPlayers();
  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));
  const wrap = document.getElementById('game-list');

  if (games.length === 0) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">まだ対局結果がありません</p>';
    return;
  }

  const sorted = [...games].reverse();

  wrap.innerHTML = sorted.map(g => {
    const summary = [1, 2, 3, 4].map(i => {
      const name = playerMap[g['player' + i + '_id']] || '不明';
      return `${g['rank' + i]}着 ${name}`;
    }).join(' / ');

    return `<div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem;">
      <div>
        <p style="font-size:12px; color:var(--text-muted); margin:0 0 4px;">${fmtDateLabel(g.date)}　第${g.round_no}回戦</p>
        <p style="margin:0; font-size:13px;">${summary}</p>
      </div>
      <div style="display:flex; gap:8px; flex-shrink:0;">
        <a href="input.html?edit=${g.id}"><button type="button">編集</button></a>
        <button type="button" class="delete-game-btn" data-id="${g.id}">削除</button>
      </div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('.delete-game-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteGame(btn.dataset.id));
  });
}

async function handleDeleteGame(id) {
  if (!confirm('この対局結果を削除しますか？順位表からも除外されます。')) return;

  await deleteGame(id);
  await renderGameList();
}

init();
