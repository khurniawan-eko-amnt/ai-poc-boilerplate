Deno.serve(() => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "supabase-edge-functions",
      message: "Edge Functions runtime is available.",
    }),
    {
      headers: {
        "content-type": "application/json",
      },
    },
  );
});