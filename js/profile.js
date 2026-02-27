// ========================================
// COSMIC DASHBOARD - PROFILE PAGE LOGIC
// ========================================

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
        console.error("Query error:", err);
        throw err;
    }
}

/**
 * Show tooltip at cursor position
 */
function showTooltip(e, text) {
    tooltip.innerHTML = text.replace(/\n/g, '<br>');
    
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let left = clientX + 15;
    let top = clientY + 15;
    
    if (left + tooltipRect.width > viewportWidth - 20) {
        left = clientX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > viewportHeight - 20) {
        top = clientY - tooltipRect.height - 15;
    }
    
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
    tooltip.classList.add("show");
}

/**
 * Hide the tooltip
 */
function hideTooltip() {
    tooltip.classList.remove("show");
}

/**
 * Safely set text content
 */
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

/**
 * Format XP value
 */
function formatXP(xp) {
    if (xp >= 1000000) return (xp / 1000000).toFixed(1) + ' MB';
    if (xp >= 1000) return (xp / 1000).toFixed(0) + ' KB';
    return xp + ' B';
}

/**
 * Draw line chart showing XP progression over time
 */
function drawLineChart(transactions) {
    const svg = document.getElementById("line-chart");
    const w = 900, h = 350, p = 60;

    let cumulative = 0;
    const points = transactions.map((t, i) => {
        cumulative += t.amount;
        return { x: i, y: cumulative, amount: t.amount, date: t.createdAt };
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
    svgContent += `<path d="${pathData}" fill="none" stroke="url(#lineGrad)" stroke-width="3" class="line-path" filter="url(#glow)"/>`;

    points.forEach((pt, i) => {
        const x = p + pt.x * scaleX;
        const y = h - p - pt.y * scaleY;

        svgContent += `
            <circle class="chart-point" 
                cx="${x}" cy="${y}" r="5" 
                fill="#a78bfa" 
                opacity="0" 
                filter="url(#glow)"
                data-cumulative="${pt.y}"
                data-amount="${pt.amount}"
                data-date="${pt.date}"
                style="cursor: pointer;"
            >
                <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${i * 0.03}s" fill="freeze"/>
            </circle>
        `;
    });

    svg.innerHTML = svgContent;

    svg.querySelectorAll('.chart-point').forEach(point => {
        point.addEventListener('mouseenter', (e) => {
            const cumulative = e.target.dataset.cumulative;
            const amount = e.target.dataset.amount;
            const date = new Date(e.target.dataset.date).toLocaleDateString();
            showTooltip(e, `XP: ${formatXP(amount)}\nTotal: ${formatXP(cumulative)}\nDate: ${date}`);
            e.target.setAttribute('r', '8');
        });
        
        point.addEventListener('mouseleave', (e) => {
            hideTooltip();
            e.target.setAttribute('r', '5');
        });
    });
}

/**
 * Draw bar chart showing XP earned per project
 */
function drawBarChart(projectXPData) {
    const svg = document.getElementById("bar-chart");
    const w = 900, h = 400, p = 60;

    const top10 = projectXPData.slice(0, 10);
    
    if (top10.length === 0) {
        svg.innerHTML = `<text x="450" y="200" text-anchor="middle" fill="#64748b" font-size="14">No transactions found</text>`;
        return;
    }

    const maxXP = Math.max(...top10.map(p => p[1])) || 1;
    const barWidth = (w - 2 * p) / top10.length - 20;
    const colors = ['#a78bfa', '#ec4899', '#8b5cf6', '#f472b6', '#c084fc', '#fb7185', '#a855f7', '#f9a8d4', '#9333ea', '#fda4af'];

    let svgContent = '';

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
            <rect class="bar-animated" 
                x="${x}" y="${h - p}" 
                width="${barWidth}" height="0" 
                fill="${color}" rx="6"
                data-project="${name}"
                data-xp="${xp}"
                style="filter: drop-shadow(0 4px 12px ${color}40); cursor: pointer;"
            >
                <animate attributeName="height" from="0" to="${barHeight}" dur="1s" begin="${i * 0.1}s" fill="freeze"/>
                <animate attributeName="y" from="${h - p}" to="${y}" dur="1s" begin="${i * 0.1}s" fill="freeze"/>
            </rect>
            <text x="${x + barWidth / 2}" y="${h - p + 20}" text-anchor="middle" font-size="10" fill="#94a3b8">${name.substring(0, 12)}</text>
        `;
    });

    svg.innerHTML = svgContent;

    svg.querySelectorAll('.bar-animated').forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
            const project = e.target.dataset.project;
            const xp = e.target.dataset.xp;
            showTooltip(e, `${project}\n${formatXP(xp)} XP`);
        });
        bar.addEventListener('mouseleave', () => hideTooltip());
    });
}

/**
 * Draw spider chart matching Original Website
 */
function drawSpiderChart(skills, svgId, color, skillLastProject, chartType) {
    const svg = document.getElementById(svgId);
    const cx = 200, cy = 200, maxRadius = 130;
    
    const technicalSkillsOrder = ['prog', 'algo', 'sys-admin', 'front-end', 'back-end', 'game', 'tcp'];
    const technologiesOrder = ['go', 'js', 'html', 'css', 'unix', 'docker', 'sql'];
    
    const orderedSkills = chartType === 'technical' ? technicalSkillsOrder : technologiesOrder;
    
    const sortedSkills = [];
    const sortedProjects = {};
    
    orderedSkills.forEach(skillName => {
        if (skills[skillName] !== undefined) {
            sortedSkills.push({ name: skillName, value: skills[skillName] });
            sortedProjects[skillName] = skillLastProject[skillName] || 'No recent project';
        }
    });
    
    Object.keys(skills).forEach(skillName => {
        if (!orderedSkills.includes(skillName)) {
            sortedSkills.push({ name: skillName, value: skills[skillName] });
            sortedProjects[skillName] = skillLastProject[skillName] || 'No recent project';
        }
    });
    
    const skillNames = sortedSkills.map(s => s.name);
    const skillValues = sortedSkills.map(s => s.value);
    const maxValue = Math.max(...skillValues, 1);
    const numSkills = skillNames.length;

    if (numSkills === 0) {
        svg.innerHTML = `<text x="200" y="200" text-anchor="middle" fill="#64748b" font-size="14">No data</text>`;
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

    for (let i = 1; i <= 10; i++) {
        const r = (maxRadius / 10) * i;
        svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(167, 139, 250, 0.1)" stroke-width="1"/>`;
    }

    const points = [];
    for (let i = 0; i < numSkills; i++) {
        const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
        
        const xLabel = cx + Math.cos(angle) * (maxRadius + 35);
        const yLabel = cy + Math.sin(angle) * (maxRadius + 35);

        const xAxis = cx + Math.cos(angle) * maxRadius;
        const yAxis = cy + Math.sin(angle) * maxRadius;
        svgContent += `<line x1="${cx}" y1="${cy}" x2="${xAxis}" y2="${yAxis}" stroke="rgba(167, 139, 250, 0.2)" stroke-width="1"/>`;

        const value = skillValues[i];
        const radius = (value / maxValue) * maxRadius;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        points.push({ x: px, y: py, name: skillNames[i], value: value });

        svgContent += `
            <text x="${xLabel}" y="${yLabel}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="${color}" font-weight="600" style="text-transform: uppercase;">
                ${skillNames[i]}
            </text>
        `;
    }

    const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    svgContent += `
        <polygon points="${polygonPoints}" fill="url(#${svgId}Grad)" stroke="${color}" stroke-width="2" opacity="0.8"/>
    `;

    points.forEach((point) => {
        const lastProject = sortedProjects[point.name] || 'N/A';
        svgContent += `
            <circle class="skill-point" 
                cx="${point.x}" cy="${point.y}" r="4"
                fill="#fff" stroke="${color}" stroke-width="2" 
                data-name="${point.name}" 
                data-value="${point.value}" 
                data-project="${lastProject}"
                style="cursor: pointer;"
            />
        `;
    });

    svg.innerHTML = svgContent;

    svg.querySelectorAll('.skill-point').forEach(point => {
        point.addEventListener('mouseenter', (e) => {
            const name = e.target.dataset.name;
            const value = e.target.dataset.value;
            const project = e.target.dataset.project;
            showTooltip(e, `${name.toUpperCase()}: ${value}\nLast: ${project}`);
        });
        point.addEventListener('mouseleave', () => hideTooltip());
    });
}

/**
 * Main function to load profile data
 */
async function loadProfile() {
    try {
        // QUERY 1: Get user info
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

        const displayName = user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : user.login;
        setText("user-name", displayName);

        // QUERY 2: Get completed project paths
        const completedProjectsQuery = `{
            transaction(
                where: {
                    userId: { _eq: ${user.id} }
                    type: { _like: "skill_%" }
                    path: { _like: "%bh-module%" }
                }
            ) {
                path
            }
        }`;
        const completedProjectsData = await query(completedProjectsQuery);
        const completedPaths = [...new Set(completedProjectsData.data.transaction.map(t => t.path))];

        // QUERY 3: Get all XP transactions
        const xpTransactionsQuery = `{
            transaction(
                where: {
                    userId: { _eq: ${user.id} }
                    type: { _eq: "xp" }
                }
                order_by: { createdAt: asc }
            ) {
                id
                amount
                createdAt
                path
            }
        }`;
        const xpTransactionsData = await query(xpTransactionsQuery);
        const allXPTransactions = xpTransactionsData.data.transaction;

        // Calculate Module XP
        const moduleXP = allXPTransactions
            .filter(t => completedPaths.includes(t.path))
            .reduce((sum, t) => sum + t.amount, 0);
        
        setText("module-xp", formatXP(moduleXP));

        // QUERY 4: Get level
        const levelQuery = `
            query GetUserMainEventAndLevel {
                event_user(
                    where: {
                        eventId: { _in: [72, 20, 250, 763] }
                        userId: { _eq: ${user.id} }
                    }
                ) {
                    level
                    userId
                    userLogin
                    eventId
                }
            }
        `;
        const levelData = await query(levelQuery);
        const eventUserData = levelData.data.event_user;
        const currentLevel = eventUserData.length > 0 ? eventUserData[0].level : 0;
        setText("current-level", currentLevel);

        // Audit ratio to 1 decimal
        setText("audit-ratio", parseFloat(user.auditRatio).toFixed(1));

        // QUERY 5: Get all transactions for project grouping
        const allTransactionsQuery = `{
            transaction(
                where: {
                    userId: { _eq: ${user.id} }
                    type: { _eq: "xp" }
                }
            ) {
                path
                amount
            }
        }`;
        const allTransData = await query(allTransactionsQuery);
        
        const projectMap = {};
        allTransData.data.transaction.forEach(t => {
            const projectName = t.path.split('/').pop() || 'unknown';
            projectMap[projectName] = (projectMap[projectName] || 0) + t.amount;
        });
        const projectXPArray = Object.entries(projectMap).sort((a, b) => b[1] - a[1]);

        // QUERY 6: Get skills data
        const skillsQuery = `{
            transaction(
                where: {
                    userId: { _eq: ${user.id} }
                    type: { _like: "skill_%" }
                }
                order_by: { createdAt: desc }
            ) {
                type
                amount
                path
                createdAt
            }
        }`;
        const skillsData = await query(skillsQuery);
        
        const langSkills = {};
        const techSkills = {};
        const skillLastProject = {};
        const skillLastDate = {};
        const programmingLangs = ['go', 'js', 'sql', 'python', 'java', 'c', 'cpp', 'rust', 'html', 'css', 'ts'];

        skillsData.data.transaction.forEach(t => {
            const skillName = t.type.replace('skill_', '');
            const projectName = t.path.split('/').pop() || 'unknown';
            const createdAt = t.createdAt;
            
            if (!skillLastDate[skillName] || new Date(createdAt) > new Date(skillLastDate[skillName])) {
                skillLastDate[skillName] = createdAt;
                skillLastProject[skillName] = projectName;
            }
            
            if (programmingLangs.includes(skillName.toLowerCase())) {
                langSkills[skillName] = (langSkills[skillName] || 0) + t.amount;
            } else {
                techSkills[skillName] = (techSkills[skillName] || 0) + t.amount;
            }
        });

        // Draw charts
        drawLineChart(allXPTransactions);
        drawBarChart(projectXPArray);
        drawSpiderChart(techSkills, 'spider-lang', '#a78bfa', skillLastProject, 'technical');
        drawSpiderChart(langSkills, 'spider-tech', '#ec4899', skillLastProject, 'technology');

        // Show content
        document.getElementById("loading").style.display = "none";
        document.getElementById("content").style.display = "block";

    } catch (err) {
        console.error("=== FATAL ERROR ===", err);
        document.getElementById("loading").innerHTML = `
            <p style="color: #ef4444;">✦ Failed to load data</p>
            <p style="font-size: 0.9rem; color: #64748b;">${err.message}</p>
        `;
    }
}

/**
 * Logout user
 */
function logout() {
    sessionStorage.removeItem("jwt");
    window.location.href = "index.html";
}

// Initialize
loadProfile();
