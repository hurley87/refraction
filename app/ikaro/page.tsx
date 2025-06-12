import IkaroMint from "@/components/ikaro-mint";

export async function generateMetadata() {
  return {
    title: "Mint Ikaro NFTs",
    description: "Mint Ikaro NFTs",
  };
}

export default async function CreatePage() {
  return <IkaroMint />;
}
