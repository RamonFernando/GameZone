type PaypalEnv = "sandbox" | "live";

type PaypalAmount = {
  currency_code: string;
  value: string;
  breakdown?: {
    item_total: {
      currency_code: string;
      value: string;
    };
  };
};

type PaypalItem = {
  name: string;
  quantity: string;
  unit_amount: {
    currency_code: string;
    value: string;
  };
};

function getPaypalEnv(): PaypalEnv {
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

function getPaypalBaseUrl() {
  return getPaypalEnv() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPaypalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan credenciales PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET.");
  }
  return { clientId, clientSecret };
}

export async function getPaypalAccessToken() {
  const { clientId, clientSecret } = getPaypalCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Error autenticando PayPal: ${payload}`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

export async function createPaypalOrder(input: {
  accessToken: string;
  orderId: string;
  amount: PaypalAmount;
  items: PaypalItem[];
  returnUrl: string;
  cancelUrl: string;
}) {
  const response = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: input.orderId,
          amount: input.amount,
          items: input.items,
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Error creando orden PayPal: ${payload}`);
  }

  return (await response.json()) as {
    id: string;
    links: Array<{ href: string; rel: string; method: string }>;
  };
}

export async function capturePaypalOrder(input: {
  accessToken: string;
  paypalOrderId: string;
}) {
  const response = await fetch(
    `${getPaypalBaseUrl()}/v2/checkout/orders/${input.paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Error capturando orden PayPal: ${payload}`);
  }

  return (await response.json()) as {
    id: string;
    status: string;
    purchase_units?: Array<{
      custom_id?: string;
      payments?: {
        captures?: Array<{ id?: string; status?: string }>;
      };
    }>;
  };
}

export async function verifyPaypalWebhookSignature(input: {
  headers: {
    transmissionId: string;
    transmissionTime: string;
    transmissionSig: string;
    certUrl: string;
    authAlgo: string;
  };
  webhookEvent: unknown;
}) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error("Falta PAYPAL_WEBHOOK_ID.");
  }

  const accessToken = await getPaypalAccessToken();
  const response = await fetch(`${getPaypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: input.headers.authAlgo,
      cert_url: input.headers.certUrl,
      transmission_id: input.headers.transmissionId,
      transmission_sig: input.headers.transmissionSig,
      transmission_time: input.headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: input.webhookEvent,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo verificar webhook PayPal: ${text}`);
  }

  const payload = (await response.json()) as { verification_status?: string };
  return payload.verification_status === "SUCCESS";
}
