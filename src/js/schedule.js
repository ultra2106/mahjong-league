function fmtPt(pt) {
  const cls = pt >= 0 ? 'pt-plus' : 'pt-minus';
  const text = (pt >= 0 ? '+' : '') + Number(pt).toFixed(1);
  return `<span class="${cls}">${text}</span>`;
}

async function init() {
  const games = await getGames();
  const players = await getPlayers();
  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));

  // 日付ごとにグループ化
  const byDate = {};
  games.forEach(g => {
    if (!byDate[g.date]) byDate[g.date] = [];
    byDate[g.date].push(g);
  });

  const wrap = document.getElementById('day-list');
  wrap.innerHTML = Object.entries(byDate).map(([date, dayGames]) => {
    const cards = dayGames.map(g => {
      const rows = [1, 2, 3, 4].map(i => {
        const name = playerMap[g['player' + i + '_id']] || '不明';
        const pt = g['point' + i];
        return `<div>${g['rank' + i]}着 ${name} ${fmtPt(pt)}</div>`;
      }).join('');
      return `<div style="border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px;">
        <p style="color:var(--text-muted); font-size:12px;">第${g.round_no}局</p>
        ${rows}
      </div>`;
    }).join('');
    return `<h2>${date}</h2>${cards}`;
  }).join('');
}

init();
