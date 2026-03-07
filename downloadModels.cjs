const fs = require('fs');
const https = require('https');
const path = require('path');

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error('Response status was ' + response.statusCode));
            }
            response.pipe(file);
        });

        file.on('finish', () => resolve());
        request.on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
        file.on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
};

const baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
const files = [
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model.weights",
    "age_gender_model-weights_manifest.json",
    "age_gender_model.weights"
];

const modelsDir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

async function run() {
    for (const file of files) {
        console.log(`Downloading ${file}...`);
        await download(`${baseUrl}/${file}`, path.join(modelsDir, file));
    }
    console.log("Done.");
}

run();
