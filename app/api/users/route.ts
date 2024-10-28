// import { NextResponse } from "next/server";
// import { PrivyClient } from "@privy-io/server-auth";

// const privy = new PrivyClient(
//   process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
//   process.env.PRIVY_APP_SECRET!
// );

// export async function GET() {
//   const privyUsers = await privy.getUsers();

//   // Create CSV content
//   const csvContent = [
//     "Created At,Email,Address",
//     ...privyUsers.map(
//       (user) =>
//         `${user.createdAt},${user?.email?.address || ""},${
//           user?.wallet?.address || ""
//         }`
//     ),
//   ].join("\n");

//   // Create and return the response with CSV file
//   return new NextResponse(csvContent, {
//     status: 200,
//     headers: {
//       "Content-Type": "text/csv",
//       "Content-Disposition": "attachment; filename=users.csv",
//     },
//   });
// }
