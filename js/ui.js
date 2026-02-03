// Create stars
const starsContainer = document.getElementById('stars');
for (let i = 0; i < 150; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 4 + 's';
    star.style.animationDuration = (3 + Math.random() * 3) + 's';
    starsContainer.appendChild(star);
}

// Create shooting stars
setInterval(() => {
    const shootingStar = document.createElement('div');
    shootingStar.className = 'shooting-star';
    shootingStar.style.top = Math.random() * 50 + '%';
    shootingStar.style.right = '0';
    shootingStar.style.width = Math.random() * 100 + 50 + 'px';
    document.body.appendChild(shootingStar);
    setTimeout(() => shootingStar.remove(), 3000);
}, 3000);