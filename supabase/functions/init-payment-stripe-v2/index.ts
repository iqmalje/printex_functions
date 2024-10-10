// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import Stripe from "https://esm.sh/stripe@17.2.0?target=deno";

const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY_v2") ?? "";

const stripe = Stripe(STRIPE_API_KEY, {
  // This is needed to use the Fetch API rather than relying on the Node http
  // package.
  httpClient: Stripe.createFetchHttpClient(),
});

interface RequestPayload {
  transactionid: string;
  amount: number;
  paymentMethod?: string;
}

Deno.serve(async (request: Request) => {
  const requestPayload: RequestPayload = await request.json();
  console.log(requestPayload);
  try {
    // create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: requestPayload.amount,
      currency: "myr",
      payment_method_types: requestPayload.paymentMethod
        ? [requestPayload.paymentMethod]
        : ["fpx"],
      metadata: {
        transactionid: requestPayload.transactionid,
      },
    });

    return new Response(JSON.stringify({ data: paymentIntent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/init-payment-stripe-v2' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
