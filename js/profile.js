// Profile page - User dashboard logic
const API = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

// Get JWT from session storage
let jwt = sessionStorage.getItem("jwt");
if (!jwt) {
    window.location.href = "index.html";
}
jwt = jwt.trim().replace(/^["']|["']$/g, '');

// Tooltip element reference
const tooltip = document.getElementById("tooltip");

/**
 * Execute GraphQL query against the API
 * @param {string} q - GraphQL query string
 * @returns {Promise<object>} - API response data
 */
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
        // console.error("Query error:", err);
        throw err;
    }
}

/**
 * Show tooltip at cursor position
 * @param {Event} e - Mouse event
 * @param {string} text - Tooltip text content
 */
function showTooltip(e, text) {
    tooltip.innerHTML = text.replace(/\\n/g, '<br>');
    tooltip.style.left = e.pageX + 15 + "px";
    tooltip.style.top = e.pageY + 15 + "px";
    tooltip.classList.add("show");
}

/**
 * Hide the tooltip
 */
function hideTooltip() {
    tooltip.classList.remove("show");
}

/**
 * Safely set text content of an element
 * @param {string} id - Element ID
 * @param {string} val - Text value to set
 */
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

/**
 * Format XP value to human readable format
 * @param {number} xp - XP amount
 * @returns {string} - Formatted XP string
 */
function formatXP(xp) {
    if (xp >= 1000000) return (xp / 1000000).toFixed(1) + ' MB';
    if (xp >= 1000) return (xp / 1000).toFixed(0) + ' KB';
    return xp + ' B';
}

/**
 * Draw line chart showing XP progression over time
 * @param {Array} transactions - Array of XP transactions
 */
