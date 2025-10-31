import { CanteenDashboard } from "./_components/CanteenDashboard";
import { FHECounterDemo } from "./_components/FHECounterDemo";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
      <CanteenDashboard />
      {/* Uncomment below to also show FHECounter demo */}
      {/* <FHECounterDemo /> */}
    </div>
  );
}
