let activeTab = 'individual';
let activeTeamFilter = -1;
let chartInstance = null;

const CACHE_KEY = 'standings_cache';
const CACHE_TTL_MS = 30000;

async function getStandingsWithCache() {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL_MS) {
      return data;
    }
  }
  const fresh = await getStandings();
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: fresh, ts: Date.now() }));
  return fresh;
}

async function init() {
  const config = await fetch('config/league.config.json').then(r => r.json());
  document.getElementById('league-name').textContent = config.leagueName;

  document.getElementById('tab-individual').addEventListener('click', () => {
    activeTab = 'individual';
    updateTabs();
    render();
  });
  document.getElementById('tab-team').addEventListener('click', () => {
    activeTab = 'team';
    updateTabs();
    render();
  });

  render();
}

function updateTabs() {
  document.getElementById('tab-individual').classList.toggle('active', activeTab === 'individual');
  document.getElementById('tab-team').classList.toggle('active', activeTab === 'team');
}

function fmtPt(pt) {
  const num = Number(pt) || 0;
  const cls = num >= 0 ? 'pt-plus' : 'pt-minus';
  const text = (num >= 0 ? '+' : '') + num.toFixed(1);
  return `<span class="${cls}">${text}</span>`;
}

function teamColor(team) {
  return team.color && team.color.trim() !== '' ? team.color : '#2f9e44';
}

function teamIconHtml(team) {
  const icon = team.icon || '';
  if (icon.startsWith('data:image') || icon.startsWith('http')) {
    return `<img src="${icon}" alt="">`;
  }
  return icon.trim() !== '' ? icon : '🀄';
}

function renderSkeleton() {
  return `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
}

function renderSummaryCards(standings) {
  const totalGames = standings.players.reduce((s, p) => s + p.games, 0) / 4;
  const leader = [...standings.players].sort((a, b) => b.pt - a.pt)[0];

  return `
    <div class="summary-cards">
      <div class="summary-card">
        <p class="summary-label">総対局数</p>
        <p class="summary-value">${Math.round(totalGames)}</p>
      </div>
      <div class="summary-card">
        <p class="summary-label">現在の首位</p>
        <p class="summary-value">${leader ? leader.name : '-'}</p>
      </div>
      <div class="summary-card">
        <p class="summary-label">参加人数</p>
        <p class="summary-value">${standings.players.length}</p>
      </div>
    </div>
  `;
}

async function render() {
  const content = document.getElementById('content');
  const summaryWrap = document.getElementById('summary');

  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data } = JSON.parse(cached);
    summaryWrap.innerHTML = renderSummaryCards(data);
    if (activeTab === 'individual') renderIndividual(data, content);
    else renderTeam(data, content);
  } else {
    content.innerHTML = renderSkeleton();
  }

  const standings = await getStandingsWithCache();
  summaryWrap.innerHTML = renderSummaryCards(standings);

  if (activeTab === 'individual') {
    renderIndividual(standings, content);
  } else {
    renderTeam(standings, content);
  }
}

function renderIndividual(standings, content) {
  const teams = standings.teams;

  let filterHtml = '<div class="team-filter">';
  filterHtml += `<button data-idx="-1" class="${activeTeamFilter === -1 ? 'active' : ''}">すべて</button>`;
  teams.forEach((t, i) => {
    filterHtml += `<button data-idx="${i}" class="${activeTeamFilter === i ? 'active' : ''}">
      <span class="team-dot" style="background:${teamColor(t)};">${teamIconHtml(t)}</span>${t.name}
    </button>`;
  });
  filterHtml += '</div>';

  const targetTeams = activeTeamFilter === -1 ? teams : [teams[activeTeamFilter]];

  let sectionsHtml = '';
  targetTeams.forEach(team => {
    if (team.members.length === 0) return;

    sectionsHtml += `<div class="team-section">
      <h2><span class="team-dot" style="background:${teamColor(team)};">${teamIconHtml(team)}</span>${team.name}</h2>
      <div class="sticky-table-wrap">
        <table class="sticky-table">
          <thead><tr><th>選手名</th>${team.members.map(p => `<th><a class="player-link" href="player.html?id=${p.id}">${p.name}</a></th>`).join('')}</tr></thead>
          <tbody>
            <tr><th>試合数</th>${team.members.map(p => `<td>${p.games}</td>`).join('')}</tr>
            <tr><th>ポイント</th>${team.members.map(p => `<td>${fmtPt(p.pt)}</td>`).join('')}</tr>
            <tr><th>平均順位</th>${team.members.map(p => `<td>${p.avgRank.toFixed(2)}</td>`).join('')}</tr>
            <tr><th>トップ率</th>${team.members.map(p => `<td>${(p.topRate * 100).toFixed(0)}%</td>`).join('')}</tr>
            <tr><th>放銃率</th>${team.members.map(p => `<td>${(p.houjuRate * 100).toFixed(1)}%</td>`).join('')}</tr>
            <tr><th>平均打点</th>${team.members.map(p => `<td>${Math.round(p.avgWinValue).toLocaleString()}</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    </div>`;
  });

  if (sectionsHtml === '') {
    sectionsHtml = '<p style="color:var(--text-muted);">まだ選手が登録されていません。チーム管理ページから登録してください。</p>';
  }

  content.innerHTML = filterHtml + sectionsHtml;

  content.querySelectorAll('.team-filter button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTeamFilter = Number(btn.dataset.idx);
      render();
    });
  });
}

