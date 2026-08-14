let activeTab = 'individual';

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
  const cls = pt >= 0 ? 'pt-plus' : 'pt-minus';
  const text = (pt >= 0 ? '+' : '') + pt.toFixed(1);
  return `<span class="${cls}">${text}</span>`;
}

async function render() {
  const content = document.getElementById('content');
  content.textContent = '読み込み中...';

  const standings = await getStandings();

  if (activeTab === 'individual') {
    let html = '<div class="card"><table><thead><tr><th>選手名</th><th>試合数</th><th>ポイント</th><th>平均順位</th><th>トップ率</th></tr></thead><tbody>';
    standings.players
      .sort((a, b) => b.pt - a.pt)
      .forEach(p => {
        html += `<tr>
          <td>${p.name}</td>
          <td>${p.games}</td>
          <td>${fmtPt(p.pt)}</td>
          <td>${p.avgRank.toFixed(2)}</td>
          <td>${(p.topRate * 100).toFixed(0)}%</td>
        </tr>`;
      });
    html += '</tbody></table></div>';
    content.innerHTML = html;
  } else {
    let html = '<div class="card"><table><thead><tr><th>#</th><th>チーム</th><th>合計pt</th><th>人数</th></tr></thead><tbody>';
    standings.teams
      .sort((a, b) => b.total - a.total)
      .forEach((t, i) => {
        html += `<tr>
          <td>${i + 1}</td>
          <td>${t.name}</td>
          <td>${fmtPt(t.total)}</td>
          <td>${t.members.length}人</td>
        </tr>`;
      });
    html += '</tbody></table></div>';
    content.innerHTML = html;
  }
}

init();
