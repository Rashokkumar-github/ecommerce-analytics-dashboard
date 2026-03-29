import { Suspense } from "react";
import DashboardContent from "./DashboardContent";

export default function Page() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
