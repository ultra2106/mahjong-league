function fmtPt(pt) {
  const cls = pt >= 0 ? 'pt-plus' : 'pt-minus';
  const text = (pt >= 0 ? '+' : '') + Number(pt).toFixed(1);
  return `<span class="${cls}">${text}</span>`;
}

function fmtDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function init() {
  const games = await getGames();
  const players = await getPlayers();
  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));

  const byDate = {};
  games.forEach(g => {
    if (!byDate[g.date]) byDate[g.date] = [];
    byDate[g.date].push(g);
  });

  const wrap = document.getElementById('day-list');

  if (games.length === 0) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">まだ対局結果がありません</p>';
    return;
  }

  wrap.innerHTML = Object.entries(byDate).map(([date, dayGames]) => {
    const matchCards = dayGames.map(g => {
      const rows = [1, 2, 3, 4].map(i => {
        const name = playerMap[g['player' + i + '_id']] || '不明';
        const pt = g['point' + i];
        return `<div class="match-row">
          <span class="rank">${g['rank' + i]}着</span>
          <span class="name">${name}</span>
          ${fmtPt(pt)}
        </div>`;
      }).join('');
      return `<div class="match-card">
        <p class="round-label">第${g.round_no}回戦</p>
        ${rows}
      </div>`;
    }).join('');

    return `<div class="day-section">
      <h2>${fmtDateLabel(date)}</h2>
      <div class="match-grid">${matchCards}</div>
    </div>`;
  }).join('');
}

init();
