  // Get and validate JWT
  let jwt = sessionStorage.getItem("jwt");
  if (!jwt) window.location.href = "index.html";
  jwt = jwt.trim().replace(/^["']|["']$/g, '');

  const API = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
  const tooltip = document.getElementById("tooltip");

  async function query(q) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({ query: q }),
      });
      
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      return data;
    } catch (err) {
      console.error("Query error:", err);
      throw err;
    }
  }

  function showTooltip(e, text) {
    tooltip.innerHTML = text.replace(/\\n/g, '<br>');
    tooltip.style.left = e.pageX + 15 + "px";
    tooltip.style.top = e.pageY + 15 + "px";
    tooltip.classList.add("show");
  }

  function hideTooltip() {
    tooltip.classList.remove("show");
  }

  function formatXP(xp) {
    if (xp >= 1000000) return (xp / 1000000).toFixed(1) + ' MB';
    if (xp >= 1000) return (xp / 1000).toFixed(0) + ' KB';
    return xp + ' B';
  }

  function drawLineChart(transactions) {
    const svg = document.getElementById("line-chart");
    const w = 900, h = 350, p = 60;

    let cumulative = 0;
    const points = transactions.map((t, i) => {
      cumulative += t.amount;
      return { x: i, y: cumulative, date: new Date(t.createdAt).toLocaleDateString(), amount: t.amount };
    });

    const maxY = Math.max(...points.map(p => p.y)) || 1;
    const scaleX = (w - 2 * p) / (points.length - 1 || 1);
    const scaleY = (h - 2 * p) / maxY;

    let svgContent = `
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#a78bfa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#a78bfa;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#a78bfa;stop-opacity:0" />
        </linearGradient>
      </defs>
    `;

    // Grid
    for (let i = 0; i <= 5; i++) {
      const y = p + i * (h - 2 * p) / 5;
      svgContent += `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" class="grid-line"/>`;
      svgContent += `<text x="${p - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${formatXP(Math.round((5 - i) * maxY / 5))}</text>`;
    }

    const pathData = points.map((pt, i) => {
      const x = p + pt.x * scaleX;
      const y = h - p - pt.y * scaleY;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const areaPath = pathData + ` L ${w - p} ${h - p} L ${p} ${h - p} Z`;

    svgContent += `<path d="${areaPath}" fill="url(#areaGrad)"/>`;
    svgContent += `<path d="${pathData}" fill="none" stroke="url(#lineGrad)" stroke-width="3" class="line-path"/>`;

    points.forEach((pt, i) => {
      const x = p + pt.x * scaleX;
      const y = h - p - pt.y * scaleY;
      svgContent += `
        <circle class="data-point" cx="${x}" cy="${y}" r="6" fill="#a78bfa" opacity="0"
          onmouseover="showTooltip(event, '${pt.date}<br>XP: +${pt.amount}<br>Total: ${formatXP(Math.round(pt.y))}')"
          onmouseout="hideTooltip()">
          <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${i * 0.03}s" fill="freeze"/>
        </circle>
      `;
    });

    svg.innerHTML = svgContent;
  }

  function drawBarChart(transactions) {
    const svg = document.getElementById("bar-chart");
    const w = 900, h = 400, p = 60;

    const projectXP = {};
    transactions.forEach(t => {
      const proj = t.path.split('/').pop() || 'unknown';
      projectXP[proj] = (projectXP[proj] || 0) + t.amount;
    });

    const top10 = Object.entries(projectXP).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxXP = Math.max(...top10.map(p => p[1])) || 1;
    const barWidth = (w - 2 * p) / top10.length - 20;
    const colors = ['#a78bfa', '#ec4899', '#8b5cf6', '#f472b6', '#c084fc', '#fb7185', '#a855f7', '#f9a8d4', '#9333ea', '#fda4af'];

    let svgContent = '';

    // Grid
    for (let i = 0; i <= 5; i++) {
      const y = p + i * (h - 2 * p) / 5;
      svgContent += `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" class="grid-line"/>`;
      svgContent += `<text x="${p - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${formatXP(Math.round((5 - i) * maxXP / 5))}</text>`;
    }

    top10.forEach(([name, xp], i) => {
      const x = p + i * ((w - 2 * p) / top10.length) + 10;
      const barHeight = (xp / maxXP) * (h - 2 * p);
      const y = h - p - barHeight;
      const color = colors[i % colors.length];

      svgContent += `
        <rect class="bar-animated" x="${x}" y="${h - p}" width="${barWidth}" height="0" fill="${color}" rx="6"
          onmouseover="showTooltip(event, '${name}<br>${formatXP(xp)}')"
          onmouseout="hideTooltip()"
          style="filter: drop-shadow(0 4px 12px ${color}40);">
          <animate attributeName="height" from="0" to="${barHeight}" dur="1s" begin="${i * 0.1}s" fill="freeze"/>
          <animate attributeName="y" from="${h - p}" to="${y}" dur="1s" begin="${i * 0.1}s" fill="freeze"/>
        </rect>
        <text x="${x + barWidth / 2}" y="${h - p + 20}" text-anchor="middle" font-size="10" fill="#94a3b8">${name.substring(0, 10)}</text>
      `;
    });

    svg.innerHTML = svgContent;
  }

  function drawDonutChart(progress) {
    const svg = document.getElementById("donut-chart");
    const pass = progress.filter(g => g.grade >= 1).length;
    const fail = progress.filter(g => g.grade === 0).length;
    const total = pass + fail || 1;

    const passPercent = (pass / total) * 100;
    const failPercent = (fail / total) * 100;

    const cx = 200, cy = 150, r = 80, strokeWidth = 35;
    const circumference = 2 * Math.PI * r;
    const passOffset = circumference * (1 - passPercent / 100);
    const failOffset = circumference * (1 - failPercent / 100);

    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(100, 116, 139, 0.2)" stroke-width="${strokeWidth}"/>
      
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" 
        stroke="#a78bfa" stroke-width="${strokeWidth}" stroke-linecap="round"
        stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
        transform="rotate(-90 ${cx} ${cy})"
        style="filter: drop-shadow(0 0 12px #a78bfa80);">
        <animate attributeName="stroke-dashoffset" from="${circumference}" to="${passOffset}" dur="1.5s" fill="freeze"/>
      </circle>
      
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" 
        stroke="#ec4899" stroke-width="${strokeWidth}" stroke-linecap="round"
        stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
        transform="rotate(${passPercent * 3.6 - 90} ${cx} ${cy})"
        style="filter: drop-shadow(0 0 12px #ec489980);">
        <animate attributeName="stroke-dashoffset" from="${circumference}" to="${failOffset}" dur="1.5s" begin="0.3s" fill="freeze"/>
      </circle>
      
      <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="42" font-weight="bold" fill="#f1f5f9">${total}</text>
      <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="14" fill="#64748b">Missions</text>
    `;

    document.getElementById("legend").innerHTML = `
      <div class="legend-item">
        <div class="legend-color" style="background: #a78bfa;"></div>
        <span>✓ Success: ${pass} (${passPercent.toFixed(1)}%)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #ec4899;"></div>
        <span>✗ Failed: ${fail} (${failPercent.toFixed(1)}%)</span>
      </div>
    `;
  }

  async function loadProfile() {
    try {
      const userQuery = `{
        user {
          id
          login
          firstName
          lastName
          auditRatio
        }
      }`;
      const userData = await query(userQuery);
      const user = userData.data.user[0];
      console.log("=== USER DATA ===");
  console.log(user);

  const displayName = user.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim() 
    : user.login;
  document.getElementById("user-name").textContent = displayName;
  
  document.getElementById("audit-ratio").textContent = user.auditRatio.toFixed(2);

  const transactionQuery = `{
    transaction(
      where: { userId: { _eq: ${user.id} } }
      order_by: { createdAt: asc }
    ) {
      id
      type
      amount
      createdAt
      path
    }
  }`;
  const transactionData = await query(transactionQuery);
  const allTransactions = transactionData.data.transaction;
  
  console.log("=== TRANSACTIONS ===");
  console.log(allTransactions);

  const xpTransactions = allTransactions.filter(t => t.type === 'xp');
  const projectXP = xpTransactions.filter(t => t.path && t.path.includes('div-01')).reduce((sum, t) => sum + t.amount, 0);
  const activityXP = xpTransactions.filter(t => t.path && t.path.includes('piscine')).reduce((sum, t) => sum + t.amount, 0);
  const totalXP = xpTransactions.reduce((sum, t) => sum + t.amount, 0);

  console.log("Project XP:", projectXP, "Activity XP:", activityXP, "Total:", totalXP);

  document.getElementById("project-xp").textContent = formatXP(projectXP);
  document.getElementById("activity-xp").textContent = formatXP(activityXP);
  document.getElementById("total-xp").textContent = formatXP(totalXP);

  const progressQuery = `{
    progress(where: { userId: { _eq: ${user.id} } }) {
      id
      grade
      path
    }
  }`;
  const progressData = await query(progressQuery);
  const progress = progressData.data.progress;
  
  console.log("=== PROGRESS ===");
  console.log(progress);

  drawLineChart(xpTransactions);
  drawBarChart(xpTransactions);
  drawDonutChart(progress);

  document.getElementById("loading").style.display = "none";
  document.getElementById("content").style.display = "block";
} catch (err) {
  console.error(err);
  document.getElementById("loading").innerHTML = `
    <p style="color: #ef4444;">✦ Failed to load data</p>
    <p style="font-size: 0.9rem; color: #64748b;">${err.message}</p>
  `;
}
}

function logout() {
sessionStorage.removeItem("jwt");
window.location.href = "index.html";
}

loadProfile(); 