function drawLineChart(transactions) {
    const svg = document.getElementById("line-chart");
    const w = 900, h = 350, p = 60;

    let cumulative = 0;
    const points = transactions.map((t, i) => {
        cumulative += t.amount;
        return { x: i, y: cumulative };
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
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
    `;

    // Draw grid lines
    for (let i = 0; i <= 5; i++) {
        const y = p + i * (h - 2 * p) / 5;
        svgContent += `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" class="grid-line"/>`;
        svgContent += `<text x="${p - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${formatXP(Math.round((5 - i) * maxY / 5))}</text>`;
    }

    // Create path data
    const pathData = points.map((pt, i) => {
        const x = p + pt.x * scaleX;
        const y = h - p - pt.y * scaleY;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const areaPath = pathData + ` L ${w - p} ${h - p} L ${p} ${h - p} Z`;

    svgContent += `<path d="${areaPath}" fill="url(#areaGrad)"/>`;
    svgContent += `<path d="${pathData}" fill="none" stroke="url(#lineGrad)" stroke-width="3" class="line-path" filter="url(#glow)"/>`;

    // Draw data points
    points.forEach((pt, i) => {
        const x = p + pt.x * scaleX;
        const y = h - p - pt.y * scaleY;

        svgContent += `
            <circle cx="${x}" cy="${y}" r="5" fill="#a78bfa" opacity="0" filter="url(#glow)">
                <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${i * 0.03}s" fill="freeze"/>
            </circle>
        `;
    });

    svg.innerHTML = svgContent;
}

/**
 * Draw bar chart showing XP earned per project
 * @param {Array} transactions - Array of XP transactions
 */
function drawBarChart(transactions) {
    const svg = document.getElementById("bar-chart");
    const w = 900, h = 400, p = 60;

    // Group XP by project
    const projectXP = {};
    transactions.forEach(t => {
        const proj = t.path.split('/').pop() || 'unknown';
        projectXP[proj] = (projectXP[proj] || 0) + t.amount;
    });

    // Get top 10 projects
    const top10 = Object.entries(projectXP).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxXP = Math.max(...top10.map(p => p[1])) || 1;
    const barWidth = (w - 2 * p) / top10.length - 20;
    const colors = ['#a78bfa', '#ec4899', '#8b5cf6', '#f472b6', '#c084fc', '#fb7185', '#a855f7', '#f9a8d4', '#9333ea', '#fda4af'];

    let svgContent = '';

    // Draw grid
    for (let i = 0; i <= 5; i++) {
        const y = p + i * (h - 2 * p) / 5;
        svgContent += `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}" class="grid-line"/>`;
        svgContent += `<text x="${p - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${formatXP(Math.round((5 - i) * maxXP / 5))}</text>`;
    }

    // Draw bars
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

/**
 * Draw spider/radar chart for skills
 * @param {Object} skills - Object with skill names and values
 * @param {string} svgId - ID of the SVG element
 * @param {string} color - Primary color for the chart
 * @param {Object} skillProjects - Map of skill to last project
 */
function drawSpiderChart(skills, svgId, color, skillProjects) {
    const svg = document.getElementById(svgId);
    const cx = 200, cy = 200, maxRadius = 130;
    const skillNames = Object.keys(skills);
    const skillValues = Object.values(skills);
    const maxValue = Math.max(...skillValues, 1);
    const numSkills = skillNames.length;

    if (numSkills === 0) {
        svg.innerHTML = `<text x="200" y="200" text-anchor="middle" fill="#64748b" font-size="14">No data available</text>`;
        return;
    }

    let svgContent = `
        <defs>
            <linearGradient id="${svgId}Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.5" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.2" />
            </linearGradient>
        </defs>
    `;

    // Draw concentric circles
    for (let i = 1; i <= 5; i++) {
        const r = (maxRadius / 5) * i;
        svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(167, 139, 250, 0.08)" stroke-width="1"/>`;
    }

    // Draw skill axes and points
    const points = [];
    for (let i = 0; i < numSkills; i++) {
        const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
        const x = cx + Math.cos(angle) * maxRadius;
        const y = cy + Math.sin(angle) * maxRadius;

        svgContent += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(167, 139, 250, 0.15)" stroke-width="1"/>`;

        const value = skillValues[i];
        const radius = (value / maxValue) * maxRadius;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        points.push({ x: px, y: py, name: skillNames[i], value: value });

        // Skill labels
        const labelRadius = maxRadius + 35;
        const lx = cx + Math.cos(angle) * labelRadius;
        const ly = cy + Math.sin(angle) * labelRadius;

        svgContent += `
            <text x="${lx}" y="${ly}" text-anchor="middle" font-size="11" fill="${color}" font-weight="600">
                ${skillNames[i].toUpperCase()}
            </text>
        `;
    }

    // Draw polygon
    const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    svgContent += `
        <polygon points="${polygonPoints}" fill="url(#${svgId}Grad)" stroke="${color}" stroke-width="2" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="1s" fill="freeze"/>
        </polygon>
    `;

    // Draw skill points with tooltips
    points.forEach((point, i) => {
        const lastProject = skillProjects[point.name] || 'No recent project';
        svgContent += `
            <polygon class="skill-point" 
                points="${point.x},${point.y-6} ${point.x+5},${point.y+4} ${point.x-5},${point.y+4}"
                fill="${color}" stroke="#fff" stroke-width="1.5" opacity="0"
                onmouseover="showTooltip(event, '${point.name}: ${point.value}<br>Last used: ${lastProject}')"
                onmouseout="hideTooltip()">
                <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${0.5 + i * 0.1}s" fill="freeze"/>
            </polygon>
        `;
    });

    svg.innerHTML = svgContent;
}

/**
 * Main function to load and display user profile data
 */
async function loadProfile() {
    try {
        // Fetch user info
        const userQuery = `{
            user {
                id
                login
                firstName
                lastName
                email
                auditRatio
            }
        }`;
        const userData = await query(userQuery);
        const user = userData.data.user[0];

        // console.log("=== USER DATA ===", user);

        // Set display name (prefer firstName, fallback to login)
        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : user.login;

        setText("user-name", displayName);

        // Fetch all transactions
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

        // console.log("=== TRANSACTIONS ===", allTransactions.length);

        // Get completed project paths (have skill_ transactions)
        const skillTransactionPaths = new Set();
        allTransactions.forEach(t => {
            if (t.type.startsWith('skill_') && t.path && t.path.includes('bh-module')) {
                skillTransactionPaths.add(t.path);
            }
        });

        // Calculate Module XP - only XP from completed projects
        const xpTransactions = allTransactions.filter(t => t.type === 'xp');
        const moduleXP = xpTransactions.filter(t =>
            t.path && skillTransactionPaths.has(t.path)
        ).reduce((sum, t) => sum + t.amount, 0);

        // console.log("=== MODULE XP ===", moduleXP);
        setText("module-xp", formatXP(moduleXP));

        // Calculate current level
        const levelTransactions = allTransactions
            .filter(t => t.type === 'level')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const currentLevel = levelTransactions.length > 0 ? levelTransactions[0].amount + 1 : 0;
        setText("current-level", currentLevel);
        setText("audit-ratio", user.auditRatio.toFixed(2));

        // Process skills data
        const langSkills = {};
        const techSkills = {};
        const skillLastProject = {};

        const programmingLangs = ['go', 'js', 'sql', 'python', 'java', 'c', 'cpp', 'rust', 'html', 'css', 'ts'];

        allTransactions.filter(t => t.type.startsWith('skill_')).forEach(t => {
            const skillName = t.type.replace('skill_', '');
            const projectName = t.path.split('/').pop() || 'unknown';
            skillLastProject[skillName] = projectName;

            if (programmingLangs.includes(skillName.toLowerCase())) {
                langSkills[skillName] = (langSkills[skillName] || 0) + t.amount;
            } else {
                techSkills[skillName] = (techSkills[skillName] || 0) + t.amount;
            }
        });

        // console.log("=== SPIDER CHART DATA ===");
        // console.log("Languages:", langSkills);
        // console.log("Tech Skills:", techSkills);

        // Draw all charts
        drawLineChart(xpTransactions);
        drawBarChart(xpTransactions);
        drawSpiderChart(langSkills, 'spider-lang', '#a78bfa', skillLastProject);
        drawSpiderChart(techSkills, 'spider-tech', '#ec4899', skillLastProject);

        // Show content, hide loading
        document.getElementById("loading").style.display = "none";
        document.getElementById("content").style.display = "block";

    } catch (err) {
        // console.error(err);
        document.getElementById("loading").innerHTML = `
            <p style="color: #ef4444;">✦ Failed to load data</p>
            <p style="font-size: 0.9rem; color: #64748b;">${err.message}</p>
        `;
    }
}

/**
 * Logout user and redirect to login
 */
function logout() {
    sessionStorage.removeItem("jwt");
    window.location.href = "index.html";
}

// Initialize profile on page load
loadProfile();

