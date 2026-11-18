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
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
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

    const { order_id, paypal_order_id } = await req.json();
    if (!order_id || !paypal_order_id) return json({ error: "Missing order identifiers" }, 400);
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: order, error: orderError } = await db.from("book_orders").select("*").eq("id", order_id).eq("user_id", userData.user.id).single();
    if (orderError || !order || order.preferred_payment_method !== "paypal" || order.paypal_order_id !== paypal_order_id) return json({ error: "Order not found" }, 404);
    if (order.status === "paid" || order.status === "fulfilled") return json({ status: order.status, already_paid: true });
    if (order.status !== "pending_payment" || Number(order.amount) !== 1.7 || order.currency !== "USD") return json({ error: "Order is not payable" }, 409);

    const token = await paypalAccessToken();
    const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${encodeURIComponent(paypal_order_id)}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `capture-${order.id}` },
    });
    const captureData = await response.json();
    if (!response.ok) return json({ error: "PayPal payment could not be captured" }, 402);
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const amount = capture?.amount;
    if (captureData.status !== "COMPLETED" || capture?.status !== "COMPLETED" || amount?.currency_code !== "USD" || amount?.value !== "1.70") {
      return json({ error: "PayPal payment is not confirmed for the expected amount" }, 402);
    }

    const { error: updateError } = await db.from("book_orders").update({
      status: "paid",
      payment_transaction_id: capture.id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", order.id).eq("status", "pending_payment");
    if (updateError) return json({ error: "Payment received but order update failed; contact support" }, 500);
    return json({ status: "paid", capture_id: capture.id, message: "Payment confirmed" });
  } catch (error) {
    console.error("paypal-capture-order:", error);
    return json({ error: "Unable to confirm PayPal payment" }, 500);
  }
});
