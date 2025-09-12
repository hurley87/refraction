export async function GET() {
  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjEwMjU2MjQsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhlRmUwN2QyMGU5YjE1YUNjOTIyNDU3MDYwQjkzREExMDUyRjYwZWEzIn0",
      payload: "eyJkb21haW4iOiJ3d3cuaXJsLmVuZXJneSJ9",
      signature:
        "S+wK5OKcwkI8AJ586E+B1J8fwV3FJllJHc/rb3OYJcMXGysDdLxdEA1YQE9+DIhBQg2C0V6j1DDbJ6r8sc8gYxs=",
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
      webhookUrl: "https://irl.energy/api/webhook",
    },
  };

  return Response.json(config);
}
