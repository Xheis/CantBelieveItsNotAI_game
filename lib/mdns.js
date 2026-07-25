import { getResponder } from "@homebridge/ciao";

export async function publishMdns({ port, name }) {
  try {
    const responder = getResponder();

    const service = responder.createService({
      name,
      type: "http",
      protocol: "tcp",
      port,
      txt: {
        app: "i-cant-believe-its-not-ai",
        join: "/join",
      },
    });

    await service.advertise();

    const url = `http://${name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")}.local:${port}`;

    return {
      url,
      shutdown: async () => {
        try {
          await service.end();
          await responder.shutdown();
        } catch {
          // Ignore shutdown errors.
        }
      },
    };
  } catch (error) {
    console.warn(`mDNS unavailable: ${error.message}`);

    return null;
  }
}