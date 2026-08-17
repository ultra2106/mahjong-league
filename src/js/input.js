let players = [];
let config = null;
let selectedPlayers = []; // 対局者4人（player情報）
let scores = [];          // 現在の素点（seat順）
let hands = [];           // 記録済みの局一覧
let dealerSeat = 0;       // 現在の親のseat番号

// init()関数を以下に差し替え
async function init() {
  players = await getPlayers();
  teams = await getTeams(); // ← 追加
  config = await fetch('config/league.config.json').then(r => r.json());

  renderPlayerSelectRows();

  document.getElementById('setup-form').addEventListener('submit', handleSetup);
  document.getElementById('hand-type').addEventListener('change', toggleHandFields);
  document.getElementById('add-hand-btn').addEventListener('click', addHand);
  document.getElementById('finish-btn').addEventListener('click', finishSession);

  document.getElementById('tsumo-winner').addEventListener('change', updateTsumoFieldVisibility);
  document.getElementById('tsumo-child-amount').addEventListener('input', autoFillParentAmount);
}

// renderPlayerSelectRows()関数を以下に差し替え
function renderPlayerSelectRows() {
  const wrap = document.getElementById('player-select-rows');
  wrap.innerHTML = '';

  // チームごとにグループ化したoptionを作る
  const optionsHtml = teams.map(team => {
    const members = players.filter(p => p.team_id === team.id);
    if (members.length === 0) return '';
    const label = team.name;
    const opts = members.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    return `<optgroup label="${label}">${opts}</optgroup>`;
  }).join('');

  // どのチームにも属していない選手用
  const unassigned = players.filter(p => !teams.some(t => t.id === p.team_id));
  const unassignedHtml = unassigned.length > 0
    ? `<optgroup label="未所属">${unassigned.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>`
    : '';

  for (let i = 0; i < 4; i++) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>対局者${i + 1}</label>
      <select data-seat="${i}" class="setup-player-select">
        ${optionsHtml}${unassignedHtml}
      </select>
    `;
    wrap.appendChild(div);
  }
}

function renderPlayerSelectRows() {
  const wrap = document.getElementById('player-select-rows');
  wrap.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>対局者${i + 1}</label>
      <select data-seat="${i}" class="setup-player-select">
        ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    `;
    wrap.appendChild(div);
  }
}

function handleSetup(e) {
  e.preventDefault();

  const selects = document.querySelectorAll('.setup-player-select');
  selectedPlayers = Array.from(selects).map((sel, seat) => {
    const p = players.find(pl => pl.id === sel.value);
    return { seat, id: p.id, name: p.name };
  });

  scores = selectedPlayers.map(() => config.startScore);
  hands = [];
  dealerSeat = 0; // 東1局は対局者1が親という前提。必要ならここを変更してください

  renderScoreBoard();
  renderPlayerOptionsInHandForm();
  renderDealerSelect();
  renderHandList();
  updateTsumoFieldVisibility();

  document.getElementById('hand-section').style.display = 'block';
  document.getElementById('setup-form').querySelector('button').disabled = true;
}

function renderDealerSelect() {
  const sel = document.getElementById('dealer-select');
  sel.innerHTML = selectedPlayers.map(p => `<option value="${p.seat}">${p.name}</option>`).join('');
  sel.value = dealerSeat;
  sel.addEventListener('change', () => {
    dealerSeat = Number(sel.value);
    updateTsumoFieldVisibility();
  });
}

function renderPlayerOptionsInHandForm() {
  const optionsHtml = selectedPlayers.map(p => `<option value="${p.seat}">${p.name}</option>`).join('');
  document.getElementById('ron-loser').innerHTML = optionsHtml;
  document.getElementById('ron-winner').innerHTML = optionsHtml;
  document.getElementById('tsumo-winner').innerHTML = optionsHtml;
}

function toggleHandFields() {
  const type = document.getElementById('hand-type').value;
  document.getElementById('ron-fields').style.display = type === 'ron' ? 'block' : 'none';
  document.getElementById('tsumo-fields').style.display = type === 'tsumo' ? 'block' : 'none';
  if (type === 'tsumo') updateTsumoFieldVisibility();
}

// 和了者が親か子かで、ツモの入力欄を出し分ける
function updateTsumoFieldVisibility() {
  const winnerSeat = Number(document.getElementById('tsumo-winner').value || 0);
  const isDealerWin = winnerSeat === dealerSeat;

  document.getElementById('tsumo-dealer-win').style.display = isDealerWin ? 'block' : 'none';
  document.getElementById('tsumo-child-win').style.display = isDealerWin ? 'none' : 'block';
}

// 子の支払いを入力したら、親の支払い欄に自動で2倍を入れる（手動修正も可能）
function autoFillParentAmount() {
  const childAmount = parseFloat(document.getElementById('tsumo-child-amount').value || 0);
  document.getElementById('tsumo-parent-amount').value = childAmount * 2;
}

