let activeTab = 'individual';
let activeTeamFilter = -1;

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

async function render() {
  const content = document.getElementById('content');
  content.innerHTML = '読み込み中...';

  const standings = await getStandings();

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

function renderTeam(standings, content) {
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

  content.innerHTML = html;
}

init();
