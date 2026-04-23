import Link from 'next/link';

export default function CityGuideNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F5F5F5] px-4 font-grotesk">
      <h1 className="title2 text-[#171717]">Guide not found</h1>
      <p className="body-medium text-center text-[#757575]">
        This city guide may be unpublished or the link is incorrect.
      </p>
      <Link
        href="/city-guide"
        className="label-large bg-[#171717] px-4 py-2 text-white"
      >
        Back to guides
      </Link>
    </div>
  );
}
