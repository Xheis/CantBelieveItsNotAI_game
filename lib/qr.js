import QRCode from "qrcode";

export async function makeQrDataUrl(url) {
  return QRCode.toDataURL(url, {
    width: 640,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#05070d",
      light: "#ffffff",
    },
  });
}