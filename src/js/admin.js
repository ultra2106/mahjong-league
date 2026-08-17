let pendingIconDataUrl = '';
let editingTeamId = null; // null=新規作成モード、値ありなら編集モード

async function init() {
  await renderTeamList();
  await renderTeamOptions();
  await renderGameList();

  document.getElementById('team-form').addEventListener('submit', handleTeamSubmit);
  document.getElementById('player-form').addEventListener('submit', handlePlayerSubmit);
  document.getElementById('team-icon-file').addEventListener('change', handleIconFileChange);
  document.getElementById('team-cancel-btn').addEventListener('click', cancelEdit);
}

function isImageIcon(icon) {
  return icon && (icon.startsWith('data:image') || icon.startsWith('http'));
}

function renderIconHtml(team) {
  if (isImageIcon(team.icon)) {
    return `<img src="${team.icon}" alt="">`;
  }
  return teamIconText(team);
}

function teamIconText(team) {
  return team.icon && team.icon.trim() !== '' ? team.icon : '🀄';
}

function teamColor(team) {
  return team.color && team.color.trim() !== '' ? team.color : '#2f9e44';
}

function handleIconFileChange(e) {
  const file = e.target.files[0];
  if (!file) {
    pendingIconDataUrl = '';
    document.getElementById('icon-preview').innerHTML = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      pendingIconDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('icon-preview').innerHTML =
        `<img src="${pendingIconDataUrl}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">`;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

async function renderTeamList() {
  const teams = await getTeams();
  const players = await getPlayers();
  const wrap = document.getElementById('team-list');

  wrap.innerHTML = teams.map(t => {
    const members = players.filter(p => p.team_id === t.id);
    return `<div class="card" style="display:flex; align-items:center; gap:12px; padding:0.75rem 1rem;">
      <span class="team-dot" style="background:${teamColor(t)};">${renderIconHtml(t)}</span>
      <div style="flex:1;">
        <strong>${t.name}</strong>（${members.length}人）: ${members.map(m => m.name).join(', ') || 'メンバーなし'}
      </div>
      <button type="button" class="edit-team-btn" data-id="${t.id}">編集</button>
      <button type="button" class="delete-team-btn" data-id="${t.id}">削除</button>
    </div>`;
  }).join('');

  wrap.querySelectorAll('.edit-team-btn').forEach(btn => {
    btn.addEventListener('click', () => startEditTeam(btn.dataset.id, teams));
  });
  wrap.querySelectorAll('.delete-team-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteTeam(btn.dataset.id));
  });
}

function startEditTeam(id, teams) {
  const team = teams.find(t => t.id === id);
  if (!team) return;

  editingTeamId = id;
  document.getElementById('team-form-title').textContent = `「${team.name}」を編集中`;
  document.getElementById('team-name').value = team.name;
  document.getElementById('team-color').value = team.color || '';
  document.getElementById('team-icon').value = isImageIcon(team.icon) ? '' : (team.icon || '');
  pendingIconDataUrl = isImageIcon(team.icon) ? team.icon : '';
  document.getElementById('icon-preview').innerHTML = isImageIcon(team.icon)
    ? `<img src="${team.icon}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">`
    : '';

  document.getElementById('team-submit-btn').textContent = 'チーム情報を更新';
  document.getElementById('team-cancel-btn').style.display = 'block';

  window.scrollTo({ top: document.getElementById('team-form').offsetTop - 20, behavior: 'smooth' });
}

function cancelEdit() {
  editingTeamId = null;
  document.getElementById('team-form-title').textContent = '新規チーム作成';
  document.getElementById('team-name').value = '';
  document.getElementById('team-color').value = '';
  document.getElementById('team-icon').value = '';
  document.getElementById('team-icon-file').value = '';
  document.getElementById('icon-preview').innerHTML = '';
  pendingIconDataUrl = '';
  document.getElementById('team-submit-btn').textContent = 'チームを作成';
  document.getElementById('team-cancel-btn').style.display = 'none';
}

async function handleDeleteTeam(id) {
  const players = await getPlayers();
  const memberCount = players.filter(p => p.team_id === id).length;

  const message = memberCount > 0
    ? `このチームには${memberCount}人のメンバーがいます。削除すると所属チームが不明になりますが、本当に削除しますか？`
    : 'このチームを削除しますか？';

  if (!confirm(message)) return;

  await deleteTeam(id);
  await renderTeamList();
  await renderTeamOptions();
}

async function renderTeamOptions() {
  const teams = await getTeams();
  const select = document.getElementById('player-team');

  if (teams.length === 0) {
    select.innerHTML = '<option value="">先にチームを作成してください</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

async function handleTeamSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('team-name').value;
  const color = document.getElementById('team-color').value;
  const emojiIcon = document.getElementById('team-icon').value;
  const icon = pendingIconDataUrl || emojiIcon;

  if (editingTeamId) {
    await updateTeam({ id: editingTeamId, name, color, icon });
  } else {
    await submitTeam({ name, color, icon });
  }

  cancelEdit();
  await renderTeamList();
  await renderTeamOptions();
}

async function handlePlayerSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('player-name').value;
  const team_id = document.getElementById('player-team').value;

  if (!team_id) {
    alert('先にチームを作成し、所属チームを選択してください');
    return;
  }

  await submitPlayer({ name, team_id });
  document.getElementById('player-name').value = '';
  await renderTeamList();
}

// ===== 対局結果の管理 =====
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
        <p style="font-size:12px; color:var(--text-muted); margin:0 0 4px;">${g.date}　第${g.round_no}回戦</p>
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
