import Image from "next/image";
export const Header = () => {
  return (
    <div className="flex justify-center items-center p-1 bg-gradient-to-b from-[#E3E3E3] to-[#E5E5E5] h-[80px]">
      <Image src="/logo.svg" alt="Refraction" width={294} height={35} />
    </div>
  );
};
