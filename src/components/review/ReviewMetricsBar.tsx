import { Badge } from "@/components/ui/badge";
import type { ReviewMetrics } from "@/lib/types";

type ReviewMetricsBarProps = {
  metrics: ReviewMetrics;
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ReviewMetricsBar({ metrics }: ReviewMetricsBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary" title="Model-estimated overall accuracy">
        Accuracy {pct(metrics.overallAccuracy)}
      </Badge>
      <Badge variant="outline">Supported {pct(metrics.supportedRate)}</Badge>
      <Badge
        variant={metrics.hallucinationRate > 0.15 ? "destructive" : "outline"}
      >
        Hallucinations {pct(metrics.hallucinationRate)}
      </Badge>
      <Badge variant="outline">Citations {pct(metrics.citationAccuracy)}</Badge>
      <Badge variant="outline" title="Average confidence reported by the generator model">
        Gen conf {pct(metrics.avgGeneratorConfidence)}
      </Badge>
      <Badge variant="outline" title="Average confidence reported by the verifier model">
        Verifier conf {pct(metrics.avgVerifierConfidence)}
      </Badge>
      <span className="text-xs text-muted-foreground self-center">
        {metrics.findingCount} finding{metrics.findingCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
