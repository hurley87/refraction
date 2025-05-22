import Onboarding from "@/components/onboarding";

export async function generateMetadata() {
  return {
    title: "Onboarding",
    description: "Create your username",
  };
}

export default async function OnboardingPage() {
  return <Onboarding />;
}
