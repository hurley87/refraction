"use client";

type Event = {
  id: number;
  title: string;
  location: string;
  date: string;
  image: string;
};

export const Event = ({ event }: { event: Event }) => {
  return (
    <div className="flex flex-col gap-3 bg-[#63C3D8]/50 p-4 sm:p-8 rounded-lg max-w-[600px] font-sans h-full">
      <div
        className="w-full aspect-[12/16] relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: `url(${event.image})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="text-4xl font-inktrap">{event.title}</div>
      <div className="text-3xl font-inktrap">{event.location}</div>
      <div className="text-2xl font-grotesk">{event.date}</div>
    </div>
  );
};
