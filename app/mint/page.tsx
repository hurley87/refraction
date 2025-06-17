import { Mint } from "@/components/mint";


export async function generateMetadata() {
  return {
    title: "Mint NFT",
    description: "Mint NFT",
  };
}

export default async function CreatePage() {
  return <Mint />;
}
