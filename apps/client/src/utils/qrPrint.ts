// =============================
// QR-print utility for machine labels
// Generates a QR code that points to /service/<machineNumber> for quick scanning.
// =============================

export function printMachineQR(machineNumber: string | number) {
  const num = String(machineNumber);
  const win = window.open("", "_blank", "width=400,height=500");
  if (!win) return;

  // QR encodes the full URL to the service form page for this machine.
  // When scanned by a technician, it will open the service form directly.
  const serviceUrl = `${window.location.origin}/machines/${num}/service`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(serviceUrl)}`;

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