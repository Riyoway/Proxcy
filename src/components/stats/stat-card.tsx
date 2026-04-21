import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, description, children, className }) => {
  return (
    <Card className={cn("bg-card/70 border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
