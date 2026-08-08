const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function findChrome() {
  const candidates = [
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

(async () => {
  try {
    const chromePath = findChrome();
    if (!chromePath) {
      console.error('Chrome executable not found. Please install Google Chrome or provide its path.');
      process.exit(1);
    }

    const htmlFile = path.resolve(__dirname, '..', 'docs', 'project-notes.html');
    if (!fs.existsSync(htmlFile)) {
      console.error('HTML file not found:', htmlFile);
      process.exit(1);
    }

    const browser = await puppeteer.launch({
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const fileUrl = 'file://' + htmlFile.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    const outPath = path.resolve(__dirname, '..', 'docs', 'project-notes.pdf');
    await page.pdf({ path: outPath, format: 'A4', printBackground: true });
    await browser.close();
    console.log('PDF created at', outPath);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
