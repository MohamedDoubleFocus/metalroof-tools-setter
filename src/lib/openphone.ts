/**
 * OpenPhone (Quo) SMS API client.
 *
 * Docs: https://www.quo.com/docs/mdx/api-reference/messages/send-a-text-message
 *
 * Auth: Authorization header = API key directly (no "Bearer" prefix).
 * Endpoint: POST https://api.openphone.com/v1/messages
 * Body: { content, from (E.164 or PN... id), to: [E.164] }
 * Success: 202 Accepted
 */

interface SendSmsParams {
  to: string; // E.164
  content: string;
}

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms({ to, content }: SendSmsParams): Promise<SendSmsResult> {
  const apiKey = process.env.OPENPHONE_API_KEY;
  const fromNumber = process.env.OPENPHONE_FROM_NUMBER;

  if (!apiKey) {
    return {
      success: false,
      error: "OPENPHONE_API_KEY non configure dans les variables d'environnement",
    };
  }

  if (!fromNumber) {
    return {
      success: false,
      error: "OPENPHONE_FROM_NUMBER non configure dans les variables d'environnement",
    };
  }

  try {
    const res = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        from: fromNumber,
        to: [to],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        success: false,
        error: `OpenPhone API ${res.status}: ${text.slice(0, 300)}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      messageId: data?.data?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur reseau OpenPhone",
    };
  }
}
