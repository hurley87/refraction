import InteractiveMap from "@/components/interactive-map";
import Auth from "@/components/auth";

export default function InteractiveMapPage() {
  return (
    <Auth>
      <InteractiveMap />
    </Auth>
  );
}
