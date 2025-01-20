import CreateToken from "@/components/create-token";

export async function generateMetadata() {
  return {
    title: "Create Token",
    description: "Create an Event Token",
  };
}

export default async function CreatePage() {
  return <CreateToken />;
}
