import { ConnectButton } from "../connect-button";

export const Header = () => {
  return (
    <div className="flex justify-between items-center p-1 bg-gradient-to-b from-[#E3E3E3] to-[#E5E5E5]">
      <h1 className="text-2xl uppercase">Refraction</h1>
      <ConnectButton />
    </div>
  );
};
