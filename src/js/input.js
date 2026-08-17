let players = [];
let teams = [];
let config = null;
let selectedPlayers = [];
let scores = [];
let hands = [];
let dealerSeat = 0;
let editingGameId = null; // URLに?edit=idがあれば編集モード

async function init() {
  players = await getPlayers();
  teams = await getTeams();
  config = await fetch('config/league.config.json').then(r => r.json());

  const params = new URLSearchParams(window.location.search);
  editingGameId = params.get('edit');

  renderPlayerSelectRows();

  document.getElementById('setup-form').addEventListener('submit', handleSetup);
  document.getElementById('hand-type').addEventListener('change', toggleHandFields);
  document.getElementById('add-hand-btn').addEventListener('click', addHand);
  document.getElementById('finish-btn').addEventListener('click', finishSession);

  document.getElementById('tsumo-winner').addEventListener('change', updateTsumoFieldVisibility);
  document.getElementById('tsumo-child-amount').addEventListener('input', autoFillParentAmount);

  if (editingGameId) {
    document.querySelector('h1').textContent = '対局結果の編集';
    document.getElementById('finish-btn').textContent = 'この内容で更新する';
    await loadGameForEdit(editingGameId);
  }
}

async function loadGameForEdit(id) {
  const detail = await getGameDetail(id);
  if (!detail.game) {
    alert('対局データが見つかりませんでした');
    return;
  }
  const g = detail.game;

  document.getElementById('date').value = g.date;
  document.getElementById('round_no').value = g.round_no;

  const playerIds = [g.player1_id, g.player2_id, g.player3_id, g.player4_id];
  selectedPlayers = playerIds.map((pid, seat) => {
    const p = players.find(pl => pl.id === pid);
    return { seat, id: pid, name: p ? p.name : '不明' };
  });

  const seatOf = (pid) => selectedPlayers.findIndex(p => p.id === pid);

  // 局データを座席ベースで再構築
  const sortedHands = [...detail.hands].sort((a, b) => Number(a.hand_no) - Number(b.hand_no));
  hands = sortedHands.map(h => {
    const handPayments = detail.payments
      .filter(p => Number(p.hand_no) === Number(h.hand_no))
      .map(p => ({
        from: seatOf(p.from_player_id),
        to: seatOf(p.to_player_id),
        amount: Number(p.amount)
      }));
    return {
      type: h.type,
      dealerSeat: seatOf(h.dealer_player_id),
      payments: handPayments
    };
  });

  // 素点を最初から再計算（開始点からリプレイ）
  scores = selectedPlayers.map(() => config.startScore);
  hands.forEach(h => {
    h.payments.forEach(p => {
      scores[p.from] -= p.amount;
      scores[p.to] += p.amount;
    });
  });
  dealerSeat = hands.length > 0 ? hands[hands.length - 1].dealerSeat : 0;

  renderScoreBoard();
  renderPlayerOptionsInHandForm();
  renderDealerSelect();
  renderHandList();
  updateTsumoFieldVisibility();

  document.getElementById('hand-section').style.display = 'block';
  document.getElementById('setup-form').style.display = 'none';
}

function renderPlayerSelectRows() {
  const wrap = document.getElementById('player-select-rows');
  wrap.innerHTML = '';

  const optionsHtml = teams.map(team => {
    const members = players.filter(p => p.team_id === team.id);
    if (members.length === 0) return '';
    const opts = members.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    return `<optgroup label="${team.name}">${opts}</optgroup>`;
  }).join('');

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

function handleSetup(e) {
  e.preventDefault();

  const selects = document.querySelectorAll('.setup-player-select');
  selectedPlayers = Array.from(selects).map((sel, seat) => {
    const p = players.find(pl => pl.id === sel.value);
    return { seat, id: p.id, name: p.name };
  });

  scores = selectedPlayers.map(() => config.startScore);
  hands = [];
  dealerSeat = 0;

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

function updateTsumoFieldVisibility() {
  const winnerSeat = Number(document.getElementById('tsumo-winner').value || 0);
  const isDealerWin = winnerSeat === dealerSeat;
  document.getElementById('tsumo-dealer-win').style.display = isDealerWin ? 'block' : 'none';
  document.getElementById('tsumo-child-win').style.display = isDealerWin ? 'none' : 'block';
}

function autoFillParentAmount() {
  const childAmount = parseFloat(document.getElementById('tsumo-child-amount').value || 0);
  document.getElementById('tsumo-parent-amount').value = childAmount * 2;
}

function addHand() {
  const type = document.getElementById('hand-type').value;
  let payments = [];

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

function buildGameData() {
  const date = document.getElementById('date').value;
  const round_no = document.getElementById('round_no').value;

  const results = calcFinalResults();
  const gamePlayers = results.map(r => ({
    player_id: selectedPlayers[r.seat].id,
    rank: r.rank,
    score: r.score,
    point: r.point
  }));

  const handsPayload = hands.map((h, idx) => ({
    hand_no: idx,
    dealer_player_id: selectedPlayers[h.dealerSeat].id,
    type: h.type
  }));

  const paymentsPayload = [];
  hands.forEach((h, idx) => {
    h.payments.forEach(p => {
      paymentsPayload.push({
        hand_no: idx,
        from: selectedPlayers[p.from].id,
        to: selectedPlayers[p.to].id,
        amount: p.amount
      });
    });
  });

  return { date, round_no, players: gamePlayers, hands: handsPayload, payments: paymentsPayload };
}

async function finishSession() {
  if (hands.length === 0) {
    alert('少なくとも1局は記録してください');
    return;
  }
  if (!document.getElementById('date').value) {
    alert('対局日を入力してください');
    return;
  }

  const gameData = buildGameData();
  let result;

  if (editingGameId) {
    gameData.id = editingGameId;
    result = await updateGame(gameData);
  } else {
    result = await submitGame(gameData);
  }

  document.getElementById('result-message').textContent =
    result.status === 'ok' ? '保存しました！' : '保存に失敗しました: ' + result.error;
}

init();
