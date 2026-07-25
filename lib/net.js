import os from "node:os";

export function getLanIps() {
  const ips = [];

  const interfaces = os.networkInterfaces();

  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }

  return ips;
}

export function getPrimaryIp() {
  return getLanIps()[0] ?? "localhost";
}

export function buildJoinUrl({ port, publicUrl, ip }) {
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "");
  }

  return `http://${ip}:${port}/join`;
}