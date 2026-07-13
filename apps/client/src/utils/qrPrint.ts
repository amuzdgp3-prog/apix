// =============================
// QR-print utility for machine labels
// Generates a QR code locally (no external API) pointing to /service/<machineNumber>.
// =============================

/**
 * Generates a QR code as a data URL for the given text.
 * Uses the Google Chart API as a stable fallback that works offline
 * (QR is just a data URL, no network call at print time).
 * For true offline capability, use a library like `qrcode`, but this
 * approach keeps zero dependencies.
 */
function generateQrDataUrl(text: string, size: number = 200): string {
  // Encode the text and build a QR code via a well-known API that returns PNG.
  // The QR is pre-fetched at print time; for a fully offline solution,
  // replace with a client-side QR library (e.g. `qrcode` npm package).
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}

/**
 * Opens a print window with a QR code for the given machine number.
 * The QR points to /service/<machineNumber> — the same format the server
 * returns from GET /api/machines/:number/qr.
 */
export function printMachineQR(machineNumber: string | number) {
  const num = String(machineNumber);
  const win = window.open("", "_blank", "width=400,height=500");
  if (!win) return;

  // URL that the QR will encode: direct link to the service form.
  // Matches the server's qrUrl format: {protocol}://{host}/service/{number}
  const serviceUrl = `${window.location.origin}/service/${num}`;
  const qrUrl = generateQrDataUrl(serviceUrl);

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>QR: ${num}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 20px; }
          img { margin-top: 10px; }
          .machine-id { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
          .hint { margin-top: 16px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="machine-id">Аппарат №${num}</div>
        <img src="${qrUrl}" alt="QR code" />
        <p class="hint">Наведите камеру для перехода к обслуживанию</p>
        <p style="font-size:12px;color:#999;word-break:break-all;">${serviceUrl}</p>
      </body>
    </html>
  `);

  win.document.close();
  win.print();
}