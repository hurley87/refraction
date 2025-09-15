export async function GET() {
  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjEzMzU4NDQsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwQ0ExNzU2NkU5QkZmRURBNDc4NkRFQUY2NmU2ODBlMzI3MzkyMTJlIn0",
      payload: "eyJkb21haW4iOiJ3d3cuaXJsLmVuZXJneSJ9",
      signature:
        "MHgwYThiYjY5ZGQ4OTMyYjRkMzg0MjNjNjU4YjAzZjQ0Zjc1MDRjMWE2MmY4NGZiMjI4MDdhMTE3ZmNhNjhlYTIzMGQzZDZkNWNjOTFlMjYwZTk3YTk2YzQ0ZWYwOGU2Yzg3ZjZlMTIyMzhmZmRjMWE3NjY5NTIzNWU4OTI0ZGNiYjFj",
    },
    frame: {
      version: "1",
      name: "IRL",
      iconUrl: "https://irl.energy/logo.png",
      homeUrl: "https://irl.energy",
      imageUrl: "https://irl.energy/logo.png",
      buttonTitle: "Launch IRL",
      splashImageUrl: "https://irl.energy/logo.png",
      splashBackgroundColor: "#ffffff",
      subtitle: "Map Your IRL World",
      description:
        "Check in. Earn points. Unlock perks. IRL makes every event and cultural experience more rewarding.",
      primaryCategory: "social",
      tags: ["IRL", "Points", "Rewards", "Culture", "Events"],
      tagline: "Check In, Own the Map",
      ogTitle: "Check In with IRL",
      ogDescription:
        "In the know, on the map. IRL is how the city checks in—and earns rewards.",
      ogImageUrl: "https://irl.energy/banner.png",
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageType: "image/png",
      castShareUrl: "https://irl.energy",
      webhookUrl: "https://irl.energy/api/webhook",
    },
  };

  return Response.json(config);
}
