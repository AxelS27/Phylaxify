const baseUrl = () =>
  (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin;

export const saweriaWebhookUrl = (token: string) =>
  `${baseUrl()}/api/webhook/saweria/${token}`;

export const trakteerWebhookUrl = (token: string) =>
  `${baseUrl()}/api/webhook/trakteer/${token}`;

export const overlayUrl = (token: string) => `${baseUrl()}/overlay?token=${token}`;
