// =============================
// QR-print stub for machine labels
// =============================

export function printMachineQR(machineNumber: string) {
  const win = window.open("", "_blank", "width=400,height=500");
  if (!win) return;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(machineNumber)}`;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>QR: ${machineNumber}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 20px; }
          img { margin-top: 10px; }
        </style>
      </head>
      <body>
        <h2>${machineNumber}</h2>
        <img src="${qrUrl}" alt="QR code" />
        <p style="margin-top: 16px; color: #666;">Наведите камеру для сканирования</p>
      </body>
    </html>
  `);

  win.document.close();
  win.print();
}