import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

async function paypalAccessToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials are not configured");
  const credentials = btoa(`${id}:${secret}`);
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Unable to authenticate with PayPal");
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Authentication required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const body = await req.json();
    const { book, customer, format } = body ?? {};
    if (!book?.id || !book?.title || !customer?.name || !customer?.email || !customer?.phone || !customer?.country || !["PDF", "EPUB"].includes(format)) {
      return json({ error: "Missing or invalid order information" }, 400);
    }

    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: order, error: insertError } = await db.from("book_orders").insert({
      user_id: userData.user.id,
      book_id: book.id,
      book_title: String(book.title).slice(0, 500),
      book_authors: Array.isArray(book.authors) ? book.authors.map((x: unknown) => String(x).slice(0, 160)).slice(0, 20) : [],
      book_publisher: book.publisher ? String(book.publisher).slice(0, 200) : null,
      book_isbn: book.isbn ? String(book.isbn).slice(0, 80) : null,
      book_category: book.category ? String(book.category).slice(0, 120) : null,
      book_cover_url: book.cover_url ? String(book.cover_url).slice(0, 2000) : null,
      customer_name: String(customer.name).slice(0, 160),
      customer_email: String(customer.email).slice(0, 200),
      customer_phone: String(customer.phone).slice(0, 40),
      customer_country: String(customer.country).slice(0, 100),
      preferred_payment_method: "paypal",
      book_format: format,
      amount: 1.70,
      currency: "USD",
      status: "pending_payment",
    }).select("id").single();
    if (insertError || !order) return json({ error: "Unable to create order" }, 400);

    const token = await paypalAccessToken();
    const origin = req.headers.get("origin") || "https://rawagobergerlebonheur.com";
    const paypalResponse = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": order.id },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ reference_id: order.id, custom_id: order.id, description: `RAWAGO - ${String(book.title).slice(0, 120)} (${format})`, amount: { currency_code: "USD", value: "1.70" } }],
        payment_source: { paypal: { experience_context: { return_url: `${origin}/commande-livre?paypal=return&order=${order.id}`, cancel_url: `${origin}/commande-livre?paypal=cancel&order=${order.id}`, user_action: "PAY_NOW" } } },
      }),
    });
    const paypalOrder = await paypalResponse.json();
    if (!paypalResponse.ok || !paypalOrder.id) {
      await db.from("book_orders").update({ status: "cancelled", admin_note: "PayPal order creation failed" }).eq("id", order.id);
      return json({ error: "PayPal could not create the payment" }, 502);
    }
    await db.from("book_orders").update({ paypal_order_id: paypalOrder.id }).eq("id", order.id);
    const approve = paypalOrder.links?.find((link: { rel: string; href: string }) => link.rel === "payer-action" || link.rel === "approve");
    if (!approve?.href) return json({ error: "PayPal approval link unavailable" }, 502);
    return json({ order_id: order.id, paypal_order_id: paypalOrder.id, approval_url: approve.href });
  } catch (error) {
    console.error("paypal-create-order:", error);
    return json({ error: "Unable to start PayPal payment" }, 500);
  }
});
