export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
        Provider details
      </h1>
      <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
        Full provider profile with analytics coming in Phase 2b. Provider ID: {id}
      </p>
    </div>
  );
}