function addHand() {
  const type = document.getElementById('hand-type').value;
  let payments = []; // [{from: seat, to: seat, amount}]

  if (type === 'ron') {
    const loser = Number(document.getElementById('ron-loser').value);
    const winner = Number(document.getElementById('ron-winner').value);
    const amount = parseFloat(document.getElementById('ron-amount').value || 0);
    if (loser === winner || amount <= 0) {
      alert('放銃者・和了者・点数を正しく入力してください');
      return;
    }
    payments.push({ from: loser, to: winner, amount });

  } else if (type === 'tsumo') {
    const winner = Number(document.getElementById('tsumo-winner').value);
    const isDealerWin = winner === dealerSeat;

    if (isDealerWin) {
      const amount = parseFloat(document.getElementById('tsumo-dealer-amount').value || 0);
      if (amount <= 0) {
        alert('支払い額を入力してください');
        return;
      }
      selectedPlayers.forEach(p => {
        if (p.seat !== winner) payments.push({ from: p.seat, to: winner, amount });
      });
    } else {
      const childAmount = parseFloat(document.getElementById('tsumo-child-amount').value || 0);
      const parentAmount = parseFloat(document.getElementById('tsumo-parent-amount').value || 0);
      if (childAmount <= 0 || parentAmount <= 0) {
        alert('親・子それぞれの支払い額を入力してください');
        return;
      }
      selectedPlayers.forEach(p => {
        if (p.seat === winner) return;
        const amount = p.seat === dealerSeat ? parentAmount : childAmount;
        payments.push({ from: p.seat, to: winner, amount });
      });
    }

  } else {
    payments = [];
  }

  payments.forEach(p => {
    scores[p.from] -= p.amount;
    scores[p.to] += p.amount;
  });

  hands.push({ type, dealerSeat, payments });

  let winnerSeat = null;
  if (type === 'ron') winnerSeat = Number(document.getElementById('ron-winner').value);
  if (type === 'tsumo') winnerSeat = Number(document.getElementById('tsumo-winner').value);

  if (type !== 'draw' && winnerSeat !== dealerSeat) {
    dealerSeat = (dealerSeat + 1) % 4;
  }
  document.getElementById('dealer-select').value = dealerSeat;

  renderScoreBoard();
  renderHandList();
  updateTsumoFieldVisibility();
  resetHandForm();
}

function resetHandForm() {
  document.getElementById('ron-amount').value = '';
  document.getElementById('tsumo-dealer-amount').value = '';
  document.getElementById('tsumo-child-amount').value = '';
  document.getElementById('tsumo-parent-amount').value = '';
}

function renderScoreBoard() {
  const board = document.getElementById('score-board');
  let html = '<table><thead><tr><th>対局者</th><th>素点</th></tr></thead><tbody>';
  selectedPlayers.forEach(p => {
    const mark = p.seat === dealerSeat ? '（親）' : '';
    html += `<tr><td>${p.name}${mark}</td><td>${scores[p.seat].toLocaleString()}</td></tr>`;
  });
  html += '</tbody></table>';
  board.innerHTML = html;
}

function handTypeLabel(type) {
  if (type === 'ron') return 'ロン';
  if (type === 'tsumo') return 'ツモ';
  return '流局';
}

function renderHandList() {
  const wrap = document.getElementById('hand-list');
  if (hands.length === 0) {
    wrap.innerHTML = '<p style="color:var(--text-muted);">まだ記録された局はありません</p>';
    return;
  }

  let html = '';
  hands.forEach((h, i) => {
    let desc = handTypeLabel(h.type) + `（親: ${selectedPlayers[h.dealerSeat].name}）`;
    if (h.payments.length > 0) {
      desc += '：' + h.payments.map(p =>
        `${selectedPlayers[p.from].name} → ${selectedPlayers[p.to].name} (${p.amount}点)`
      ).join(' / ');
    }
    html += `<div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1.25rem;">
      <span>${i + 1}局目：${desc}</span>
      <button type="button" data-idx="${i}" class="remove-hand-btn">削除</button>
    </div>`;
  });
  wrap.innerHTML = html;

  wrap.querySelectorAll('.remove-hand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      hands[idx].payments.forEach(p => {
        scores[p.from] += p.amount;
        scores[p.to] -= p.amount;
      });
      hands.splice(idx, 1);
      renderScoreBoard();
      renderHandList();
    });
  });
}

function calcFinalResults() {
  const withSeat = selectedPlayers.map(p => ({ seat: p.seat, score: scores[p.seat] }));
  const sorted = [...withSeat].sort((a, b) => b.score - a.score);

  return sorted.map((s, idx) => {
    const rank = idx + 1;
    const uma = config.uma[idx] || 0;
    const oka = rank === 1 ? config.oka : 0;
    const point = (s.score - config.startScore) / 1000 + uma + oka;
    return { seat: s.seat, rank, score: s.score, point: Math.round(point * 10) / 10 };
  });
}

async function finishSession() {
  if (hands.length === 0) {
    alert('少なくとも1局は記録してください');
    return;
  }

  const date = document.getElementById('date').value;
  const round_no = document.getElementById('round_no').value;

  if (!date) {
    alert('対局日を入力してください');
    return;
  }

  const results = calcFinalResults();
  const gamePlayers = results.map(r => ({
    player_id: selectedPlayers[r.seat].id,
    rank: r.rank,
    score: r.score,
    point: r.point
  }));

  const payments = [];
  hands.forEach(h => {
    h.payments.forEach(p => {
      payments.push({
        from: selectedPlayers[p.from].id,
        to: selectedPlayers[p.to].id,
        amount: p.amount
      });
    });
  });

  const gameData = { date, round_no, players: gamePlayers, payments };

  const result = await submitGame(gameData);
  document.getElementById('result-message').textContent =
    result.status === 'ok' ? '登録しました！' : '登録に失敗しました: ' + result.error;
}

init();