async function renderTeam(standings, content) {
  const ranked = [...standings.teams].sort((a, b) => b.total - a.total);

  let html = '<div class="card"><table class="standings-table"><thead><tr><th>#</th><th>チーム</th><th>合計pt</th><th>人数</th></tr></thead><tbody>';
  ranked.forEach((t, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td class="team-name-cell"><span class="team-dot" style="background:${teamColor(t)};">${teamIconHtml(t)}</span>${t.name}</td>
      <td>${fmtPt(t.total)}</td>
      <td>${t.members.length}人</td>
    </tr>`;
  });
  html += '</tbody></table></div>';

  html += `
    <div class="card">
      <p style="font-size:14px; font-weight:600; margin:0 0 12px;">累積ポイント推移</p>
      <div style="position:relative; width:100%; height:280px;">
        <canvas id="trendChart" role="img" aria-label="チームごとの累積ポイント推移グラフ"></canvas>
      </div>
    </div>
  `;

  content.innerHTML = html;

  await renderTrendChart(standings.teams);
}

// 対局データから「対局日ごとのチーム累積ポイント」を計算してグラフを描く
async function renderTrendChart(teams) {
  const games = await getGames();
  const players = await getPlayers();

  const playerTeamMap = Object.fromEntries(players.map(p => [p.id, p.team_id]));

  // 対局日でソート
  const sortedGames = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));

  // 日付ごとの各チームのポイント増減を集計
  const dateSet = [];
  const teamPointsByDate = {}; // { date: { teamId: 増減pt } }

  sortedGames.forEach(g => {
    const date = g.date;
    if (!teamPointsByDate[date]) {
      teamPointsByDate[date] = {};
      dateSet.push(date);
    }
    for (let i = 1; i <= 4; i++) {
      const pid = g['player' + i + '_id'];
      const pt = Number(g['point' + i]);
      const teamId = playerTeamMap[pid];
      if (!teamId) continue;
      teamPointsByDate[date][teamId] = (teamPointsByDate[date][teamId] || 0) + pt;
    }
  });

  const uniqueDates = [...new Set(dateSet)];

  // 各チームの累積推移を計算
  const datasets = teams.map(team => {
    let running = 0;
    const data = uniqueDates.map(date => {
      running += teamPointsByDate[date][team.id] || 0;
      return Math.round(running * 10) / 10;
    });
    return {
      label: team.name,
      data: data,
      borderColor: teamColor(team),
      backgroundColor: teamColor(team),
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.2
    };
  });

  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById('trendChart');
  if (!ctx || uniqueDates.length === 0) {
    if (ctx) {
      ctx.parentElement.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">まだグラフに表示できる対局データがありません</p>';
    }
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: uniqueDates,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      scales: {
        y: { grid: { color: '#e5e5e5' }, ticks: { color: '#999' } },
        x: { grid: { display: false }, ticks: { color: '#999' } }
      }
    }
  });
}

init();
