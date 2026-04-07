// deploy.js – sequential deployment with target platform selection

const { execSync } = require('child_process');
require('dotenv').config();

const PLATFORM = process.argv[2] || 'railway';

const deploy = (platform) => {
    const commands = {
        railway: 'railway up',
        vercel: 'vercel --prod'
    };

    const cmd = commands[platform];
    if (!cmd) {
        console.error(`❌ Piattaforma non supportata: "${platform}". Usa "railway" o "vercel".`);
        process.exit(1);
    }

    console.log(`🚀 Deploying to ${platform}...`);
    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`✅ Deploy su ${platform} completato.`);
    } catch (error) {
        console.error(`❌ Errore deploy su ${platform}: ${error.message}`);
        process.exit(1);
    }
};

deploy(PLATFORM);

