import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function PageSkeleton({
  variant = "default",
}: {
  variant?: "default" | "editor" | "list" | "chat" | "dashboard";
}) {
  if (variant === "editor") {
    return (
      <div className="space-y-4">
        <HeaderSkel />
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-4 xl:col-span-3">
            <div className="space-y-2 p-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </Card>
          <div className="lg:col-span-8 xl:col-span-9">
            <Card className="h-[480px] overflow-hidden">
              <Skeleton className="h-8 w-full rounded-none" />
              <div className="space-y-2 p-4">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-3"
                    style={{ width: `${40 + ((i * 17) % 55)}%` }}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "chat") {
    return (
      <div className="space-y-4">
        <HeaderSkel />
        <Card className="h-[70vh] overflow-hidden">
          <Skeleton className="h-10 w-full rounded-none" />
          <div className="space-y-6 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-4">
        <HeaderSkel />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="space-y-4">
        <HeaderSkel />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-3 h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </Card>
          <Card className="p-4">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeaderSkel />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function HeaderSkel() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-3 w-72" />
    </div>
  );
}
