import fs from 'fs';
import https from 'https';
import path from 'path';

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle redirects
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                 reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                 return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
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

if (!fs.existsSync(modelsDir)){
    fs.mkdirSync(modelsDir, { recursive: true });
}

console.log("Downloading face-api.js models...");

Promise.all(files.map(file => {
    console.log(`Downloading ${file}...`);
    return downloadFile(`${baseUrl}/${file}`, path.join(modelsDir, file));
})).then(() => {
    console.log("All models downloaded successfully.");
}).catch(err => {
    console.error("Error downloading models:", err);
});
