const loadBtn = document.getElementById('load');
const sinceInput = document.getElementById('since');
const statusEl = document.getElementById('status');
const itemsEl = document.getElementById('items');
const toolbarEl = document.getElementById('toolbar');
const countEl = document.getElementById('count');
const actionsEl = document.getElementById('actions');
const copyBtn = document.getElementById('copy');

const MAX_PAGES = 30;

let state = { items: [] }; // 마지막 크롤 결과

function setStatus(msg, kind = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

/**
 * 페이지 컨텍스트에서 실행되는 크롤러 (자기완결적).
 * pageIndex=0부터 SSR HTML을 fetch해 파싱, 신규 품목이 나오는 동안 반복.
 * sinceISO(YYYY-MM-DD)가 주어지고 페이지에 주문일(연도 포함)이 있으면 그 이후만 수집하고,
 * 페이지의 모든 품목이 기한보다 과거면(최신순 정렬) 중단한다.
 * 주문일을 못 찾으면 필터를 적용하지 않고 전체 수집한다.
 */
async function crawlCoupangOrders(maxPages, sinceISO) {
  const PRICE_RE = /^([\d,]+)\s*원$/;
  const DATE_RE = /(\d{1,2}\/\d{1,2}\([월화수목금토일]\))/;
  const FULLDATE_RE = /(20\d\d)\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/;
  const COUNT_RE = /(\d[\d,]*)\s*(개|세트|팩|매|입|봉|병|캔|박스|포)/;
  const NON_FOOD = [
    '필름', '케이스', '커버', '보호', '행주', '키친타월', '키친 타월', '타월',
    '휴지', '물티슈', '티슈', '걸이', '박스', '봉투', '지퍼백', '위생백', '랩',
    '호일', '충전', '케이블', '배터리', '건전지', '세제', '세탁', '섬유유연제',
    '샴푸', '린스', '비누', '바디', '칫솔', '치약', '면도', '그릇', '수세미',
    '장갑', '마스크', '밴드', '영양제', '비타민', '유산균', '청소', '걸레',
    '방향제', '살충', '기저귀', '텀블러', '수건', '옷걸이', '슬리퍼', '양말',
    '거치대', '충전기',
  ];
  const isFood = (name) => !NON_FOOD.some((k) => name.includes(k));

  function parseAlt(alt) {
    const parts = alt.split(',').map((s) => s.trim()).filter(Boolean);
    const name = parts[0] || alt;
    let quantity = null;
    for (let i = 1; i < parts.length; i++) {
      if (COUNT_RE.test(parts[i])) quantity = parts[i];
    }
    return { name, quantity };
  }

  function extractFromDoc(doc) {
    const items = [];
    let current = null;
    let currentOrderDate = null;
    for (const el of doc.querySelectorAll('*')) {
      if (el.tagName === 'IMG') {
        const alt = (el.getAttribute('alt') || '').trim();
        if (alt.includes(',')) {
          const p = parseAlt(alt);
          current = {
            name: p.name,
            quantity: p.quantity,
            price: null,
            deliveryDate: null,
            orderDate: currentOrderDate,
            isFood: isFood(p.name),
            raw: alt,
          };
          items.push(current);
        }
        continue;
      }
      if (el.children.length > 0) continue; // 리프 텍스트만
      const text = (el.textContent || '').trim();
      if (!text) continue;
      const fd = text.match(FULLDATE_RE);
      if (fd) {
        currentOrderDate = `${fd[1]}-${fd[2].padStart(2, '0')}-${fd[3].padStart(2, '0')}`;
      }
      if (current) {
        if (current.price === null) {
          const m = text.match(PRICE_RE);
          if (m) current.price = Number(m[1].replace(/,/g, ''));
        }
        if (current.deliveryDate === null) {
          const m = text.match(DATE_RE);
          if (m) current.deliveryDate = m[1];
        }
      }
    }
    return items;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const parser = new DOMParser();
  const seen = new Set();
  const collected = [];
  let pagesScanned = 0;
  let anyOrderDate = false;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    let html;
    try {
      const res = await fetch(`/ssr/desktop/order/list?pageIndex=${pageIndex}`, {
        credentials: 'include',
      });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }

    const doc = parser.parseFromString(html, 'text/html');
    const pageItems = extractFromDoc(doc);
    pagesScanned++;

    let newCount = 0;
    let allOlder = pageItems.length > 0;
    for (const it of pageItems) {
      if (it.orderDate) anyOrderDate = true;
      // 기한 필터: 주문일이 있고 기한보다 과거면 제외
      if (sinceISO && it.orderDate && it.orderDate < sinceISO) continue;
      if (sinceISO && it.orderDate) allOlder = false;
      else allOlder = false; // 주문일 없으면 과거 판단 불가 → 계속
      const key = `${it.raw}|${it.price}|${it.deliveryDate}|${it.orderDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(it);
      newCount++;
    }

    // 최신순이므로 이 페이지가 전부 기한보다 과거면 이후 페이지도 과거 → 중단
    if (sinceISO && anyOrderDate && allOlder) break;
    if (newCount === 0) break;
    await sleep(400);
  }

  return { items: collected, pagesScanned, dateDetected: anyOrderDate, url: location.href };
}

function fmtItemMeta(it) {
  const parts = [];
  if (it.quantity) parts.push(it.quantity);
  if (it.price != null) parts.push(`${it.price.toLocaleString('ko-KR')}원`);
  if (it.orderDate) parts.push(`주문 ${it.orderDate}`);
  else if (it.deliveryDate) parts.push(`배송 ${it.deliveryDate}`);
  return parts.join('  ·  ');
}

function renderItems() {
  itemsEl.innerHTML = '';
  if (state.items.length === 0) {
    itemsEl.innerHTML = '<div class="empty">불러온 품목이 없습니다.</div>';
    toolbarEl.style.display = 'none';
    actionsEl.style.display = 'none';
    return;
  }
  state.items.forEach((it, idx) => {
    const row = document.createElement('label');
    row.className = 'item' + (it.isFood ? '' : ' excluded');
    row.innerHTML = `
      <input type="checkbox" data-idx="${idx}" ${it.isFood ? 'checked' : ''} />
      <span class="body">
        <span class="name"></span>
        <span class="meta"></span>
      </span>`;
    row.querySelector('.name').textContent = it.name;
    row.querySelector('.meta').textContent =
      fmtItemMeta(it) + (it.isFood ? '' : '  ·  비식재료?');
    itemsEl.appendChild(row);
  });
  toolbarEl.style.display = 'flex';
  actionsEl.style.display = 'flex';
  updateCount();
}

function getSelected() {
  const checked = [...itemsEl.querySelectorAll('input[type="checkbox"]:checked')];
  return checked.map((c) => state.items[Number(c.dataset.idx)]);
}

function updateCount() {
  const n = itemsEl.querySelectorAll('input:checked').length;
  countEl.textContent = `${state.items.length}건 중 ${n}건 선택`;
}

itemsEl.addEventListener('change', updateCount);
document.getElementById('checkAll').addEventListener('click', () => {
  itemsEl.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = true));
  updateCount();
});
document.getElementById('uncheckAll').addEventListener('click', () => {
  itemsEl.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = false));
  updateCount();
});

loadBtn.addEventListener('click', async () => {
  loadBtn.disabled = true;
  setStatus('여러 페이지 수집 중… (몇 초 걸릴 수 있어요)');
  state.items = [];
  renderItems();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/https:\/\/([^/]*\.)?coupang\.com\//.test(tab.url || '')) {
      setStatus('쿠팡 주문목록 페이지(mc.coupang.com)에서 열어주세요.', 'err');
      return;
    }
    const sinceISO = sinceInput.value || null;

    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: crawlCoupangOrders,
      args: [MAX_PAGES, sinceISO],
    });

    if (!result) {
      setStatus('추출 결과가 없습니다.', 'err');
      return;
    }
    state.items = result.items;
    renderItems();

    const dateNote =
      sinceISO && !result.dateDetected
        ? ' (주문일을 못 찾아 기한 필터 미적용 — 전체 수집)'
        : '';
    if (result.items.length > 0) {
      const food = result.items.filter((i) => i.isFood).length;
      setStatus(`${result.pagesScanned}p에서 ${result.items.length}건 (식재료 추정 ${food}건)${dateNote}`, 'ok');
    } else {
      setStatus(`품목을 찾지 못했습니다 (${result.pagesScanned}p).${dateNote}`, 'err');
    }
  } catch (err) {
    setStatus('오류: ' + (err?.message || String(err)), 'err');
  } finally {
    loadBtn.disabled = false;
  }
});

function buildText(items) {
  const lines = ['# 쿠팡 주문내역 — 냉부', `# ${new Date().toLocaleString('ko-KR')}`, ''];
  lines.push(`## 품목 ${items.length}건`);
  items.forEach((it, i) => {
    const parts = [it.name];
    if (it.quantity) parts.push(it.quantity);
    if (it.price != null) parts.push(`${it.price.toLocaleString('ko-KR')}원`);
    if (it.orderDate) parts.push(`주문 ${it.orderDate}`);
    lines.push(`${i + 1}. ${parts.join('  |  ')}`);
  });
  lines.push('', '## JSON', JSON.stringify(items, null, 2));
  return lines.join('\n');
}

copyBtn.addEventListener('click', async () => {
  const selected = getSelected();
  if (selected.length === 0) return setStatus('선택된 품목이 없습니다.', 'err');
  await navigator.clipboard.writeText(buildText(selected));
  setStatus(`${selected.length}건 클립보드에 복사했습니다.`, 'ok');
});
