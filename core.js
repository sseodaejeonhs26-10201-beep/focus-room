/* 화면과 분리한 타이머·보상 계산. 외부 라이브러리 없이 동작합니다. */
(function (root) {
  'use strict';
  const items = [
    { id: 'plant', name: '초록 화분', icon: '🪴', price: 30 },
    { id: 'scarf', name: '포근 목도리', icon: '🧣', price: 40 },
    { id: 'frame', name: '꽃 액자', icon: '🌷', price: 50 },
    { id: 'lamp', name: '작은 조명', icon: '💡', price: 60 },
    { id: 'hat', name: '모리 왕관', icon: '👑', price: 100 }
  ];
  function initial() { return { version: 1, points: 0, owned: [], equipped: [], records: [], dailyGoal: 120, active: null }; }
  function dateKey(time) {
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function reward(session) { return Math.floor(session.minutes * 2 * Math.max(0, 100 - session.distractions * 20) / 100); }
  // 이탈 중인 시간은 공부 시간에 포함하지 않습니다.
  function elapsed(session, now) {
    const end = session.hiddenAt ?? now;
    return Math.min(session.minutes * 60000, Math.max(0, session.elapsedMs + Math.max(0, end - session.lastStartedAt)));
  }
  function leave(session, now) {
    if (!session || session.hiddenAt !== null || elapsed(session, now) >= session.minutes * 60000) return false;
    session.elapsedMs = elapsed(session, now);
    session.lastStartedAt = now;
    session.hiddenAt = now;
    session.distractions += 1;
    return true;
  }
  function resume(session, now) {
    if (!session || session.hiddenAt === null) return;
    session.lastStartedAt = now;
    session.hiddenAt = null;
  }
  function finish(state, now, completed) {
    const s = state.active;
    if (!s) return null;
    const milliseconds = elapsed(s, now);
    // 호출자가 완료 여부를 잘못 전달해도 목표 시간 전에 보상하지 않습니다.
    completed = completed && milliseconds >= s.minutes * 60000;
    const record = { title: s.title, startedAt: s.startedAt, endedAt: now,
      minutes: milliseconds / 60000, target: s.minutes, completed,
      distractions: s.distractions, points: completed ? reward(s) : 0 };
    state.records.push(record);
    state.points += record.points;
    state.active = null;
    return record;
  }
  function purchase(state, id) {
    const item = items.find(item => item.id === id);
    if (!item) return 'invalid';
    if (!state.owned.includes(id)) {
      if (state.points < item.price) return 'insufficient';
      state.points -= item.price;
      state.owned.push(id);
      state.equipped.push(id);
      return 'purchased';
    }
    if (state.equipped.includes(id)) {
      state.equipped = state.equipped.filter(value => value !== id);
      return 'removed';
    }
    state.equipped.push(id);
    return 'equipped';
  }
  function stats(state, now) {
    const today = new Date(now);
    const days = Array.from({length: 7}, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i);
      const key = dateKey(d);
      return { key, label: `${d.getMonth() + 1}/${d.getDate()}`, minutes: state.records.filter(r => dateKey(r.endedAt) === key).reduce((n,r) => n + r.minutes, 0) };
    });
    const recent = state.records.filter(r => dateKey(r.endedAt) >= days[0].key && dateKey(r.endedAt) <= days[6].key);
    const completed = recent.filter(r => r.completed).length;
    return { days, today: days[6].minutes, total: days.reduce((n,d) => n + d.minutes, 0), count: recent.length, completed,
      rate: recent.length ? Math.round(completed / recent.length * 100) : 0 };
  }
  const core = { items, initial, dateKey, reward, elapsed, leave, resume, finish, purchase, stats };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  else root.FocusCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this);
