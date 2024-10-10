// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Stripe } from "https://esm.sh/stripe@11.18.0";

const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY_v2") ?? "";
const STRIPE_WEBHOOK_SIGNING_SECRET =
  Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET_v2") ?? "";

const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: "2022-11-15" });
const supabase = createClient(
  Deno.env.get("FN_SUPABASE_URL_v2") ?? "",
  Deno.env.get("FN_SUPABASE_SECRET_KEY_v2") ?? ""
);

interface Metadata {
  transactionid: string;
}

Deno.serve(async (request) => {
  const signature = request.headers.get("Stripe-Signature");

  const body = await request.text();

  let receivedEvent;
  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature ?? "none",
      STRIPE_WEBHOOK_SIGNING_SECRET,
      undefined
    );
    const metadata: Metadata = receivedEvent.data.object.metadata;
    if (receivedEvent.type === "payment_intent.succeeded") {
      console.log("payment successfully received");

      console.log(
        `updating transaction with id ${metadata.transactionid} to successful`
      );

      await supabase.rpc("update_amount_transactions", {
        trid: metadata.transactionid,
      });
      console.log(
        `updated transaction with id ${metadata.transactionid} to successful`
      );
    } else if (receivedEvent.type === "payment_intent.payment_failed") {
      console.log("payment failed");

      console.log(
        `updating transaction with id ${metadata.transactionid} to failed`
      );

      await supabase.rpc("update_status_failed", {
        trid: metadata.transactionid,
      });
      console.log(
        `updated transaction with id ${metadata.transactionid} to failed`
      );
    }
    return new Response(JSON.stringify(receivedEvent), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(error.message, {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-webhook-v2' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
