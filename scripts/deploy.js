// deploy.js

const { exec } = require('child_process');
require('dotenv').config();

const railwayDeploy = () => {
    console.log('Deploying to Railway...');
    exec('railway up', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error deploying to Railway: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Railway stderr: ${stderr}`);
            return;
        }
        console.log(`Railway output: ${stdout}`);
    });
};

const vercelDeploy = () => {
    console.log('Deploying to Vercel...');
    exec('vercel --prod', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error deploying to Vercel: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Vercel stderr: ${stderr}`);
            return;
        }
        console.log(`Vercel output: ${stdout}`);
    });
};

const main = () => {
    railwayDeploy();
    vercelDeploy();
};

main();
