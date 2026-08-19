function fmtPt(pt) {
  const num = Number(pt) || 0;
  const cls = num >= 0 ? 'pt-plus' : 'pt-minus';
  const text = (num >= 0 ? '+' : '') + num.toFixed(1);
  return `<span class="${cls}">${text}</span>`;
}

function fmtDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get('id');

  if (!playerId) {
    document.getElementById('player-header').innerHTML = '<p>選手が指定されていません</p>';
    return;
  }

  const standings = await getStandings();
  const player = standings.players.find(p => p.id === playerId);

  if (!player) {
    document.getElementById('player-header').innerHTML = '<p>選手が見つかりませんでした</p>';
    return;
  }

  document.getElementById('player-header').innerHTML = `<h1>${player.name}</h1>`;

  document.getElementById('player-stats').innerHTML = `
    <div class="card">
      <table>
        <tbody>
          <tr><td>試合数</td><td>${player.games}</td></tr>
          <tr><td>通算ポイント</td><td>${fmtPt(player.pt)}</td></tr>
          <tr><td>平均順位</td><td>${player.avgRank.toFixed(2)}</td></tr>
          <tr><td>トップ率</td><td>${(player.topRate * 100).toFixed(0)}%</td></tr>
          <tr><td>総局数</td><td>${player.totalHands}</td></tr>
          <tr><td>アガリ率</td><td>${(player.agariRate * 100).toFixed(1)}%</td></tr>
          <tr><td>放銃率</td><td>${(player.houjuRate * 100).toFixed(1)}%</td></tr>
          <tr><td>平均打点</td><td>${Math.round(player.avgWinValue).toLocaleString()}点</td></tr>
          <tr><td>放銃平均打点</td><td>${Math.round(player.avgHoujuValue).toLocaleString()}点</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const games = await getGames();
  const players = await getPlayers();
  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));

  const myGames = games.filter(g =>
    [g.player1_id, g.player2_id, g.player3_id, g.player4_id].includes(playerId)
  ).reverse();

  if (myGames.length === 0) {
    document.getElementById('player-games').innerHTML = '<p style="color:var(--text-muted);">まだ対局履歴がありません</p>';
    return;
  }

  document.getElementById('player-games').innerHTML = myGames.map(g => {
    let mySeatInfo = null;
    for (let i = 1; i <= 4; i++) {
      if (g['player' + i + '_id'] === playerId) {
        mySeatInfo = { rank: g['rank' + i], point: g['point' + i] };
      }
    }
    const others = [1, 2, 3, 4]
      .filter(i => g['player' + i + '_id'] !== playerId)
      .map(i => `${g['rank' + i]}着 ${playerMap[g['player' + i + '_id']] || '不明'}`)
      .join(' / ');

    return `<div class="card" style="padding:0.75rem 1rem;">
      <p style="font-size:12px; color:var(--text-muted); margin:0 0 4px;">${fmtDateLabel(g.date)}　第${g.round_no}回戦</p>
      <p style="margin:0 0 4px; font-weight:600;">${mySeatInfo.rank}着　${fmtPt(mySeatInfo.point)}</p>
      <p style="margin:0; font-size:12px; color:var(--text-secondary);">${others}</p>
    </div>`;
  }).join('');
}

init();
